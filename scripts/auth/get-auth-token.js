const axios = require('axios');

// XSUAA credentials from the environment
const XSUAA_CREDENTIALS = {
  clientid: "sb-shiftbook-srv-manu-dev-org-dev-v3!t459223",
  clientsecret: "b92f25eb-8d57-49e0-9776-63da97edbbb1$Vm4bwArc-VK2RPvi2eIYW6egQxC153r8oFayADyS8bU=",
  url: "https://gbi-manu-dev.authentication.us10.hana.ondemand.com"
};

async function getAccessToken() {
  try {
    console.log('🔐 Getting access token from XSUAA...');
    
    const tokenUrl = `${XSUAA_CREDENTIALS.url}/oauth/token`;
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: XSUAA_CREDENTIALS.clientid,
      client_secret: XSUAA_CREDENTIALS.clientsecret
    });

    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const token = response.data.access_token;
    console.log('✅ Access token obtained successfully!');
    console.log('📋 Token (first 50 chars):', token.substring(0, 50) + '...');
    
    return token;
  } catch (error) {
    console.error('❌ Error getting access token:', error.response?.data || error.message);
    throw error;
  }
}

async function testShiftBookCategory(token) {
  try {
    console.log('\n🧪 Testing ShiftBookCategory access...');
    
    const baseUrl = 'https://manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com';
    
    // Test 1: Get ShiftBookCategory entity
    console.log('\n1️⃣ Testing ShiftBookCategory entity...');
    const categoryResponse = await axios.get(`${baseUrl}/shiftbook/ShiftBookService/ShiftBookCategory`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ ShiftBookCategory entity accessible!');
    console.log('📊 Response status:', categoryResponse.status);
    console.log('📄 Response data:', JSON.stringify(categoryResponse.data, null, 2));
    
    // Test 2: Call getShiftbookCategories action
    console.log('\n2️⃣ Testing getShiftbookCategories action...');
    const actionResponse = await axios.post(`${baseUrl}/shiftbook/ShiftBookService/getShiftbookCategories`, {
      werks: "1000",
      language: "en"
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ getShiftbookCategories action accessible!');
    console.log('📊 Response status:', actionResponse.status);
    console.log('📄 Response data:', JSON.stringify(actionResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing service:', error.response?.data || error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Headers:', error.response.headers);
    }
  }
}

async function main() {
  try {
    const token = await getAccessToken();
    await testShiftBookCategory(token);
    
    console.log('\n🎉 Authentication setup complete!');
    console.log('\n📝 To use this token in your requests:');
    console.log(`curl -X GET "https://manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com/shiftbook/ShiftBookService/ShiftBookCategory" \\`);
    console.log(`  -H "Authorization: Bearer ${token}" \\`);
    console.log(`  -H "Accept: application/json"`);
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { getAccessToken, testShiftBookCategory };
