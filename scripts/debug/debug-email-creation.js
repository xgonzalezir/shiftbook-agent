const http = require('http');

// Simple debug script to test email creation
const CONFIG = {
  baseUrl: 'http://localhost:4004',
  servicePath: '/shiftbook/ShiftBookService',
  username: 'admin',
  password: 'admin'
};

// Test payload
const TEST_PAYLOAD = {
  "werks": "1000",
  "default_desc": "Debug Test - Email Creation",
  "sendmail": 1,
  "mails": [
    { "mail_address": "debug1@test.com" },
    { "mail_address": "debug2@test.com" }
  ],
  "translations": []
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let rawData = '';
      
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      
      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(rawData);
        } catch (e) {
          parsedData = rawData;
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsedData,
          rawData: rawData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function debugEmailCreation() {
  console.log('🔍 Debugging Email Creation in createCategoryWithDetails');
  console.log('========================================================');
  console.log(`📍 Server: ${CONFIG.baseUrl}`);
  console.log(`🎯 Endpoint: ${CONFIG.servicePath}/createCategoryWithDetails`);
  console.log(`🔐 Auth: Basic (${CONFIG.username}:${CONFIG.password})`);
  console.log('');
  
  console.log('📤 Test Payload:');
  console.log(JSON.stringify(TEST_PAYLOAD, null, 2));
  console.log('');
  
  try {
    console.log('🚀 Step 1: Calling createCategoryWithDetails action...');
    
    const response = await makeRequest({
      hostname: 'localhost',
      port: 4004,
      path: `${CONFIG.servicePath}/createCategoryWithDetails`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${CONFIG.username}:${CONFIG.password}`).toString('base64')}`,
        'Content-Length': JSON.stringify(TEST_PAYLOAD).length
      }
    }, TEST_PAYLOAD);
    
    console.log(`📥 Response Status: ${response.statusCode}`);
    console.log(`📥 Response Headers:`, response.headers);
    
    if (response.statusCode === 200 || response.statusCode === 201 || response.statusCode === 204) {
      console.log('✅ SUCCESS: Action executed successfully');
      
      if (response.statusCode === 204) {
        console.log('📝 Note: 204 No Content - action succeeded but no response body');
      } else {
        console.log(`📥 Response Data:`, JSON.stringify(response.data, null, 2));
      }
      
      console.log('');
      console.log('🔍 Step 2: Checking if category was created...');
      
      // Search for the category
      const searchResponse = await makeRequest({
        hostname: 'localhost',
        port: 4004,
        path: `${CONFIG.servicePath}/ShiftBookCategory?$filter=default_desc eq 'Debug Test - Email Creation' and werks eq '1000'`,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${CONFIG.username}:${CONFIG.password}`).toString('base64')}`
        }
      });
      
      console.log(`📥 Category Search Status: ${searchResponse.statusCode}`);
      
      if (searchResponse.statusCode === 200) {
        console.log(`📥 Category Search Response:`, JSON.stringify(searchResponse.data, null, 2));
        
        if (searchResponse.data && searchResponse.data.value && searchResponse.data.value.length > 0) {
          const categoryId = searchResponse.data.value[0].ID;
          console.log(`📧 Found Category ID: ${categoryId}`);
          
          console.log('');
          console.log('🔍 Step 3: Checking if emails were created...');
          
          // Check emails directly
          const emailsResponse = await makeRequest({
            hostname: 'localhost',
            port: 4004,
            path: `${CONFIG.servicePath}/ShiftBookCategoryMail?$filter=category eq '${categoryId}' and werks eq '1000'`,
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Basic ${Buffer.from(`${CONFIG.username}:${CONFIG.password}`).toString('base64')}`
            }
          });
          
          console.log(`📥 Emails Query Status: ${emailsResponse.statusCode}`);
          
          if (emailsResponse.statusCode === 200) {
            console.log(`📥 Emails Query Response:`, JSON.stringify(emailsResponse.data, null, 2));
            
            if (emailsResponse.data && emailsResponse.data.value) {
              const emailCount = emailsResponse.data.value.length;
              console.log(`📧 Found ${emailCount} emails for category ${categoryId}`);
              
              if (emailCount > 0) {
                console.log('✅ SUCCESS: Emails were created!');
                emailsResponse.data.value.forEach((email, index) => {
                  console.log(`  ${index + 1}. ${email.mail_address}`);
                });
              } else {
                console.log('❌ FAILED: No emails were created');
                console.log('💡 This means the createCategoryWithDetails action is not creating emails');
              }
            }
          } else {
            console.log(`❌ Emails query failed: ${emailsResponse.rawData}`);
          }
        } else {
          console.log('⚠️  Warning: Category not found in search results');
        }
      } else {
        console.log(`❌ Category search failed: ${searchResponse.rawData}`);
      }
      
    } else {
      console.log('❌ FAILED: Action execution failed');
      console.log(`📧 Error Response: ${response.rawData}`);
    }
    
  } catch (error) {
    console.error('💥 Request failed:', error.message);
    console.error('💡 Check server logs for more details');
  }
  
  console.log('');
  console.log('📋 Debug Summary:');
  console.log('1. Action execution status');
  console.log('2. Category creation verification');
  console.log('3. Email creation verification');
  console.log('');
  console.log('💡 If emails are not created, the issue is in the action implementation');
}

// Run the debug
if (require.main === module) {
  debugEmailCreation().catch(console.error);
}

module.exports = { debugEmailCreation };
