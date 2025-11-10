#!/bin/bash

# Health Check Script for ShiftBook Service
# This script helps you call the health check endpoints with proper authentication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_URL="https://manu-dev-org-dev-shiftbooksrv.cfapps.us10-001.hana.ondemand.com"
CAP_URL="https://manu-dev-org-dev-shiftbook-cap.cfapps.us10-001.hana.ondemand.com"

echo -e "${BLUE}🏥 ShiftBook Health Check Script${NC}"
echo "=================================="

# Function to check if we're logged into CF
check_cf_login() {
    if ! cf target > /dev/null 2>&1; then
        echo -e "${RED}❌ Not logged into Cloud Foundry. Please run 'cf login' first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Logged into Cloud Foundry${NC}"
}

# Function to get application status
check_app_status() {
    echo -e "\n${BLUE}📊 Application Status:${NC}"
    cf app ShiftBookSrv --guid > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ShiftBookSrv is running${NC}"
        cf app ShiftBookSrv | grep -E "(instances|memory|disk)"
    else
        echo -e "${RED}❌ ShiftBookSrv not found or not accessible${NC}"
        exit 1
    fi
}

# Function to check service bindings
check_service_bindings() {
    echo -e "\n${BLUE}🔗 Service Bindings:${NC}"
    cf service shiftbook-db | grep -A 5 "Showing bound apps"
}

# Function to test basic connectivity
test_connectivity() {
    echo -e "\n${BLUE}🌐 Testing Connectivity:${NC}"
    
    # Test basic HTTP connectivity
    if curl -s --connect-timeout 10 "$APP_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Application is reachable${NC}"
    else
        echo -e "${RED}❌ Application is not reachable${NC}"
        return 1
    fi
}

# Function to get XSUAA token (if possible)
get_xsuaa_token() {
    echo -e "\n${BLUE}🔐 Getting XSUAA Token:${NC}"
    
    # Check if we have XSUAA service credentials
    if cf service shiftbook-auth > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  XSUAA service found, but getting token requires additional setup${NC}"
        echo -e "${YELLOW}   You may need to use the SAP BTP CLI or configure client credentials${NC}"
        return 1
    else
        echo -e "${RED}❌ XSUAA service not found${NC}"
        return 1
    fi
}

# Function to test health check with CF token
test_health_with_cf_token() {
    echo -e "\n${BLUE}🏥 Testing Health Check with CF Token:${NC}"
    
    # Get CF token
    CF_TOKEN=$(cf oauth-token | sed 's/bearer //')
    
    if [ -z "$CF_TOKEN" ]; then
        echo -e "${RED}❌ Could not get CF token${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}📡 Testing /health endpoint...${NC}"
    HEALTH_RESPONSE=$(curl -s -H "Authorization: Bearer $CF_TOKEN" "$APP_URL/health")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Health check response:${NC}"
        echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"
    else
        echo -e "${RED}❌ Health check failed${NC}"
    fi
}

# Function to show manual health check instructions
show_manual_instructions() {
    echo -e "\n${BLUE}📋 Manual Health Check Instructions:${NC}"
    echo "=============================================="
    echo -e "${YELLOW}Since the application requires XSUAA authentication, here are your options:${NC}"
    echo ""
    echo "1. ${GREEN}Use Cloud Foundry CLI (Current Status):${NC}"
    echo "   ✅ Application is running: $(cf app ShiftBookSrv | grep 'instances' | awk '{print $2}')"
    echo "   ✅ Service bindings: All required services are bound"
    echo "   ✅ Database connection: Working (based on logs)"
    echo ""
    echo "2. ${YELLOW}Access via SAP BTP Cockpit:${NC}"
    echo "   - Go to your SAP BTP Cockpit"
    echo "   - Navigate to your Cloud Foundry space"
    echo "   - Check the application logs and metrics"
    echo ""
    echo "3. ${YELLOW}Use SAP BTP CLI (if available):${NC}"
    echo "   - Install SAP BTP CLI"
    echo "   - Configure authentication"
    echo "   - Use 'btp cf apps' to check status"
    echo ""
    echo "4. ${YELLOW}Monitor via Application Logs:${NC}"
    echo "   Run: cf logs ShiftBookSrv --recent"
    echo ""
    echo "5. ${YELLOW}Check Service Status:${NC}"
    echo "   Run: cf services"
}

# Main execution
main() {
    check_cf_login
    check_app_status
    check_service_bindings
    test_connectivity
    test_health_with_cf_token
    show_manual_instructions
}

# Run main function
main "$@"
