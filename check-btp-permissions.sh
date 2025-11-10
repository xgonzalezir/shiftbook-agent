#!/bin/bash

# BTP Permissions Verification Script
# This script checks your current Cloud Foundry permissions and BTP access

echo "=============================================="
echo "   BTP Permissions Verification"
echo "   ShiftBook Application Deployment"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if CF CLI is installed
echo "1. Checking Cloud Foundry CLI installation..."
if command -v cf &> /dev/null; then
    CF_VERSION=$(cf --version)
    echo -e "${GREEN}✓${NC} CF CLI installed: $CF_VERSION"
else
    echo -e "${RED}✗${NC} CF CLI not installed"
    echo "   Install from: https://docs.cloudfoundry.org/cf-cli/install-go-cli.html"
    exit 1
fi

echo ""
echo "2. Checking CF login status..."
if cf target &> /dev/null; then
    echo -e "${GREEN}✓${NC} Logged into Cloud Foundry"
    cf target
else
    echo -e "${RED}✗${NC} Not logged into Cloud Foundry"
    echo "   Run: cf login -a https://api.cf.us10-001.hana.ondemand.com"
    exit 1
fi

echo ""
echo "3. Checking your user information..."
CF_USER=$(cf target | grep user | awk '{print $2}')
CF_ORG=$(cf target | grep org | awk '{print $2}')
CF_SPACE=$(cf target | grep space | awk '{print $2}')

if [ ! -z "$CF_USER" ]; then
    echo -e "${GREEN}✓${NC} User: $CF_USER"
    echo "   Organization: $CF_ORG"
    echo "   Space: $CF_SPACE"
else
    echo -e "${RED}✗${NC} Unable to determine user information"
fi

echo ""
echo "4. Checking your roles in current space..."
if [ ! -z "$CF_ORG" ] && [ ! -z "$CF_SPACE" ]; then
    ROLES=$(cf space-users "$CF_ORG" "$CF_SPACE" 2>&1)
    
    if echo "$ROLES" | grep -q "SPACE DEVELOPER"; then
        if echo "$ROLES" | grep -A 10 "SPACE DEVELOPER" | grep -q "$CF_USER"; then
            echo -e "${GREEN}✓${NC} You have SPACE DEVELOPER role ✓"
        else
            echo -e "${YELLOW}⚠${NC}  Space Developer role not confirmed for your user"
        fi
    fi
    
    echo ""
    echo "Full role assignments:"
    echo "$ROLES"
else
    echo -e "${RED}✗${NC} Unable to check roles"
fi

echo ""
echo "5. Checking access to services..."
if cf services &> /dev/null; then
    echo -e "${GREEN}✓${NC} Can access services"
    echo ""
    echo "Existing services in space:"
    cf services | grep -E "shiftbook|name"
else
    echo -e "${RED}✗${NC} Cannot access services (permission denied)"
fi

echo ""
echo "6. Checking access to applications..."
if cf apps &> /dev/null; then
    echo -e "${GREEN}✓${NC} Can access applications"
    echo ""
    echo "Existing applications in space:"
    cf apps | grep -E "shiftbook|name"
else
    echo -e "${RED}✗${NC} Cannot access applications (permission denied)"
fi

echo ""
echo "7. Checking service marketplace access..."
if cf marketplace &> /dev/null; then
    echo -e "${GREEN}✓${NC} Can access marketplace"
    echo ""
    echo "Required services available:"
    cf marketplace | grep -E "xsuaa|destination|postgresql|hana" | head -5
else
    echo -e "${RED}✗${NC} Cannot access marketplace (permission denied)"
fi

echo ""
echo "8. Checking MBT (MTA Build Tool) installation..."
if command -v mbt &> /dev/null; then
    MBT_VERSION=$(mbt --version 2>&1)
    echo -e "${GREEN}✓${NC} MBT installed: $MBT_VERSION"
else
    echo -e "${YELLOW}⚠${NC}  MBT not installed (needed for building MTAR)"
    echo "   Install from: https://sap.github.io/cloud-mta-build-tool/"
fi

echo ""
echo "=============================================="
echo "   Permission Check Summary"
echo "=============================================="
echo ""

# Summary checks
HAS_CF_CLI=$(command -v cf &> /dev/null && echo "yes" || echo "no")
IS_LOGGED_IN=$(cf target &> /dev/null && echo "yes" || echo "no")
CAN_ACCESS_SERVICES=$(cf services &> /dev/null && echo "yes" || echo "no")
CAN_ACCESS_APPS=$(cf apps &> /dev/null && echo "yes" || echo "no")

if [ "$HAS_CF_CLI" = "yes" ] && [ "$IS_LOGGED_IN" = "yes" ] && [ "$CAN_ACCESS_SERVICES" = "yes" ] && [ "$CAN_ACCESS_APPS" = "yes" ]; then
    echo -e "${GREEN}✓ You have the necessary permissions to deploy!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Build MTAR: cd $(pwd) && mbt build -t mta_archives"
    echo "  2. Deploy: cf deploy mta_archives/shiftbook_1.0.0.mtar"
else
    echo -e "${RED}✗ You are missing required permissions${NC}"
    echo ""
    echo "Required permissions:"
    echo "  - Space Developer role in CF space '$CF_SPACE'"
    echo "  - Access to BTP subaccount '$CF_ORG'"
    echo ""
    echo "Contact your BTP Administrator to request these permissions."
fi

echo ""
echo "=============================================="
