#!/bin/bash

# Test script for createCategoryWithDetails action email fix
# Replace the URL and token with your actual values

SERVICE_URL="https://your-service-url.com"
SERVICE_PATH="/shiftbook/ShiftBookService"
AUTH_TOKEN="your-auth-token-here"

echo "🚀 Testing createCategoryWithDetails Action Email Fix"
echo "=================================================="

echo ""
echo "📤 Testing CORRECTED payload format:"
echo "-----------------------------------"

# Corrected payload
curl -X POST \
  "${SERVICE_URL}${SERVICE_PATH}/createCategoryWithDetails" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "werks": "1000",
    "default_desc": "Test Category with Emails - Fixed",
    "sendmail": 1,
    "mails": [
      { "mail_address": "test1@company.com" },
      { "mail_address": "test2@company.com" }
    ],
    "translations": []
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""
echo "📤 Testing ORIGINAL incorrect payload format:"
echo "--------------------------------------------"

# Original incorrect payload
curl -X POST \
  "${SERVICE_URL}${SERVICE_PATH}/createCategoryWithDetails" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "werks": "1000",
    "default_desc": "Test Category with Emails",
    "sendmail": true,
    "emails": "test1@company.com,test2@company.com",
    "translations": []
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""
echo "📋 Summary of fixes needed:"
echo "1. Change 'emails' field to 'mails'"
echo "2. Change 'sendmail': true to 'sendmail': 1"
echo "3. Change email format from string to array of objects"
echo "4. Each email object should have 'mail_address' property"
echo ""
echo "✅ The corrected payload should create the category with emails"
echo "❌ The incorrect payload should fail or not create emails"
