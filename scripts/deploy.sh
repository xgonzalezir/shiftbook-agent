#!/bin/bash

# ShiftBook CAP Application Deployment Script
# Supports development, testing, and production environments
# Usage: ./scripts/deploy.sh [dev|test|prod] [--blue-green]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="shiftbook-srv"
MTA_ARCHIVE="mta_archives/shiftbook_1.0.0.mtar"
HEALTH_CHECK_ENDPOINT="/health"
HEALTH_CHECK_TIMEOUT=300  # 5 minutes
HEALTH_CHECK_INTERVAL=10  # 10 seconds

# Load health check configuration
HEALTH_CHECK_CONFIG=$(node -e "
  const config = require('./health-check.config.js');
  const env = process.env.CDS_ENV || process.env.NODE_ENV || 'development';
  const envConfig = config.getHealthCheckConfig(env);
  console.log(JSON.stringify(envConfig));
")

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required tools are available
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v cf &> /dev/null; then
        print_error "Cloud Foundry CLI (cf) is not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed. JSON parsing may not work correctly."
    fi
    
    print_success "Prerequisites check completed"
}

# Function to validate environment
validate_environment() {
    local env=$1
    
    case $env in
        dev|development)
            echo "development"
            ;;
        test|testing)
            echo "testing"
            ;;
        prod|production)
            echo "production"
            ;;
        *)
            print_error "Invalid environment: $env. Use: dev, test, or prod"
            exit 1
            ;;
    esac
}

# Function to get environment configuration
get_env_config() {
    local env=$1
    
    case $env in
        development)
            echo "dev"
            ;;
        testing)
            echo "test"
            ;;
        production)
            echo "prod"
            ;;
    esac
}

# Function to check if MTA archive exists
check_mta_archive() {
    if [ ! -f "$MTA_ARCHIVE" ]; then
        print_error "MTA archive not found: $MTA_ARCHIVE"
        print_status "Please run 'npm run build:mta' first"
        exit 1
    fi
    
    print_success "MTA archive found: $MTA_ARCHIVE"
}

# Function to perform health check
perform_health_check() {
    local app_name=$1
    local domain=$2
    local timeout=$3
    
    print_status "Performing health check for $app_name..."
    
    # Use health check configuration if available
    local health_url=""
    if [ -n "$HEALTH_CHECK_CONFIG" ]; then
        health_url=$(echo "$HEALTH_CHECK_CONFIG" | jq -r '.fullHealthUrl' 2>/dev/null || echo "")
    fi
    
    # Fallback to domain-based URL if configuration not available
    if [ -z "$health_url" ]; then
        # Use the actual CF app route instead of constructing it
        local app_route=$(cf app "$app_name" | grep -E "routes:|urls:" | awk '{print $2}' | head -1)
        if [ -n "$app_route" ]; then
            health_url="https://$app_route$HEALTH_CHECK_ENDPOINT"
        else
            health_url="https://$app_name.$domain$HEALTH_CHECK_ENDPOINT"
        fi
    fi
    
    print_status "Health check URL: $health_url"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while [ $(date +%s) -lt $end_time ]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            print_success "Health check passed for $app_name"
            return 0
        fi
        
        print_status "Health check failed, retrying in $HEALTH_CHECK_INTERVAL seconds..."
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    print_error "Health check timeout for $app_name after $timeout seconds"
    return 1
}

