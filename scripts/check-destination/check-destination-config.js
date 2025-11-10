const axios = require("axios");

async function checkDestination() {
  try {
    // Get destination service binding
    const destService = JSON.parse(process.env.VCAP_SERVICES || "{}")
      .destination?.[0];

    if (!destService) {
      console.log("❌ No destination service found in VCAP_SERVICES");
      return;
    }

    const { uri, clientid, clientsecret } = destService.credentials;

    // Get OAuth token
    const tokenUrl = `${destService.credentials.url}/oauth/token`;
    const tokenResponse = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientid,
        client_secret: clientsecret,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Get destination configuration
    const destUrl = `${uri}/destination-configuration/v1/destinations/shiftbook-backend`;
    const destResponse = await axios.get(destUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log("✅ Destination configuration:");
    console.log(JSON.stringify(destResponse.data, null, 2));

    // Check critical settings
    const dest = destResponse.data;
    console.log("\n📋 Key Settings:");
    console.log(`  Authentication: ${dest.Authentication}`);
    console.log(`  tokenServiceURLType: ${dest.tokenServiceURLType}`);
    console.log(`  URL: ${dest.URL}`);

    if (dest.Authentication !== "OAuth2UserTokenExchange") {
      console.log(
        '\n⚠️  WARNING: Authentication should be "OAuth2UserTokenExchange"'
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

checkDestination();
