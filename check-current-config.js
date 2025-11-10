#!/usr/bin/env node

/**
 * Script to check current email configuration in BTP
 */

console.log("🔍 Checking current email configuration...\n");

if (!process.env.VCAP_SERVICES) {
  console.log("❌ No VCAP_SERVICES found");
  process.exit(1);
}

try {
  const vcap = JSON.parse(process.env.VCAP_SERVICES);
  const userProvided = vcap["user-provided"];

  if (!userProvided) {
    console.log("❌ No user-provided services found");
    process.exit(1);
  }

  const configService = userProvided.find((s) => s.name === "shiftbook-config");

  if (!configService) {
    console.log("❌ shiftbook-config service not found");
    process.exit(1);
  }

  const credentials = configService.credentials || {};

  console.log("✅ Current email configuration:");
  console.log(
    `   EMAIL_DESTINATION_NAME: ${
      credentials.EMAIL_DESTINATION_NAME || "Not set"
    }`
  );
  console.log(
    `   EMAIL_FROM_ADDRESS: ${credentials.EMAIL_FROM_ADDRESS || "Not set"}`
  );
  console.log(
    `   EMAIL_FROM_NAME: ${credentials.EMAIL_FROM_NAME || "Not set"}`
  );
  console.log(
    `   EMAIL_SIMULATION_MODE: ${
      credentials.EMAIL_SIMULATION_MODE || "Not set"
    }`
  );
} catch (error) {
  console.error("❌ Error:", error.message);
}
