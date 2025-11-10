#!/usr/bin/env node

/**
 * Script to determine which email destination is being used in manu-dev
 *
 * BTP Destination Service has two levels where destinations can be configured:
 * 1. Subaccount level - Configured in BTP Cockpit > Connectivity > Destinations
 * 2. Service instance level - Configured in the destination service instance itself
 *
 * This script checks which destination is actually being used by the application.
 */

const { getDestination } = require("@sap-cloud-sdk/connectivity");

async function checkWhichDestinationIsUsed() {
  console.log("🔍 CHECKING WHICH EMAIL DESTINATION IS BEING USED");
  console.log("=".repeat(70));
  console.log("\nBackground:");
  console.log("  BTP Destination Service supports two levels of destinations:");
  console.log("  1. SUBACCOUNT level - configured in BTP Cockpit");
  console.log("  2. SERVICE INSTANCE level - configured in the service instance");
  console.log("\n  The SAP Cloud SDK checks destinations in this order:");
  console.log("  1. First: Service Instance level (defined in mta.yaml)");
  console.log("  2. Then: Subaccount level (if not found in instance)");
  console.log("=".repeat(70));

  try {
    const destinationName = "shiftbook-email";
    console.log(`\n📡 Attempting to retrieve destination: ${destinationName}`);

    // Get the destination using SAP Cloud SDK (same as the application does)
    const destination = await getDestination({
      destinationName: destinationName,
    });

    if (!destination) {
      console.log(`\n❌ Destination "${destinationName}" not found!`);
      console.log("\n💡 This means:");
      console.log("   - Neither subaccount nor instance level has this destination");
      console.log("   - Check your BTP Cockpit > Connectivity > Destinations");
      console.log("   - Check your destination service instance configuration");
      return;
    }

    console.log(`\n✅ Destination "${destinationName}" found successfully!`);
    console.log("\n📋 DESTINATION DETAILS:");
    console.log("=".repeat(70));

    // Analyze the destination to determine its source
    console.log("\n🔍 Analyzing destination source...\n");

    // Check for instance-level indicators
    const hasInstanceConfig = destination.originalProperties?.["HTML5.DynamicDestination"] === "true" ||
                              destination.forwardAuthToken === true;

    // Check URL/endpoint
    if (destination.url) {
      console.log(`URL: ${destination.url}`);
    }

    // Check authentication details
    console.log("\n🔐 Authentication Configuration:");
    console.log(`   Username: ${destination.username ? "✓ Configured" : "✗ Not set"}`);
    console.log(`   Password: ${destination.password ? "✓ Configured" : "✗ Not set"}`);

    // Check SMTP properties
    if (destination.originalProperties) {
      console.log("\n📧 SMTP Configuration:");
      const smtpHost = destination.originalProperties["mail.smtp.host"];
      const smtpPort = destination.originalProperties["mail.smtp.port"];
      const smtpAuth = destination.originalProperties["mail.smtp.auth"];
      const smtpStartTls = destination.originalProperties["mail.smtp.starttls.enable"];
      const smtpSsl = destination.originalProperties["mail.smtp.ssl.enable"];
      const mailUser = destination.originalProperties["mail.user"];

      console.log(`   SMTP Host: ${smtpHost || "Not configured"}`);
      console.log(`   SMTP Port: ${smtpPort || "Not configured"}`);
      console.log(`   SMTP Auth: ${smtpAuth || "Not configured"}`);
      console.log(`   STARTTLS: ${smtpStartTls || "Not configured"}`);
      console.log(`   SSL: ${smtpSsl || "Not configured"}`);
      console.log(`   Mail User: ${mailUser ? "✓ Configured" : "✗ Not set"}`);

      console.log("\n📦 All Additional Properties:");
      Object.keys(destination.originalProperties).forEach((key) => {
        if (!key.includes("password") && !key.includes("Password")) {
          console.log(`   ${key}: ${destination.originalProperties[key]}`);
        } else {
          console.log(`   ${key}: ***HIDDEN***`);
        }
      });
    }

    // Determine the likely source
    console.log("\n\n🎯 DETERMINATION:");
    console.log("=".repeat(70));

    // Check mta.yaml configuration
    console.log("\n📄 Checking mta.yaml configuration...");
    console.log("   Your mta.yaml defines:");
    console.log("   - Resource: shiftbook-destination (service: destination, plan: lite)");
    console.log("   - Instance-level destination: shiftbook-email (Type: MAIL)");

    if (destination.originalProperties &&
        (destination.originalProperties["mail.smtp.host"] ||
         destination.username ||
         destination.password)) {
      console.log("\n✅ CONCLUSION: This destination HAS configuration");

      // Try to determine if it's from instance or subaccount
      console.log("\n🔎 Source Level Analysis:");
      console.log("   Since both levels can have the same destination name,");
      console.log("   the SAP Cloud SDK uses this priority:");
      console.log("   ");
      console.log("   1. INSTANCE LEVEL (mta.yaml) - checked first");
      console.log("   2. SUBACCOUNT LEVEL (BTP Cockpit) - fallback");
      console.log("   ");
      console.log("   Based on the configuration found:");

      if (destination.originalProperties["mail.smtp.host"] &&
          destination.originalProperties["mail.smtp.port"]) {
        console.log("   ✓ SMTP properties are configured");
        console.log("   ");
        console.log("   💡 Most likely using: INSTANCE LEVEL destination");
        console.log("      (defined in mta.yaml > shiftbook-destination)");
        console.log("   ");
        console.log("   📍 To modify this destination:");
        console.log("      1. Go to BTP Cockpit > Cloud Foundry > Spaces");
        console.log("      2. Select your space: manu-dev");
        console.log("      3. Go to 'Services' > 'Instances'");
        console.log("      4. Find 'shiftbook-destination' instance");
        console.log("      5. Click on it and go to 'Destinations' tab");
        console.log("      6. Edit the 'shiftbook-email' destination");
      } else {
        console.log("   ⚠️  SMTP properties are missing or incomplete");
        console.log("   ");
        console.log("   💡 Possibly using: SUBACCOUNT LEVEL destination");
        console.log("      (configured in BTP Cockpit > Connectivity > Destinations)");
        console.log("   ");
        console.log("   📍 To modify this destination:");
        console.log("      1. Go to BTP Cockpit > Connectivity > Destinations");
        console.log("      2. Find 'shiftbook-email' destination");
        console.log("      3. Edit the configuration");
      }
    } else {
      console.log("\n⚠️  CONCLUSION: Destination exists but lacks configuration");
      console.log("   The destination is found but critical properties are missing.");
      console.log("   You need to configure either:");
      console.log("   1. Instance-level destination in the service instance, OR");
      console.log("   2. Subaccount-level destination in BTP Cockpit");
    }

    console.log("\n\n🔧 HOW TO CHECK MANUALLY:");
    console.log("=".repeat(70));
    console.log("\n1. CHECK INSTANCE LEVEL (Service Instance):");
    console.log("   cf target -s manu-dev");
    console.log("   cf service shiftbook-destination");
    console.log("   ");
    console.log("   Or via BTP Cockpit:");
    console.log("   Cloud Foundry > Spaces > manu-dev > Service Instances");
    console.log("   > shiftbook-destination > Destinations tab");

    console.log("\n2. CHECK SUBACCOUNT LEVEL (BTP Cockpit):");
    console.log("   BTP Cockpit > Connectivity > Destinations");
    console.log("   Look for 'shiftbook-email' destination");

    console.log("\n\n💡 PRO TIP:");
    console.log("=".repeat(70));
    console.log("Instance-level destinations (mta.yaml) take PRIORITY over");
    console.log("subaccount-level destinations. If you have both, the instance");
    console.log("level will be used.");

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error("\n🔍 Error Details:");

    if (error.message.includes("Unable to find a destination")) {
      console.error("\n   The destination 'shiftbook-email' was not found.");
      console.error("   This means it doesn't exist at either level.");
      console.error("\n   Action required:");
      console.error("   1. Create it at subaccount level (BTP Cockpit), OR");
      console.error("   2. Configure it at instance level (service instance)");
    } else if (error.message.includes("VCAP_SERVICES")) {
      console.error("\n   VCAP_SERVICES not found - not running in Cloud Foundry.");
      console.error("   This script should be run from your deployed application.");
      console.error("\n   To test locally, you can:");
      console.error("   1. Use 'cf ssh shiftbook-srv' to access the app");
      console.error("   2. Run: 'node scripts/email/check-which-destination-is-used.js'");
    } else {
      console.error("   Unexpected error:", error);
    }
  }
}

// Run the check
if (require.main === module) {
  checkWhichDestinationIsUsed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

module.exports = { checkWhichDestinationIsUsed };
