#!/usr/bin/env node

/**
 * Script to validate that shiftbook-config parameters are being read correctly
 */

console.log("🔍 Validating shiftbook-config parameters...\n");

// Check if VCAP_SERVICES is available
if (!process.env.VCAP_SERVICES) {
  console.log("❌ VCAP_SERVICES not available (probably running locally)");
  console.log("This script should be run in BTP environment\n");
  process.exit(1);
}

try {
  const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
  const userProvided = vcapServices["user-provided"];

  if (!userProvided || userProvided.length === 0) {
    console.log("❌ No user-provided services found");
    process.exit(1);
  }

  // Find shiftbook-config service
  const configService = userProvided.find(
    (service) => service.name === "shiftbook-config"
  );

  if (!configService) {
    console.log("❌ shiftbook-config service not found");
    console.log("Available user-provided services:");
    userProvided.forEach((service) => {
      console.log(`  - ${service.name}`);
    });
    process.exit(1);
  }

  console.log("✅ Found shiftbook-config service");
  console.log("📋 Service credentials:");

  const credentials = configService.credentials || {};

  // Check the parameters we updated
  const parametersToCheck = [
    "EMAIL_DESTINATION_NAME",
    "EMAIL_FROM_ADDRESS",
    "EMAIL_FROM_NAME",
    "EMAIL_SIMULATION_MODE",
  ];

  parametersToCheck.forEach((param) => {
    const value = credentials[param];
    if (value !== undefined) {
      console.log(`  ✅ ${param}: "${value}"`);
    } else {
      console.log(`  ⚠️  ${param}: Not set (using default)`);
    }
  });

  console.log("\n📧 Email configuration that will be used:");
  console.log(
    `  - Destination Name: ${
      credentials.EMAIL_DESTINATION_NAME || "email-service"
    }`
  );
  console.log(
    `  - From Address: ${
      credentials.EMAIL_FROM_ADDRESS || "noreply@company.com"
    }`
  );
  console.log(
    `  - From Name: ${credentials.EMAIL_FROM_NAME || "Shift Book System"}`
  );
  console.log(
    `  - Simulation Mode: ${credentials.EMAIL_SIMULATION_MODE || "false"}`
  );
} catch (error) {
  console.error("❌ Error parsing VCAP_SERVICES:", error.message);
  process.exit(1);
}
