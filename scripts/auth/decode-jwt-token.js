#!/usr/bin/env node

/**
 * Script to decode a JWT token and extract important information
 * This helps identify the actual xsappname from the DMC frontend
 *
 * Usage: node scripts/decode-jwt-token.js <JWT_TOKEN>
 */

function decodeJWT(token) {
  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '');

    // Split token into parts
    const parts = cleanToken.split('.');

    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format. Expected 3 parts separated by dots.');
    }

    // Decode header
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());

    // Decode payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    console.log('\n' + '='.repeat(80));
    console.log('JWT TOKEN ANALYSIS');
    console.log('='.repeat(80));

    console.log('\n📋 HEADER:');
    console.log(JSON.stringify(header, null, 2));

    console.log('\n📋 PAYLOAD:');
    console.log(JSON.stringify(payload, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('KEY INFORMATION FOR OAUTH2 TOKEN EXCHANGE');
    console.log('='.repeat(80));

    console.log('\n🔑 SIGNING KEY:');
    console.log(`   kid: ${header.kid || 'NOT FOUND'}`);
    console.log(`   alg: ${header.alg || 'NOT FOUND'}`);

    console.log('\n🏢 ISSUER & AUDIENCE:');
    console.log(`   Issuer (iss): ${payload.iss || 'NOT FOUND'}`);
    console.log(`   Audience (aud): ${Array.isArray(payload.aud) ? payload.aud.join(', ') : payload.aud || 'NOT FOUND'}`);
    console.log(`   Subject (sub): ${payload.sub || 'NOT FOUND'}`);

    console.log('\n🔐 CLIENT INFORMATION:');
    console.log(`   Client ID (client_id): ${payload.client_id || 'NOT FOUND'}`);
    console.log(`   Client ID (cid): ${payload.cid || 'NOT FOUND'}`);
    console.log(`   Authorized Party (azp): ${payload.azp || 'NOT FOUND'}`);

    console.log('\n🌐 XSUAA INFORMATION:');
    console.log(`   Zone ID (zid): ${payload.zid || 'NOT FOUND'}`);
    console.log(`   Zone (ext_attr.zdn): ${payload.ext_attr?.zdn || 'NOT FOUND'}`);
    console.log(`   Subaccount ID: ${payload.ext_attr?.subaccountid || 'NOT FOUND'}`);

    console.log('\n✅ SCOPES:');
    if (payload.scope && Array.isArray(payload.scope)) {
      payload.scope.forEach(scope => console.log(`   - ${scope}`));
    } else {
      console.log('   NO SCOPES FOUND');
    }

    console.log('\n👤 USER INFORMATION:');
    console.log(`   User Name: ${payload.user_name || 'NOT FOUND'}`);
    console.log(`   Email: ${payload.email || 'NOT FOUND'}`);
    console.log(`   User ID: ${payload.user_id || 'NOT FOUND'}`);
    console.log(`   Origin: ${payload.origin || 'NOT FOUND'}`);

    console.log('\n⏰ TOKEN VALIDITY:');
    const iat = payload.iat ? new Date(payload.iat * 1000).toISOString() : 'NOT FOUND';
    const exp = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'NOT FOUND';
    const now = new Date();
    const isExpired = payload.exp ? now.getTime() > payload.exp * 1000 : 'UNKNOWN';

    console.log(`   Issued At (iat): ${iat}`);
    console.log(`   Expires At (exp): ${exp}`);
    console.log(`   Is Expired: ${isExpired}`);

    if (payload.exp) {
      const timeLeft = Math.max(0, payload.exp * 1000 - now.getTime());
      const minutesLeft = Math.floor(timeLeft / 60000);
      const secondsLeft = Math.floor((timeLeft % 60000) / 1000);
      console.log(`   Time Left: ${minutesLeft}m ${secondsLeft}s`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('XSAPPNAME IDENTIFICATION');
    console.log('='.repeat(80));

    // Try to extract xsappname from client_id
    const clientId = payload.client_id || payload.cid || payload.azp;
    if (clientId) {
      console.log(`\n📌 Client ID: ${clientId}`);

      // Remove sb- prefix and tenant suffix to get xsappname
      let xsappname = clientId;
      if (xsappname.startsWith('sb-')) {
        xsappname = xsappname.substring(3); // Remove 'sb-'
      }
      if (xsappname.includes('!')) {
        xsappname = xsappname.split('!')[0]; // Remove tenant suffix
      }

      console.log(`📌 Extracted xsappname: ${xsappname}`);
      console.log('\n💡 Use this in xs-security.json granted-apps:');
      console.log(`   "$XSAPPNAME(application, ${xsappname})"`);
      console.log(`   OR (with sb- prefix):`);
      console.log(`   "$XSAPPNAME(application, ${payload.client_id || payload.cid})"`);
    } else {
      console.log('\n❌ Could not extract xsappname - no client_id found');
    }

    console.log('\n' + '='.repeat(80));
    console.log('CURRENT granted-apps CONFIGURATION');
    console.log('='.repeat(80));
    console.log('\nYour xs-security.json currently has:');
    console.log('  - $XSAPPNAME(application, shiftbook-plugin)');
    console.log('  - $XSAPPNAME(application, sb-execution-dmc-sap-quality)');
    console.log('  - $XSAPPNAME(application, dmc-quality)');
    console.log('  - $XSAPPNAME(application, dmc-services-quality)');

    if (clientId) {
      let xsappname = clientId;
      if (xsappname.startsWith('sb-')) {
        xsappname = xsappname.substring(3);
      }
      if (xsappname.includes('!')) {
        xsappname = xsappname.split('!')[0];
      }

      const configuredNames = [
        'shiftbook-plugin',
        'sb-execution-dmc-sap-quality',
        'dmc-quality',
        'dmc-services-quality'
      ];

      const matches = configuredNames.filter(name =>
        name === xsappname ||
        name === clientId ||
        name === `sb-${xsappname}` ||
        clientId.includes(name)
      );

      if (matches.length > 0) {
        console.log(`\n✅ MATCH FOUND: Token xsappname matches: ${matches.join(', ')}`);
      } else {
        console.log(`\n❌ NO MATCH: Token xsappname "${xsappname}" is NOT in granted-apps`);
        console.log(`\n🔧 FIX: Add this to xs-security.json granted-apps:`);
        console.log(`   "$XSAPPNAME(application, ${xsappname})"`);
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error decoding JWT token:', error.message);
    console.error('\nPlease ensure you provide a valid JWT token.');
    console.error('Usage: node scripts/decode-jwt-token.js <JWT_TOKEN>');
    process.exit(1);
  }
}

// Main execution
const token = process.argv[2];

if (!token) {
  console.error('\n❌ No JWT token provided');
  console.error('\nUsage: node scripts/decode-jwt-token.js <JWT_TOKEN>');
  console.error('\nExample:');
  console.error('  node scripts/decode-jwt-token.js eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...');
  console.error('\nYou can get a JWT token from:');
  console.error('  1. Browser DevTools → Network → Authorization header');
  console.error('  2. DMC UI → F12 → Network → Copy request header');
  process.exit(1);
}

decodeJWT(token);
