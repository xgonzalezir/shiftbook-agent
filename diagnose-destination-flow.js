#!/usr/bin/env node

/**
 * Script to diagnose where a request to shiftbook-backend destination fails
 *
 * This helps identify at which layer the authentication/authorization fails:
 * 1. DMC Gateway level
 * 2. BTP Destination Service level
 * 3. Backend service level
 */

const axios = require("axios");

async function diagnoseDestinationFlow() {
  console.log("🔍 DIAGNOSING REQUEST FLOW TO SHIFTBOOK-BACKEND");
  console.log("=".repeat(70));

  const testUrl = "https://syntax-dmc-demo.execution.eu20-quality.web.dmc.cloud.sap/destination/shiftbook-backend/shiftbookService/getShiftbookLogPaginated";
  const token = process.argv[2];

  if (!token) {
    console.log("❌ Please provide a JWT token as argument");
    console.log("   Usage: node diagnose-destination-flow.js <JWT_TOKEN>");
    return;
  }

  console.log("\n📋 TEST CONFIGURATION:");
  console.log(`   URL: ${testUrl}`);
  console.log(`   Token (first 50 chars): ${token.substring(0, 50)}...`);

  // Decode JWT to show details
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log("\n🔐 TOKEN DETAILS:");
    console.log(`   Issuer: ${payload.iss}`);
    console.log(`   Subject: ${payload.sub}`);
    console.log(`   Zone: ${payload.ext_attr?.zdn || 'N/A'}`);
    console.log(`   Subaccount: ${payload.ext_attr?.subaccountid || 'N/A'}`);
    console.log(`   Expires: ${new Date(payload.exp * 1000).toISOString()}`);
    console.log(`   Scopes: ${payload.scope?.join(', ') || 'N/A'}`);
  } catch (error) {
    console.log("\n⚠️  Could not decode token:", error.message);
  }

  console.log("\n" + "=".repeat(70));
  console.log("TESTING REQUEST FLOW...");
  console.log("=".repeat(70));

  try {
    const response = await axios.get(testUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      maxRedirects: 0, // Don't follow redirects
      validateStatus: () => true, // Don't throw on any status
    });

    console.log("\n📡 RESPONSE RECEIVED:");
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);

    console.log("\n📋 RESPONSE HEADERS:");
    Object.keys(response.headers).forEach(key => {
      if (!key.toLowerCase().includes('cookie')) {
        console.log(`   ${key}: ${response.headers[key]}`);
      }
    });

    console.log("\n📄 RESPONSE BODY (first 500 chars):");
    const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
    console.log(body.substring(0, 500));

    console.log("\n\n" + "=".repeat(70));
    console.log("DIAGNOSIS:");
    console.log("=".repeat(70));

    // Analyze the response
    if (response.status === 200 && body.includes('oauth/authorize')) {
      console.log("\n❌ AUTHENTICATION FAILED AT: DMC Gateway Level");
      console.log("\n📍 What happened:");
      console.log("   1. Request reached the DMC gateway successfully");
      console.log("   2. Gateway rejected your token as invalid/unauthorized");
      console.log("   3. Gateway returned an HTML redirect to authenticate");
      console.log("\n🔍 Likely causes:");
      console.log("   • Token is from wrong environment (gbi-manu-dev vs syntax-dmc-demo)");
      console.log("   • Token issuer doesn't match the expected issuer");
      console.log("   • Token audience doesn't include the DMC application");
      console.log("\n✅ Solution:");
      console.log("   You need a token issued by:");
      console.log("   syntax-dmc-demo.authentication.eu20.hana.ondemand.com");
      console.log("\n   Not from:");
      console.log("   gbi-manu-dev.authentication.us10.hana.ondemand.com");

    } else if (response.status === 401) {
      console.log("\n❌ AUTHENTICATION FAILED");
      console.log("\n📍 Check if the response contains:");
      console.log("   • WWW-Authenticate header (would tell you what's expected)");
      console.log("   • Error details in response body");

      if (response.headers['www-authenticate']) {
        console.log(`\n   WWW-Authenticate: ${response.headers['www-authenticate']}`);
      }

    } else if (response.status === 403) {
      console.log("\n❌ AUTHORIZATION FAILED");
      console.log("\n📍 What happened:");
      console.log("   1. Authentication succeeded (token is valid)");
      console.log("   2. But you don't have permission to access this resource");
      console.log("\n🔍 Likely causes:");
      console.log("   • Missing required scopes in token");
      console.log("   • User/client doesn't have access to the destination");

    } else if (response.status === 404) {
      console.log("\n❌ DESTINATION OR ENDPOINT NOT FOUND");
      console.log("\n📍 What happened:");
      console.log("   1. Authentication succeeded");
      console.log("   2. But the destination or path doesn't exist");
      console.log("\n🔍 Check:");
      console.log("   • Is 'shiftbook-backend' destination configured?");
      console.log("   • Is the path '/shiftbookService/getShiftbookLogPaginated' correct?");

    } else if (response.status === 502 || response.status === 503) {
      console.log("\n❌ BACKEND SERVICE ISSUE");
      console.log("\n📍 What happened:");
      console.log("   1. Gateway authenticated you successfully");
      console.log("   2. Destination service resolved the destination");
      console.log("   3. But the backend service is unavailable or failing");

    } else if (response.status >= 200 && response.status < 300) {
      console.log("\n✅ REQUEST SUCCEEDED!");
      console.log("\n📍 The request reached the backend successfully");

      if (body.includes('{')) {
        try {
          const jsonData = JSON.parse(body);
          console.log("\n📦 Response data:");
          console.log(JSON.stringify(jsonData, null, 2).substring(0, 500));
        } catch (e) {
          // Not JSON
        }
      }
    }

    console.log("\n\n💡 NEXT STEPS:");
    console.log("=".repeat(70));
    console.log("\n1. Get the correct token for syntax-dmc-demo environment:");
    console.log("   • Use BTP Cockpit to get service key for syntax-dmc-demo");
    console.log("   • Exchange for OAuth token from correct auth server");
    console.log("\n2. OR: Find the correct URL for gbi-manu-dev:");
    console.log("   • Your current token works with gbi-manu-dev (US10)");
    console.log("   • You need the URL that routes to gbi-manu-dev backend");
    console.log("   • Check destination configuration in gbi-manu-dev space");

  } catch (error) {
    console.error("\n❌ REQUEST FAILED:", error.message);

    if (error.code === 'ENOTFOUND') {
      console.log("\n📍 DNS Resolution failed - URL is incorrect or unreachable");
    } else if (error.code === 'ECONNREFUSED') {
      console.log("\n📍 Connection refused - service is not running or not accessible");
    } else {
      console.log("\n📍 Unexpected error:", error);
    }
  }
}

// Run the diagnosis
diagnoseDestinationFlow().catch(console.error);
