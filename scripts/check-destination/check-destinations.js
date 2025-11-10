const { getDestination } = require("@sap-cloud-sdk/connectivity");

async function checkDestinations() {
  console.log("🔍 Checking BTP Destinations...");

  const destinationsToCheck = [
    "shiftbook-email",
    "email-service",
    "SHIFTBOOK_EMAIL_SERVICE",
  ];

  for (const destName of destinationsToCheck) {
    try {
      console.log(`\n📡 Checking destination: ${destName}`);
      const destination = await getDestination(destName);

      if (destination) {
        console.log(`✅ Found destination: ${destName}`);
        console.log("📋 Destination details:", {
          url: destination.url || "N/A",
          originalProperties: destination.originalProperties
            ? Object.keys(destination.originalProperties)
            : "None",
          authentication: destination.authTokens
            ? "Has auth tokens"
            : "No auth tokens",
          username: destination.username ? "Has username" : "No username",
          password: destination.password ? "Has password" : "No password",
        });

        // Check for SMTP-specific properties
        if (destination.originalProperties) {
          const smtpProps = Object.keys(destination.originalProperties).filter(
            (key) =>
              key.includes("smtp") ||
              key.includes("mail") ||
              key.includes("email")
          );
          if (smtpProps.length > 0) {
            console.log("📧 SMTP-related properties found:", smtpProps);
          }
        }
      } else {
        console.log(`❌ Destination not found: ${destName}`);
      }
    } catch (error) {
      console.log(`❌ Error checking destination ${destName}:`, error.message);
    }
  }
}

// Also check environment configuration
console.log("🔧 Current Environment Configuration:");
console.log(
  "EMAIL_DESTINATION_NAME:",
  process.env.EMAIL_DESTINATION_NAME || "Not set"
);
console.log(
  "VCAP_SERVICES destination:",
  process.env.VCAP_SERVICES ? "Available" : "Not available"
);

checkDestinations().catch(console.error);
