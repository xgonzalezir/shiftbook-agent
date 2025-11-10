#!/bin/bash

# Cross-Subaccount Integration Setup - Next Steps
# Run these commands in order

echo "=================================================="
echo "Step 1: Update Backend XSUAA Service"
echo "=================================================="
echo ""

# Ensure we're in the backend space
echo "Targeting backend space..."
cf target -o manu-dev-org -s dev

echo ""
echo "Updating XSUAA service with new xs-security.json..."
cf update-service shiftbook-auth -c xs-security.json

echo ""
echo "⏳ Waiting for service update (this may take a minute)..."
sleep 5

echo ""
echo "Checking service status..."
cf service shiftbook-auth

echo ""
read -p "Press Enter when status shows 'update succeeded' (or Ctrl+C to stop and check manually)..."

echo ""
echo "=================================================="
echo "Step 2: Restart Backend Application"
echo "=================================================="
echo ""

echo "Restarting backend application to apply changes..."
cf restart shiftbook-srv

echo ""
echo "✅ Backend application restarted!"

echo ""
echo "=================================================="
echo "Step 3: Get Backend XSUAA Credentials"
echo "=================================================="
echo ""

echo "Getting XSUAA credentials for destination configuration..."
echo ""

# Check if service key exists
if cf service-key shiftbook-auth cross-subaccount-key &>/dev/null; then
    echo "📋 Service key 'cross-subaccount-key' already exists"
else
    echo "Creating service key..."
    cf create-service-key shiftbook-auth cross-subaccount-key
    sleep 2
fi

echo ""
echo "📋 Backend XSUAA Credentials:"
echo "=================================================="
cf service-key shiftbook-auth cross-subaccount-key

echo ""
echo "⚠️  IMPORTANT: Note these values for destination configuration:"
echo "   - clientid"
echo "   - clientsecret"
echo "   - url"
echo ""
read -p "Press Enter when you've noted the credentials..."

echo ""
echo "=================================================="
echo "Step 4: Get Backend Application URL"
echo "=================================================="
echo ""

cf app shiftbook-srv | grep routes

echo ""
echo "⚠️  IMPORTANT: Note the backend URL above"
echo ""
read -p "Press Enter to continue..."

echo ""
echo "=================================================="
echo "Step 5: Create Destination (BTP Cockpit)"
echo "=================================================="
echo ""

echo "You need to create a destination in BTP Cockpit:"
echo ""
echo "1. Log in to BTP Cockpit"
echo "2. Navigate to syntax-dmc-demo subaccount"
echo "3. Go to: Connectivity > Destinations"
echo "4. Click: New Destination"
echo ""
echo "Configuration:"
echo "   Name: shiftbook-backend"
echo "   Type: HTTP"
echo "   URL: <backend-url-from-step-4>"
echo "   Proxy Type: Internet"
echo "   Authentication: OAuth2UserTokenExchange"
echo ""
echo "OAuth2 Configuration:"
echo "   Token Service URL Type: Dedicated"
echo "   Token Service URL: <url-from-step-3>/oauth/token"
echo "   Client ID: <clientid-from-step-3>"
echo "   Client Secret: <clientsecret-from-step-3>"
echo ""
echo "Additional Properties (click 'New Property'):"
echo "   HTML5.DynamicDestination = true"
echo "   WebIDEEnabled = true"
echo "   WebIDEUsage = odata_gen"
echo ""
read -p "Press Enter when destination is created..."

echo ""
echo "=================================================="
echo "✅ SETUP COMPLETE!"
echo "=================================================="
echo ""
echo "Next: Test your endpoint"
echo ""
echo "Your URL should now work:"
echo "https://syntax-dmc-demo.execution.eu20-quality.web.dmc.cloud.sap/destination/shiftbook-backend/shiftbookService/getShiftbookLogPaginated"
echo ""
echo "You should get JSON response (not HTML redirect)"
echo ""
echo "If you still get issues, see:"
echo "  - __docs/CHANGES_NEEDED.md"
echo "  - __docs/CROSS_SUBACCOUNT_CHECKLIST.md"
echo ""
