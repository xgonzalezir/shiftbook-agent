#!/usr/bin/env node

/**
 * Debug script to decode JWT tokens and understand scope mapping
 */

const https = require('https');

// Configuration
const CONFIG = {
  tokenServiceURL: 'https://gbi-manu-dev.authentication.us10.hana.ondemand.com/oauth/token',
  clientId: 'sb-shiftbook-cap-manu-dev-org-dev!t459223',
  clientSecret: '7EPBfc9V/J3w3xM/M4GjBDODEQA='
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, headers: res.headers, data: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    return { header, payload };
  } catch (error) {
    console.error('Error decoding JWT:', error.message);
    return null;
  }
}

async function debugToken() {
  console.log('🔍 Debugging JWT token content...\n');
  
  const credentials = Buffer.from(`${CONFIG.clientId}:${CONFIG.clientSecret}`).toString('base64');
  const scope = 'shiftbook-cap-manu-dev-org-dev!t459223.shiftbook.admin';
  
  console.log(`Requesting token for scope: ${scope}`);
  
  const tokenData = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: scope
  }).toString();

  try {
    const response = await makeRequest(CONFIG.tokenServiceURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: tokenData
    });

    if (response.status === 200) {
      console.log('✅ Token obtained successfully\n');
      
      const token = response.data.access_token;
      const decoded = decodeJWT(token);
      
      if (decoded) {
        console.log('📋 JWT Header:');
        console.log(JSON.stringify(decoded.header, null, 2));
        
        console.log('\n📋 JWT Payload:');
        console.log(JSON.stringify(decoded.payload, null, 2));
        
        console.log('\n🔍 Scope Analysis:');
        if (decoded.payload.scope) {
          const scopes = Array.isArray(decoded.payload.scope) ? decoded.payload.scope : decoded.payload.scope.split(' ');
          console.log('Token contains the following scopes:');
          scopes.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
        }
        
        if (decoded.payload.authorities) {
          console.log('\nToken contains the following authorities:');
          decoded.payload.authorities.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
        }
        
        console.log('\n🎯 CAP expects simplified scope names:');
        console.log('  - shiftbook.read');
        console.log('  - shiftbook.user'); 
        console.log('  - shiftbook.admin');
        
        console.log('\n⚠️  Mismatch identified:');
        console.log('  Token provides: full XSUAA scope names with app prefix');
        console.log('  CAP expects: simplified scope names without prefix');
      }
    } else {
      console.log('❌ Failed to obtain token:', response.status, response.data);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  debugToken().catch(console.error);
}