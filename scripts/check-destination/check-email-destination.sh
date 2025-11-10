#!/bin/bash

# Script to check if shiftbook-email destination exists in BTP
# This script uses the check-destinations.js utility

echo "=============================================="
echo "   Checking Destination: shiftbook-email"
echo "=============================================="
echo ""

# Check if we're logged into CF
echo "1. Verifying CF login status..."
if ! cf target &> /dev/null; then
    echo "❌ Not logged into Cloud Foundry"
    echo ""
    echo "Please login first:"
    echo "  cf login -a https://api.cf.us10-001.hana.ondemand.com --sso"
    exit 1
fi

echo "✅ Logged into Cloud Foundry"
cf target
echo ""

# Check if check-destinations.js exists
if [ ! -f "check-destinations.js" ]; then
    echo "❌ check-destinations.js not found"
    echo ""
    echo "This script requires check-destinations.js to run"
    exit 1
fi

echo "2. Checking BTP Destination service binding..."

# Check if destination service exists and is bound
DEST_SERVICE=$(cf services | grep -i "shiftbook-destination\|destination" | head -1)

if [ -z "$DEST_SERVICE" ]; then
    echo "❌ No destination service found"
    echo ""
    echo "The application needs a destination service instance."
    echo "It should be created automatically during MTA deployment."
    exit 1
fi

echo "✅ Destination service found:"
echo "$DEST_SERVICE"
echo ""

# Check for the specific destination
echo "3. Looking for destination 'shiftbook-email'..."
echo ""

# Run the check-destinations.js script
if node check-destinations.js 2>&1 | grep -q "shiftbook-email"; then
    echo "✅ Destination 'shiftbook-email' exists!"
    echo ""
    echo "Full destination details:"
    node check-destinations.js | grep -A 20 "shiftbook-email" || echo "Could not retrieve full details"
else
    echo "❌ Destination 'shiftbook-email' NOT FOUND"
    echo ""
    echo "Available destinations:"
    node check-destinations.js 2>&1 || echo "Could not list destinations"
    echo ""
    echo "-------------------------------------------"
    echo "TO CREATE THE DESTINATION:"
    echo "-------------------------------------------"
    echo ""
    echo "1. Go to BTP Cockpit: https://cockpit.us10.hana.ondemand.com/"
    echo "2. Navigate to: manu-dev-org → Connectivity → Destinations"
    echo "3. Click 'New Destination'"
    echo "4. Configure with name: shiftbook-email"
    echo ""
    echo "See __docs/EMAIL_DESTINATION_SETUP.md for detailed configuration instructions"
fi

echo ""
echo "=============================================="
