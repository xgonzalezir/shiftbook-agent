#!/bin/bash

# Script to test OAuth2 token exchange manually
# This helps diagnose XSUAA token exchange issues

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}OAuth2 Token Exchange Test${NC}"
echo -e "${BLUE}========================================${NC}"

# Get XSUAA credentials from service key
echo -e "\n${YELLOW}Getting XSUAA credentials...${NC}"
XSUAA_JSON=$(cf service-key shiftbook-auth cross-subaccount-key | tail -n +3)

CLIENT_ID=$(echo "$XSUAA_JSON" | jq -r '.credentials.clientid')
CLIENT_SECRET=$(echo "$XSUAA_JSON" | jq -r '.credentials.clientsecret')
TOKEN_URL=$(echo "$XSUAA_JSON" | jq -r '.credentials.url')

echo -e "${GREEN}✓${NC} Client ID: $CLIENT_ID"
echo -e "${GREEN}✓${NC} Token URL: $TOKEN_URL/oauth/token"

# DMC Frontend Token (from user)
DMC_TOKEN="$1"

if [ -z "$DMC_TOKEN" ]; then
    echo -e "\n${RED}❌ Error: No DMC token provided${NC}"
    echo -e "${YELLOW}Usage: $0 <DMC_JWT_TOKEN>${NC}"
    echo -e "\nExample:"
    echo -e "  $0 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'"
    exit 1
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Testing Token Exchange${NC}"
echo -e "${BLUE}========================================${NC}"

# Perform token exchange
echo -e "\n${YELLOW}Sending token exchange request...${NC}"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$TOKEN_URL/oauth/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
    -d "assertion=$DMC_TOKEN" \
    -d "client_id=$CLIENT_ID" \
    -d "client_secret=$CLIENT_SECRET")

# Split response and status
HTTP_BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS\:.*//g')
HTTP_STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

echo -e "\n${BLUE}Response Status: $HTTP_STATUS${NC}"

if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ Token Exchange SUCCESSFUL!${NC}"
    echo -e "\n${YELLOW}Response:${NC}"
    echo "$HTTP_BODY" | jq '.'

    # Extract and decode the new token
    NEW_TOKEN=$(echo "$HTTP_BODY" | jq -r '.access_token')
    if [ "$NEW_TOKEN" != "null" ] && [ -n "$NEW_TOKEN" ]; then
        echo -e "\n${BLUE}========================================${NC}"
        echo -e "${BLUE}Decoded Backend Token${NC}"
        echo -e "${BLUE}========================================${NC}"

        # Decode the payload
        PAYLOAD=$(echo "$NEW_TOKEN" | cut -d '.' -f 2 | base64 -d 2>/dev/null | jq '.')
        echo "$PAYLOAD"

        echo -e "\n${GREEN}✅ Token exchange working correctly!${NC}"
    fi
else
    echo -e "${RED}❌ Token Exchange FAILED!${NC}"
    echo -e "\n${YELLOW}Error Response:${NC}"
    echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"

    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}Diagnosis${NC}"
    echo -e "${BLUE}========================================${NC}"

    if echo "$HTTP_BODY" | grep -qi "unknown signing key"; then
        echo -e "${RED}❌ Issue: Unknown Signing Key${NC}"
        echo -e "\nThe backend XSUAA doesn't trust the frontend XSUAA's signing key."
        echo -e "\n${YELLOW}Possible causes:${NC}"
        echo -e "  1. granted-apps not configured correctly"
        echo -e "  2. XSUAA service needs to be updated"
        echo -e "  3. XSUAA trust relationship not established"
        echo -e "\n${YELLOW}Current xs-security.json has:${NC}"
        echo -e "  - \$XSAPPNAME(application, shiftbook-plugin)"
        echo -e "  - \$XSAPPNAME(application, sb-execution-dmc-sap-quality)"
        echo -e "  - \$XSAPPNAME(application, dmc-quality)"
        echo -e "  - \$XSAPPNAME(application, dmc-services-quality)"
    elif echo "$HTTP_BODY" | grep -qi "unauthorized"; then
        echo -e "${RED}❌ Issue: Unauthorized Client${NC}"
        echo -e "\nThe frontend xsappname is not in granted-apps."
    else
        echo -e "${RED}❌ Unknown Error${NC}"
        echo -e "\nPlease check the error message above."
    fi
fi

echo -e "\n${BLUE}========================================${NC}"