# Function to deploy with blue-green strategy
deploy_blue_green() {
    local env=$1
    local space=$2
    local domain=$3
    
    print_status "Starting blue-green deployment to $env environment..."
    
    # Get current app info
    local current_app_name="$APP_NAME"
    local new_app_name="$APP_NAME-green"
    
    print_status "Current app: $current_app_name"
    print_status "New green app: $new_app_name"
    
    # Deploy new version (MTA will create the green app)
    print_status "Deploying new version as green deployment..."
    cf deploy "$MTA_ARCHIVE"
    
    # Check if current app exists (blue app)
    if cf app "$current_app_name" > /dev/null 2>&1; then
        print_status "Found existing blue app: $current_app_name"
        
        # Rename current app to green
        print_status "Renaming deployed app to green version..."
        cf rename "$current_app_name" "$new_app_name"
        
        # Run smoke tests on green instance
        print_status "Running smoke tests on green instance..."
        sleep 30  # Wait for app to start
        
        if perform_health_check "$new_app_name" "$domain" 120; then
            print_success "Smoke tests passed on green instance"
            print_success "Green deployment completed! App is now: $new_app_name"
            
            # Optional: Clean up old blue instance if it exists with -old suffix
            if cf app "$current_app_name-old" > /dev/null 2>&1; then
                print_status "Cleaning up previous old instance..."
                cf delete "$current_app_name-old" -f
            fi
        else
            print_error "Smoke tests failed on green instance"
            print_status "Green instance is available but health check failed"
            print_status "Manual investigation required for: $new_app_name"
            exit 1
        fi
    else
        print_status "No existing blue app found, this is the initial green deployment"
        cf rename "$current_app_name" "$new_app_name"
        
        if perform_health_check "$new_app_name" "$domain" 120; then
            print_success "Initial green deployment completed! App is now: $new_app_name"
        else
            print_error "Health check failed for initial green deployment"
            exit 1
        fi
    fi
}

# Function to deploy with standard strategy
deploy_standard() {
    local env=$1
    local space=$2
    local domain=$3
    
    print_status "Starting standard deployment to $env environment..."
    
    # Deploy application
    cf deploy "$MTA_ARCHIVE"
    
    # Perform health check
    if perform_health_check "$APP_NAME" "$domain" $HEALTH_CHECK_TIMEOUT; then
        print_success "Deployment completed successfully!"
    else
        print_error "Deployment failed health check"
        exit 1
    fi
}

# Function to deploy to specific environment
deploy_to_environment() {
    local env=$1
    local blue_green=$2
    
    print_status "Deploying to $env environment..."
    
    # Get environment configuration
    local env_config=$(get_env_config "$env")
    local space="$env_config"
    
    # Get domain from CF
    local domain=$(cf domains | grep -E '^[a-zA-Z0-9.-]+\s+shared' | awk '{print $1}' | head -1)
    if [ -z "$domain" ]; then
        print_error "Could not determine CF domain"
        exit 1
    fi
    
    print_status "Using domain: $domain"
    print_status "Using space: $space"
    
    # Switch to target space
    cf target -s "$space"
    
    # Deploy based on strategy
    if [ "$blue_green" = "true" ]; then
        deploy_blue_green "$env" "$space" "$domain"
    else
        deploy_standard "$env" "$space" "$domain"
    fi
    
    print_success "Deployment to $env environment completed successfully!"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [dev|test|prod] [--blue-green]"
    echo ""
    echo "Environments:"
    echo "  dev|development    Deploy to development environment"
    echo "  test|testing      Deploy to testing environment"
    echo "  prod|production   Deploy to production environment"
    echo ""
    echo "Options:"
    echo "  --blue-green      Use blue-green deployment strategy (all environments)"
    echo ""
    echo "Examples:"
    echo "  $0 dev                    # Deploy to development"
    echo "  $0 test                   # Deploy to testing"
    echo "  $0 prod --blue-green     # Deploy to production with blue-green strategy"
}

# Main execution
main() {
    # Check arguments
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi
    
    local environment=""
    local blue_green=false
    
    # Parse arguments
    while [ $# -gt 0 ]; do
        case $1 in
            --blue-green)
                blue_green=true
                shift
                ;;
            dev|development|test|testing|prod|production)
                environment=$(validate_environment "$1")
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    if [ -z "$environment" ]; then
        print_error "Environment not specified"
        show_usage
        exit 1
    fi
    
    # Blue-green deployment is now supported for all environments
    if [ "$blue_green" = "true" ]; then
        print_status "Blue-green deployment strategy selected"
    fi
    
    print_status "Starting deployment process..."
    print_status "Environment: $environment"
    print_status "Blue-green: $blue_green"
    
    # Check prerequisites
    check_prerequisites
    
    # Check MTA archive
    check_mta_archive
    
    # Deploy to environment
    deploy_to_environment "$environment" "$blue_green"
    
    print_success "Deployment process completed successfully!"
}

# Execute main function
main "$@"
