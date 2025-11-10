#!/bin/bash

# Script to find the DMC application xsappname
# This is needed to configure granted-apps in xs-security.json

echo "=================================================="
echo "Finding DMC Application xsappname"
echo "=================================================="
echo ""

# Check if CF CLI is available
if ! command -v cf &> /dev/null; then
    echo "❌ CF CLI not found. Please install it first."
    exit 1
fi

# Get current target
echo "📍 Current CF Target:"
cf target
echo ""

# Prompt for DMC space info if not already targeted
echo "Please ensure you're targeted to the DMC space (syntax-dmc-demo):"
read -p "Organization name: " ORG
read -p "Space name (e.g., dmc-quality): " SPACE

echo ""
echo "🎯 Targeting DMC space..."
cf target -o "$ORG" -s "$SPACE"

if [ $? -ne 0 ]; then
    echo "❌ Failed to target space. Please check org/space names."
    exit 1
fi

echo ""
echo "📱 Available applications in this space:"
cf apps
echo ""

read -p "Enter the DMC application name: " DMC_APP

if [ -z "$DMC_APP" ]; then
    echo "❌ No application name provided"
    exit 1
fi

echo ""
echo "🔍 Fetching XSUAA information for: $DMC_APP"
echo ""

# Get the app environment and extract XSUAA xsappname
XSAPPNAME=$(cf env "$DMC_APP" | grep -A 20 '"xsuaa"' | grep '"xsappname"' | head -1 | sed 's/.*"xsappname": "\([^"]*\)".*/\1/')

if [ -z "$XSAPPNAME" ]; then
    echo "⚠️  Could not find xsappname automatically"
    echo ""
    echo "📋 Full XSUAA credentials (check manually):"
    cf env "$DMC_APP" | grep -A 30 '"xsuaa"'
    echo ""
    echo "💡 Look for the 'xsappname' field in the output above"
else
    echo "✅ Found DMC application xsappname:"
    echo ""
    echo "   $XSAPPNAME"
    echo ""
    echo "=================================================="
    echo "Next Steps:"
    echo "=================================================="
    echo ""
    echo "1. Update your backend xs-security.json with this xsappname:"
    echo ""
    echo "   \"scopes\": ["
    echo "     {"
    echo "       \"name\": \"\$XSAPPNAME.operator\","
    echo "       \"granted-apps\": ["
    echo "         \"\$XSAPPNAME(application, $XSAPPNAME)\""
    echo "       ]"
    echo "     },"
    echo "     {"
    echo "       \"name\": \"\$XSAPPNAME.admin\","
    echo "       \"granted-apps\": ["
    echo "         \"\$XSAPPNAME(application, $XSAPPNAME)\""
    echo "       ]"
    echo "     }"
    echo "   ]"
    echo ""
    echo "2. Update the backend XSUAA service:"
    echo "   cf target -s manu-dev"
    echo "   cf update-service shiftbook-auth -c xs-security.json"
    echo ""
    echo "3. Restart the backend application:"
    echo "   cf restart shiftbook-srv"
fi

echo ""
echo "=================================================="
echo "Additional Information:"
echo "=================================================="
echo ""

# Try to get the client ID as well
CLIENTID=$(cf env "$DMC_APP" | grep -A 20 '"xsuaa"' | grep '"clientid"' | head -1 | sed 's/.*"clientid": "\([^"]*\)".*/\1/')
if [ -n "$CLIENTID" ]; then
    echo "DMC XSUAA Client ID: $CLIENTID"
fi

# Get the authentication domain
AUTH_DOMAIN=$(cf env "$DMC_APP" | grep -A 20 '"xsuaa"' | grep '"url"' | head -1 | sed 's/.*"url": "\([^"]*\)".*/\1/')
if [ -n "$AUTH_DOMAIN" ]; then
    echo "DMC Auth Domain: $AUTH_DOMAIN"
fi

echo ""
echo "✅ Done!"
