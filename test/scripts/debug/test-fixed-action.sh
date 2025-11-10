#!/bin/bash

# Test script for the FIXED createCategoryWithDetails action
# Server: localhost:4004
# Authentication: Basic Authentication for dev/test environment
# IMPORTANT: Action is now service-level (not entity-bound)!

SERVICE_URL="http://localhost:4004"
SERVICE_PATH="/shiftbook/ShiftBookService"

echo "🚀 Testing FIXED createCategoryWithDetails Action"
echo "================================================"
echo "📍 Server: ${SERVICE_URL}"
echo "🎯 FIXED Endpoint: ${SERVICE_PATH}/createCategoryWithDetails"
echo "🔐 Authentication: Basic Auth (admin:admin)"
echo "💡 NOTE: Action is now service-level (no entity binding required)!"
echo ""

# Test payload
echo "📤 Testing with payload:"
cat << 'EOF'
{
  "werks": "1000",
  "default_desc": "Fixed Action Test - Email Creation",
  "sendmail": 1,
  "mails": [
    { "mail_address": "fixed1@test.com" },
    { "mail_address": "fixed2@test.com" },
    { "mail_address": "fixed3@test.com" }
  ],
  "translations": []
}
EOF
echo ""

echo "📤 Sending request to FIXED endpoint..."
echo "--------------------------------------"

# Create category with emails (now using the CORRECT service-level endpoint)
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  "${SERVICE_URL}${SERVICE_PATH}/createCategoryWithDetails" \
  -H "Content-Type: application/json" \
  -u "admin:admin" \
  -d '{
    "werks": "1000",
    "default_desc": "Fixed Action Test - Email Creation",
    "sendmail": 1,
    "mails": [
      { "mail_address": "fixed1@test.com" },
      { "mail_address": "fixed2@test.com" },
      { "mail_address": "fixed3@test.com" }
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
  echo "✅ SUCCESS: Action executed successfully! (Status $HTTP_STATUS)"
  
  if [ "$HTTP_STATUS" = "204" ]; then
    echo "📝 Note: 204 No Content means success but no response body returned"
  fi
  
  echo ""
  echo "🔍 Now checking if emails were actually created in the database..."
  echo "---------------------------------------------------------------"
  
  # Since we don't have the category ID from the response, we need to find it
  # Let's search for the category we just created by description
not  echo "🔍 Searching for the created category by description..."
  
  # Use proper URL encoding for the filter
  FILTER_VALUE="Fixed Action Test - Email Creation"
  ENCODED_FILTER=$(echo "$FILTER_VALUE" | sed 's/ /%20/g')
  
  SEARCH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET \
    "${SERVICE_URL}${SERVICE_PATH}/ShiftBookCategory?\$filter=default_desc%20eq%20%27${ENCODED_FILTER}%27%20and%20werks%20eq%20%271000%27" \
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
      
      # Test getMailRecipients to verify emails were created
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
          echo ""
          echo "🎉 PROBLEM SOLVED: The createCategoryWithDetails action is now working correctly!"
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
    "${SERVICE_URL}${SERVICE_PATH}/ShiftBookCategoryMail?\$filter=werks%20eq%20%271000%27" \
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
  echo "❌ FAILED: Action execution failed with status $HTTP_STATUS"
  echo "💡 Response: $RESPONSE_BODY"
  echo ""
  echo "🔍 Troubleshooting tips:"
  echo "   - Make sure server is running on localhost:4004"
  echo "   - Check if basic authentication is properly configured"
  echo "   - Verify the createCategoryWithDetails action is registered"
  echo "   - Check server logs for authentication errors"
  echo "   - Try different credentials: admin:admin, alice:alice, etc."
  echo "   - IMPORTANT: Action should now be service-level (no entity binding)!"
fi

echo ""
echo "📋 Test Summary:"
echo "1. createCategoryWithDetails should now work as a service-level action"
echo "2. getMailRecipients should show the created emails"
echo "3. Expected: 3 emails should be created"
echo "4. FIXED: Using service-level endpoint: /createCategoryWithDetails"
echo ""
echo "💡 If emails are not created, check:"
echo "   - Server logs for errors"
echo "   - Database tables: ShiftBookCategoryMail"
echo "   - Action implementation in shiftbook-service.ts"
echo "   - Authentication configuration in server.js"
echo "   - Try different basic auth credentials"
echo "   - IMPORTANT: Action is now service-level (no entity binding required)!"
