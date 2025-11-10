#!/bin/bash

# Test script for createCategoryWithDetails action email creation
# Server: localhost:4004
# Authentication: Basic Authentication for dev/test environment

SERVICE_URL="http://localhost:4004"
SERVICE_PATH="/shiftbook/ShiftBookService"

echo "🚀 Testing createCategoryWithDetails Action Email Creation"
echo "========================================================="
echo "📍 Server: ${SERVICE_URL}"
echo "🎯 Endpoint: ${SERVICE_PATH}/createCategoryWithDetails"
echo "🔐 Authentication: Basic Auth (admin:admin)"
echo ""

# Test payload with different category name
echo "📤 Testing with payload:"
cat << 'EOF'
{
  "werks": "1000",
  "default_desc": "Test Category - Email Verification",
  "sendmail": 1,
  "mails": [
    { "mail_address": "test1@verification.com" },
    { "mail_address": "test2@verification.com" },
    { "mail_address": "test3@verification.com" }
  ],
  "translations": []
}
EOF
echo ""

echo "📤 Sending request to createCategoryWithDetails..."
echo "-----------------------------------------------"

# Create category with emails (with basic authentication)
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  "${SERVICE_URL}${SERVICE_PATH}/createCategoryWithDetails" \
  -H "Content-Type: application/json" \
  -u "admin:admin" \
  -d '{
    "werks": "1000",
    "default_desc": "Test Category - Email Verification",
    "sendmail": 1,
    "mails": [
      { "mail_address": "test1@verification.com" },
      { "mail_address": "test2@verification.com" },
      { "mail_address": "test3@verification.com" }
    ],
    "translations": []
  }')

# Extract HTTP status and response body
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS:")

