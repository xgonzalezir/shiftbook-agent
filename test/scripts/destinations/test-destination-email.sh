#!/bin/bash

# Destination Service Test Script
# Testing shiftbook-email destination configuration

echo "🔍 Testing Destination Service Configuration"
echo "============================================="

# Destination service credentials
CLIENT_ID="sb-clone2f7bf16fd3fb44869f2d9e81c54b5bad!b518539|destination-xsappname!b62"
CLIENT_SECRET="064e7058-4a27-4d4e-8ea4-4d3821b46139\$_5Is7w_YjW_LLbKUUZXgAgImylhoJVUyypv-HtO1XU8="
AUTH_URL="https://gbi-manu-qa.authentication.us10.hana.ondemand.com/oauth/token"
DEST_URL="https://destination-configuration.cfapps.us10.hana.ondemand.com"

echo "📋 Step 1: Getting OAuth token..."

# Get OAuth token (properly escaped)
TOKEN_RESPONSE=$(curl -s -X POST "$AUTH_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=client_credentials" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "client_secret=$CLIENT_SECRET")

if command -v jq &> /dev/null; then
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
    echo "✅ Token obtained successfully"
else
    echo "⚠️  jq not available, using grep/cut"
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
fi

echo "📋 Step 2: Listing all destinations..."

# List all destinations
DESTINATIONS=$(curl -s -X GET "$DEST_URL/destination-configuration/v1/destinations" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "📋 Destinations found:"
if command -v jq &> /dev/null; then
    echo "$DESTINATIONS" | jq -r '.[] | "- \(.Name) (\(.Type))"'
else
    echo "$DESTINATIONS"
fi

echo ""
echo "📋 Step 3: Looking for shiftbook-email destination..."

# Check for shiftbook-email specifically
EMAIL_DEST=$(curl -s -X GET "$DEST_URL/destination-configuration/v1/destinations/shiftbook-email" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "📧 shiftbook-email destination details:"
if command -v jq &> /dev/null; then
    echo "$EMAIL_DEST" | jq .
else
    echo "$EMAIL_DEST"
fi

echo ""
echo "🔍 Testing completed!"