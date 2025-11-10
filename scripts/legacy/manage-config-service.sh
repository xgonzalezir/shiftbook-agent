#!/bin/bash

# ====================================================================
# Shift Book - User Provided Service Management Script (DEPRECATED)
# ====================================================================
#
# ⚠️  DEPRECATED: This script is no longer needed.
#
# The application has been simplified to use environment variables directly
# instead of user-provided services. Configuration is now handled through:
# - EMAIL_DESTINATION_NAME environment variable (defaults to "shiftbook-email")
# - EMAIL_FROM_ADDRESS environment variable (defaults to "noreply@company.com")
# - EMAIL_FROM_NAME environment variable (defaults to "Shift Book System")
# - EMAIL_SIMULATION_MODE environment variable (defaults to "false")
#
# For deployment, ensure these environment variables are set in your MTA
# configuration or through cf set-env commands.
#
# ====================================================================

CONFIG_FILE="config.json"
SERVICE_NAME="shiftbook-config"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Cloud Foundry CLI is installed
check_cf_cli() {
    if ! command -v cf &> /dev/null; then
        echo -e "${RED}❌ Cloud Foundry CLI not found. Please install it first.${NC}"
        echo "Visit: https://docs.cloudfoundry.org/cf-cli/install-go-cli.html"
        exit 1
    fi
}

# Check if logged in to CF
check_cf_login() {
    if ! cf target &> /dev/null; then
        echo -e "${RED}❌ Not logged in to Cloud Foundry. Please login first:${NC}"
        echo "cf login"
        exit 1
    fi
}

# Create User-Provided Service
create_service() {
    echo -e "${BLUE}🔧 Creating User-Provided Service: ${SERVICE_NAME}${NC}"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}❌ Configuration file ${CONFIG_FILE} not found.${NC}"
        echo "Please create it with the required configuration."
        exit 1
    fi
    
    echo -e "${YELLOW}📄 Using configuration from: ${CONFIG_FILE}${NC}"
    
    if cf create-user-provided-service "$SERVICE_NAME" -p "$CONFIG_FILE"; then
        echo -e "${GREEN}✅ User-Provided Service created successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to create User-Provided Service.${NC}"
        exit 1
    fi
}

# Update User-Provided Service
update_service() {
    echo -e "${BLUE}🔄 Updating User-Provided Service: ${SERVICE_NAME}${NC}"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}❌ Configuration file ${CONFIG_FILE} not found.${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}📄 Using configuration from: ${CONFIG_FILE}${NC}"
    
    if cf update-user-provided-service "$SERVICE_NAME" -p "$CONFIG_FILE"; then
        echo -e "${GREEN}✅ User-Provided Service updated successfully!${NC}"
        echo -e "${YELLOW}⚠️  Note: You may need to restage your app for changes to take effect:${NC}"
        echo "cf restage shiftbook-srv"
    else
        echo -e "${RED}❌ Failed to update User-Provided Service.${NC}"
        exit 1
    fi
}

# Delete User-Provided Service
delete_service() {
    echo -e "${RED}🗑️  Deleting User-Provided Service: ${SERVICE_NAME}${NC}"
    
    read -p "Are you sure you want to delete the service? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if cf delete-service "$SERVICE_NAME" -f; then
            echo -e "${GREEN}✅ User-Provided Service deleted successfully!${NC}"
        else
            echo -e "${RED}❌ Failed to delete User-Provided Service.${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}❌ Deletion cancelled.${NC}"
    fi
}

# Show service details
show_service() {
    echo -e "${BLUE}📋 Service Details: ${SERVICE_NAME}${NC}"
    cf service "$SERVICE_NAME"
}

# List all services
list_services() {
    echo -e "${BLUE}📋 All Services:${NC}"
    cf services
}

# Check if service exists
service_exists() {
    cf service "$SERVICE_NAME" &> /dev/null
}

# Validate configuration file
validate_config() {
    echo -e "${BLUE}🔍 Validating configuration file: ${CONFIG_FILE}${NC}"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}❌ Configuration file ${CONFIG_FILE} not found.${NC}"
        return 1
    fi
    
    # Check if it's valid JSON
    if jq empty "$CONFIG_FILE" 2>/dev/null; then
        echo -e "${GREEN}✅ Configuration file is valid JSON.${NC}"
        
        # Show key configuration values
        echo -e "${YELLOW}📋 Key Configuration Values:${NC}"
        echo "Email From: $(jq -r '.EMAIL_FROM_ADDRESS // "default"' "$CONFIG_FILE")"
        echo "Email Simulation: $(jq -r '.EMAIL_SIMULATION_MODE // "default"' "$CONFIG_FILE")"
        echo "CORS Origins: $(jq -r '.CORS_ALLOWED_ORIGINS // "default"' "$CONFIG_FILE")"
        echo -e "${GREEN}✅ All other values use optimized defaults${NC}"
        return 0
    else
        echo -e "${RED}❌ Configuration file is not valid JSON.${NC}"
        return 1
    fi
}

# Show help
show_help() {
    echo -e "${BLUE}🚀 Shift Book - User Provided Service Management${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  create     Create the User-Provided Service"
    echo "  update     Update the User-Provided Service"
    echo "  delete     Delete the User-Provided Service"
    echo "  show       Show service details"
    echo "  list       List all services"
    echo "  validate   Validate configuration file"
    echo "  help       Show this help message"
    echo ""
    echo "Configuration file: ${CONFIG_FILE}"
    echo "Service name: ${SERVICE_NAME}"
    echo ""
    echo "Examples:"
    echo "  $0 create          # Create the service"
    echo "  $0 validate        # Check config file"
    echo "  $0 show           # Show service details"
}

# Main script logic
main() {
    check_cf_cli
    check_cf_login
    
    case "${1:-help}" in
        create)
            if service_exists; then
                echo -e "${YELLOW}⚠️  Service ${SERVICE_NAME} already exists. Use 'update' to modify it.${NC}"
                exit 1
            fi
            validate_config && create_service
            ;;
        update)
            if ! service_exists; then
                echo -e "${YELLOW}⚠️  Service ${SERVICE_NAME} does not exist. Use 'create' to create it first.${NC}"
                exit 1
            fi
            validate_config && update_service
            ;;
        delete)
            if ! service_exists; then
                echo -e "${YELLOW}⚠️  Service ${SERVICE_NAME} does not exist.${NC}"
                exit 1
            fi
            delete_service
            ;;
        show)
            if ! service_exists; then
                echo -e "${YELLOW}⚠️  Service ${SERVICE_NAME} does not exist.${NC}"
                exit 1
            fi
            show_service
            ;;
        list)
            list_services
            ;;
        validate)
            validate_config
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