echo "📥 HTTP Status: $HTTP_STATUS"
echo "📥 Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ] || [ "$HTTP_STATUS" = "204" ]; then
  echo "✅ SUCCESS: Category created! (Status $HTTP_STATUS)"
  
  if [ "$HTTP_STATUS" = "204" ]; then
    echo "📝 Note: 204 No Content means success but no response body returned"
  fi
  
  echo ""
  echo "🔍 Now checking if emails were actually created in the database..."
  echo "---------------------------------------------------------------"
  
  # Since we don't have the category ID from the response, we need to find it
  # Let's search for the category we just created by description
  echo "🔍 Searching for the created category by description..."
  
  SEARCH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET \
    "${SERVICE_URL}${SERVICE_PATH}/ShiftBookCategory?\$filter=default_desc eq 'Test Category - Email Verification' and werks eq '1000'" \
    -H "Accept: application/json" \
    -u "admin:admin")
  
  SEARCH_HTTP_STATUS=$(echo "$SEARCH_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  SEARCH_RESPONSE_BODY=$(echo "$SEARCH_RESPONSE" | grep -v "HTTP_STATUS:")
  
  echo "📥 Category Search Status: $SEARCH_HTTP_STATUS"
  
  if [ "$SEARCH_HTTP_STATUS" = "200" ]; then
    echo "📥 Category Search Response: $SEARCH_RESPONSE_BODY"
    
    # Extract category ID from the search results
    CATEGORY_ID=$(echo "$SEARCH_RESPONSE_BODY" | grep -o '"ID":"[^"]*"' | cut -d'"' -f4 | head -1)
    
    if [ -n "$CATEGORY_ID" ]; then
      echo "📧 Found Category ID: $CATEGORY_ID"
      echo ""
      
      echo "🔍 Testing getMailRecipients to verify emails were created..."
      echo "-----------------------------------------------------------"
      
      # Test getMailRecipients to verify emails were created (with basic auth)
      MAIL_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -X POST \
        "${SERVICE_URL}${SERVICE_PATH}/getMailRecipients" \
        -H "Content-Type: application/json" \
        -u "admin:admin" \
        -d "{\"category\": \"$CATEGORY_ID\", \"werks\": \"1000\"}")
      
      MAIL_HTTP_STATUS=$(echo "$MAIL_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
      MAIL_RESPONSE_BODY=$(echo "$MAIL_RESPONSE" | grep -v "HTTP_STATUS:")
      
      echo "📥 getMailRecipients Status: $MAIL_HTTP_STATUS"
      echo "📥 getMailRecipients Response: $MAIL_RESPONSE_BODY"
      echo ""
      
      if [ "$MAIL_HTTP_STATUS" = "200" ]; then
        EMAIL_COUNT=$(echo "$MAIL_RESPONSE_BODY" | grep -o '"count":[0-9]*' | cut -d: -f2)
        if [ "$EMAIL_COUNT" -gt 0 ]; then
          echo "✅ SUCCESS: $EMAIL_COUNT emails found for category $CATEGORY_ID"
          echo "📧 Emails were created successfully!"
          echo "📧 Recipients: $(echo "$MAIL_RESPONSE_BODY" | grep -o '"recipients":"[^"]*"' | cut -d'"' -f4)"
        else
          echo "❌ FAILED: No emails found for category $CATEGORY_ID"
          echo "💡 This means the emails were not created properly"
          echo "💡 Check the createCategoryWithDetails action implementation"
        fi
      else
        echo "❌ getMailRecipients failed with status $MAIL_HTTP_STATUS"
        echo "💡 Response: $MAIL_RESPONSE_BODY"
      fi
    else
      echo "⚠️  Warning: Could not find category ID in search results"
      echo "💡 The category might not have been created properly"
    fi
  else
    echo "❌ Category search failed with status $SEARCH_HTTP_STATUS"
    echo "💡 Response: $SEARCH_RESPONSE_BODY"
  fi
  
  echo ""
  echo "🔍 Alternative: Direct database check for emails..."
  echo "------------------------------------------------"
  
  # Try to get all emails for the plant to see if any were created
  EMAILS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET \
    "${SERVICE_URL}${SERVICE_PATH}/ShiftBookCategoryMail?\$filter=werks eq '1000'" \
    -H "Accept: application/json" \
    -u "admin:admin")
  
  EMAILS_HTTP_STATUS=$(echo "$EMAILS_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  EMAILS_RESPONSE_BODY=$(echo "$EMAILS_RESPONSE" | grep -v "HTTP_STATUS:")
  
  echo "📥 Direct Email Query Status: $EMAILS_HTTP_STATUS"
  if [ "$EMAILS_HTTP_STATUS" = "200" ]; then
    EMAIL_COUNT=$(echo "$EMAILS_RESPONSE_BODY" | grep -o '"@odata.count":[0-9]*' | cut -d: -f2)
    echo "📥 Total emails in plant 1000: $EMAIL_COUNT"
    echo "📥 Email Query Response: $EMAILS_RESPONSE_BODY"
  else
    echo "❌ Direct email query failed: $EMAILS_RESPONSE_BODY"
  fi
  
else
  echo "❌ FAILED: Category creation failed with status $HTTP_STATUS"
  echo "💡 Check your server logs for more details"
  echo ""
  echo "🔍 Troubleshooting tips:"
  echo "   - Make sure server is running on localhost:4004"
  echo "   - Check if basic authentication is properly configured"
  echo "   - Verify the createCategoryWithDetails action is registered"
  echo "   - Check server logs for authentication errors"
  echo "   - Try different credentials: admin:admin, alice:alice, etc."
fi

echo ""
echo "📋 Test Summary:"
echo "1. createCategoryWithDetails should create category + emails"
echo "2. getMailRecipients should show the created emails"
echo "3. Expected: 3 emails should be created"
echo ""
echo "💡 If emails are not created, check:"
echo "   - Server logs for errors"
echo "   - Database tables: ShiftBookCategoryMail"
echo "   - Action implementation in shiftbook-service.ts"
echo "   - Authentication configuration in server.js"
echo "   - Try different basic auth credentials"
