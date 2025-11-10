#!/usr/bin/env node

/**
 * Script to check destination configuration in BTP
 */

const { getDestination } = require("@sap-cloud-sdk/connectivity");

async function checkDestination() {
  console.log("🔍 Checking destination configuration...\n");

  // Check what destination name is configured
  const destinationName =
    process.env.EMAIL_DESTINATION_NAME ||
    (process.env.VCAP_SERVICES
      ? (() => {
          try {
            const vcap = JSON.parse(process.env.VCAP_SERVICES);
            const userProvided = vcap["user-provided"];
            const configService = userProvided?.find(
              (s) => s.name === "shiftbook-config"
            );
            return configService?.credentials?.EMAIL_DESTINATION_NAME;
          } catch {
            return null;
          }
        })()
      : null) ||
    "Not configured";

  console.log(`📧 Configured destination name: ${destinationName}`);

  if (destinationName === "Not configured") {
    console.log("❌ No destination configured");
    return;
  }

  try {
    console.log(`🔍 Checking if destination '${destinationName}' exists...`);
    const destination = await getDestination(destinationName);

    if (destination) {
      console.log("✅ Destination found!");
      console.log("📋 Destination details:");
      console.log(`   - URL: ${destination.url || "Not set"}`);
      console.log(`   - Type: ${destination.type || "Not set"}`);
      console.log(
        `   - Authentication: ${
          destination.authTokens ? "Configured" : "Not configured"
        }`
      );

      if (destination.destinationConfiguration) {
        console.log("📧 Email configuration:");
        console.log(
          `   - From: ${
            destination.destinationConfiguration["from.address"] || "Not set"
          }`
        );
        console.log(
          `   - From Name: ${
            destination.destinationConfiguration["from.name"] || "Not set"
          }`
        );
      }
    } else {
      console.log(`❌ Destination '${destinationName}' not found`);
      console.log("\n💡 Possible solutions:");
      console.log("1. Check if the destination exists in BTP Cockpit");
      console.log("2. Verify the destination name is correct");
      console.log("3. Ensure the destination service is bound to the app");
    }
  } catch (error) {
    console.log(`❌ Error checking destination: ${error.message}`);
    console.log("\n💡 This usually means:");
    console.log("- The destination doesn't exist");
    console.log("- The destination service is not bound to the app");
    console.log("- There's a permission issue");
  }
}

checkDestination().catch(console.error);
