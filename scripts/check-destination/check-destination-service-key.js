const axios = require("axios");

async function checkDestinationConfig() {
  try {
    console.log("🔍 Checking destination configuration using service key...");

    // Service key credentials (from cf service-key command)
    const credentials = {
      clientid:
        "sb-clonef53b990e68504542a0b95cc1d9586faf!b459223|destination-xsappname!b62",
      clientsecret:
        "6d9446f1-8537-4d17-bcb4-16a3a0cd716c$BaHsYZlW6QhOqXsXpPTttwz_hrx6cY0po4EcBPD6wL4=",
      uri: "https://destination-configuration.cfapps.us10.hana.ondemand.com",
      url: "https://gbi-manu-dev.authentication.us10.hana.ondemand.com",
    };

    // Get OAuth token
    const tokenUrl = `${credentials.url}/oauth/token`;
    console.log(`🔑 Getting OAuth token from: ${tokenUrl}`);

    const tokenResponse = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: credentials.clientid,
        client_secret: credentials.clientsecret,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    console.log("✅ OAuth token obtained successfully");

    // Get all destinations
    const destUrl = `${credentials.uri}/destination-configuration/v1/destinations`;
    console.log(`📡 Getting destinations from: ${destUrl}`);

    const destResponse = await axios.get(destUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log("✅ Found destinations:");
    destResponse.data.forEach((dest) => {
      console.log(`  - ${dest.Name} (${dest.Type})`);
    });

    // Check specifically for shiftbook-email
    const emailDest = destResponse.data.find(
      (d) => d.Name === "shiftbook-email"
    );
    if (emailDest) {
      console.log("\n📧 shiftbook-email destination details:");
      console.log(JSON.stringify(emailDest, null, 2));
    } else {
      console.log("\n❌ shiftbook-email destination not found!");
    }
  } catch (error) {
    console.error("❌ Error checking destination config:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

checkDestinationConfig();
