#!/bin/bash

# Test Script for updateCategoryWithDetails Action using curl
# 
# This script tests the updateCategoryWithDetails action using curl commands.
# It creates a test category, updates it, and verifies the changes.
# 
# Usage:
#   ./scripts/test-update-category-curl.sh
#   
# Prerequisites:
#   - Server must be running on http://localhost:4004
#   - Valid authentication token (default: 'admin')

set -e

# Configuration
BASE_URL="http://localhost:4004"
SERVICE_PATH="/shiftbook/ShiftBookService"
AUTH_TOKEN="alice"
TEST_CATEGORY="550e8400-e29b-41d4-a716-446655440777"
TEST_WERKS="TEST"
TEST_DESC="Original Test Category"
UPDATED_DESC="Updated Test Category"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Test data files
create_test_data() {
    cat > /tmp/test_category_data.json << EOF
{
  "werks": "$TEST_WERKS",
  "default_desc": "$TEST_DESC",
  "sendmail": 1,
  "translations": [
    {"lng": "EN", "desc": "Original Test Category EN"},
    {"lng": "DE", "desc": "Original Test Kategorie DE"}
  ],
  "mails": [
    {"mail_address": "original1@example.com"},
    {"mail_address": "original2@example.com"}
  ]
}
EOF

    cat > /tmp/updated_category_data.json << EOF
{
  "category": "$TEST_CATEGORY",
  "werks": "$TEST_WERKS",
  "default_desc": "$UPDATED_DESC",
  "sendmail": 0,
  "translations": [
    {"lng": "EN", "desc": "Updated Test Category EN"},
    {"lng": "DE", "desc": "Updated Test Kategorie DE"},
    {"lng": "ES", "desc": "Categoría de Prueba Actualizada ES"}
  ],
  "mails": [
    {"mail_address": "updated1@example.com"},
    {"mail_address": "updated2@example.com"},
    {"mail_address": "updated3@example.com"}
  ]
}
EOF
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test data..."
    
    # Delete the test category
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n "$AUTH_TOKEN:" | base64)" \
        -d "{\"category\": \"$TEST_CATEGORY\", \"werks\": \"$TEST_WERKS\"}" \
        "$BASE_URL$SERVICE_PATH/deleteCategoryCascade" > /dev/null
    
    # Clean up temporary files
    rm -f /tmp/test_category_data.json /tmp/updated_category_data.json
    
    log_success "Cleanup completed"
}

# Error handling
trap cleanup EXIT

# Main test functions
test_create_category() {
    log_info "Creating test category..."
    
    response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n "$AUTH_TOKEN:" | base64)" \
        -d @/tmp/test_category_data.json \
        "$BASE_URL$SERVICE_PATH/createCategoryWithDetails")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        log_success "Test category created successfully"
    else
        log_error "Failed to create test category. HTTP Code: $http_code, Response: $response_body"
        exit 1
    fi
}

test_update_category() {
    log_info "Testing updateCategoryWithDetails action..."
    
    response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n "$AUTH_TOKEN:" | base64)" \
        -d @/tmp/updated_category_data.json \
        "$BASE_URL$SERVICE_PATH/updateCategoryWithDetails")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        log_success "updateCategoryWithDetails action executed successfully"
    else
        log_error "Failed to update category. HTTP Code: $http_code, Response: $response_body"
        exit 1
    fi
}

verify_category_update() {
    log_info "Verifying category update using getShiftbookCategories action..."
    
    response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n "$AUTH_TOKEN:" | base64)" \
        -d "{\"werks\": \"$TEST_WERKS\", \"language\": \"en\"}" \
        "$BASE_URL$SERVICE_PATH/getShiftbookCategories")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        # Check if we got results
        if echo "$response_body" | grep -q '"value":\[\]'; then
            log_error "No categories found for the specified werks"
            exit 1
        fi
        
        # Check if our specific category is in the results
        if echo "$response_body" | grep -q "\"ID\":\"$TEST_CATEGORY\""; then
            log_success "Category found in getShiftbookCategories result"
        else
            log_error "Category $TEST_CATEGORY not found in getShiftbookCategories result"
            exit 1
        fi
        
        # Check if the description was updated
        if echo "$response_body" | grep -q "Updated Test Category"; then
            log_success "Category description updated correctly"
        else
            log_error "Category description was not updated"
            exit 1
        fi
        
        # Check if sendmail was updated
        if echo "$response_body" | grep -q '"sendmail":0'; then
            log_success "Category sendmail updated correctly"
        else
            log_error "Category sendmail was not updated"
            exit 1
        fi
    else
        log_error "Failed to get updated category. HTTP Code: $http_code, Response: $response_body"
        exit 1
    fi
}

