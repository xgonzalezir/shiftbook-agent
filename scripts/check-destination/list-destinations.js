#!/usr/bin/env node

/**
 * Script to list all destinations in BTP
 */

const https = require("https");
const { URL } = require("url");

async function getAccessToken() {
  // Get credentials from VCAP_SERVICES
  const vcapServices = process.env.VCAP_SERVICES;
  if (!vcapServices) {
    throw new Error(
      "VCAP_SERVICES not found. Make sure the destination service is bound."
    );
  }

  const vcap = JSON.parse(vcapServices);
  const destinationService = vcap.destination?.[0];

  if (!destinationService) {
    throw new Error("Destination service not found in VCAP_SERVICES");
  }

  const credentials = destinationService.credentials;
  const clientId = credentials.clientid;
  const clientSecret = credentials.clientsecret;
  const tokenUrl = credentials.url + "/oauth/token";

  // Get access token
  const tokenResponse = await makeRequest(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    data: "grant_type=client_credentials",
  });

  return tokenResponse.access_token;
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = https.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on("error", reject);

    if (options.data) {
      req.write(options.data);
    }

    req.end();
  });
}

async function listDestinations() {
  console.log("🔍 Listing all destinations in BTP...\n");

  try {
    const accessToken = await getAccessToken();

    // Get destination service URI from VCAP_SERVICES
    const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
    const destinationService = vcapServices.destination[0];
    const baseUrl = destinationService.credentials.uri;

    // List destinations
    const destinationsUrl = `${baseUrl}/destination-configuration/v1/destinations`;
    const destinations = await makeRequest(destinationsUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (destinations && destinations.length > 0) {
      console.log(`✅ Found ${destinations.length} destination(s):\n`);

      destinations.forEach((dest, index) => {
        console.log(`${index + 1}. 📍 ${dest.Name}`);
        console.log(`   - Type: ${dest.Type || "Unknown"}`);
        console.log(`   - URL: ${dest.URL || "Not set"}`);
        if (dest.Description) {
          console.log(`   - Description: ${dest.Description}`);
        }
        console.log("");
      });
    } else {
      console.log("❌ No destinations found");
      console.log("\n💡 You may need to create destinations in BTP Cockpit");
    }
  } catch (error) {
    console.log(`❌ Error listing destinations: ${error.message}`);
    console.log("\n💡 Make sure:");
    console.log("- The destination service is bound to your app");
    console.log("- You have the necessary permissions");
    console.log("- The service instance is properly configured");
  }
}

listDestinations().catch(console.error);