verify_translations_update() {
    log_info "Verifying translations update..."
    
    response=$(curl -s -w "%{http_code}" -X GET \
        -H "Authorization: Basic $(echo -n "$AUTH_TOKEN:" | base64)" \
        "$BASE_URL$SERVICE_PATH/ShiftBookCategoryLng?\$filter=ID%20eq%20$TEST_CATEGORY%20and%20werks%20eq%20'$TEST_WERKS'")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        # Check if we have 3 translations (EN, DE, ES)
        translation_count=$(echo "$response_body" | grep -o '"lng"' | wc -l)
        if [ "$translation_count" -eq 3 ]; then
            log_success "Translations updated correctly (found $translation_count translations)"
        else
            log_error "Expected 3 translations, found $translation_count"
            exit 1
        fi
        
        # Check for Spanish translation
        if echo "$response_body" | grep -q "Categoría de Prueba Actualizada ES"; then
            log_success "Spanish translation added correctly"
        else
            log_error "Spanish translation not found"
            exit 1
        fi
    else
        log_error "Failed to get translations. HTTP Code: $http_code, Response: $response_body"
        exit 1
    fi
}

verify_mails_update() {
    log_info "Verifying email addresses update..."
    
    response=$(curl -s -w "%{http_code}" -X GET \
        -H "Authorization: Basic $(echo -n "$AUTH_TOKEN:" | base64)" \
        "$BASE_URL$SERVICE_PATH/ShiftBookCategoryMail?\$filter=ID%20eq%20$TEST_CATEGORY%20and%20werks%20eq%20'$TEST_WERKS'")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        # Check if we have 3 email addresses
        mail_count=$(echo "$response_body" | grep -o '"mail_address"' | wc -l)
        if [ "$mail_count" -eq 3 ]; then
            log_success "Email addresses updated correctly (found $mail_count addresses)"
        else
            log_error "Expected 3 email addresses, found $mail_count"
            exit 1
        fi
        
        # Check for new email addresses
        if echo "$response_body" | grep -q "updated1@example.com" && \
           echo "$response_body" | grep -q "updated2@example.com" && \
           echo "$response_body" | grep -q "updated3@example.com"; then
            log_success "All new email addresses found"
        else
            log_error "Some new email addresses not found"
            exit 1
        fi
    else
        log_error "Failed to get email addresses. HTTP Code: $http_code, Response: $response_body"
        exit 1
    fi
}

test_get_shiftbook_categories() {
    log_info "Testing getShiftbookCategories to verify updated data..."
    
    response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n "$AUTH_TOKEN:" | base64)" \
        -d "{\"werks\": \"$TEST_WERKS\", \"language\": \"en\"}" \
        "$BASE_URL$SERVICE_PATH/getShiftbookCategories")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        if echo "$response_body" | grep -q "Updated Test Category"; then
            log_success "getShiftbookCategories shows updated category correctly"
        else
            log_error "Updated category not found in getShiftbookCategories result"
            exit 1
        fi
    else
        log_error "Failed to get categories. HTTP Code: $http_code, Response: $response_body"
        exit 1
    fi
}

# Main execution
main() {
    log_header "Starting updateCategoryWithDetails Action Test with curl"
    log_info "Base URL: $BASE_URL"
    log_info "Service Path: $SERVICE_PATH"
    log_info "Test Category: $TEST_CATEGORY"
    
    # Create test data files
    create_test_data
    
    # Run tests
    test_create_category
    test_update_category
    verify_category_update
    verify_translations_update
    verify_mails_update
    test_get_shiftbook_categories
    
    log_header "Test Results Summary"
    log_success "All tests passed! 🎉"
    log_info "The updateCategoryWithDetails action is working correctly."
}

# Check if curl is available
if ! command -v curl &> /dev/null; then
    log_error "curl is not installed. Please install curl to run this script."
    exit 1
fi

# Run the main function
main "$@"
