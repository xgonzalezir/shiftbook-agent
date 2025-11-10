#!/usr/bin/env node

/**
 * Script para leer el destination shiftbook-email desde BTP
 */

// Ignore SSL certificate errors for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const axios = require("axios");

// Credenciales del Destination Service
const DEST_SERVICE = {
  clientid:
    "sb-clone1f7ab47ab9e748e1afa78bead4fc1a87!b459223|destination-xsappname!b62",
  clientsecret:
    "14740d43-d214-4035-aa7f-ff2cd80ba15d$ioGJBDrJLr9xs3ylvX02k2s67NWxWlciQ9hXd6om6rk=",
  url: "https://gbi-manu-dev.authentication.us10.hana.ondemand.com",
  uri: "https://destination-configuration.cfapps.us10.hana.ondemand.com",
};

async function getAccessToken() {
  try {
    console.log("🔐 Getting access token for Destination Service...");

    const tokenUrl = `${DEST_SERVICE.url}/oauth/token`;
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: DEST_SERVICE.clientid,
      client_secret: DEST_SERVICE.clientsecret,
    });

    const response = await axios.post(tokenUrl, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    console.log("✅ Access token obtained successfully!");
    return response.data.access_token;
  } catch (error) {
    console.error(
      "❌ Error getting access token:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function getDestination(token, destinationName) {
  try {
    console.log(`\n📡 Getting destination: ${destinationName}`);

    const url = `${DEST_SERVICE.uri}/destination-configuration/v1/destinations/${destinationName}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    console.log("✅ Destination retrieved successfully!");
    return response.data;
  } catch (error) {
    console.error(
      `❌ Error getting destination:`,
      error.response?.data || error.message
    );
    throw error;
  }
}

async function checkEmailDestination() {
  console.log("🔍 CHECKING BTP DESTINATION: shiftbook-email");
  console.log("=".repeat(60));

  try {
    const token = await getAccessToken();
    const destination = await getDestination(token, "shiftbook-email");

    console.log("\n📋 DESTINATION CONFIGURATION:");
    console.log("=".repeat(60));
    console.log(`Name: ${destination.Name}`);
    console.log(`Type: ${destination.Type}`);
    console.log(`URL: ${destination.URL || "N/A"}`);
    console.log(`Authentication: ${destination.Authentication}`);
    console.log(`ProxyType: ${destination.ProxyType || "N/A"}`);

    console.log("\n🔑 AUTHENTICATION:");
    console.log("=".repeat(60));
    console.log(
      `User: ${destination.User ? "***CONFIGURED***" : "❌ MISSING"}`
    );
    console.log(
      `Password: ${destination.Password ? "***CONFIGURED***" : "❌ MISSING"}`
    );

    if (destination.destinationConfiguration) {
      console.log("\n⚙️ ADDITIONAL PROPERTIES:");
      console.log("=".repeat(60));

      const props = destination.destinationConfiguration;
      const smtpProps = [
        "mail.smtp.host",
        "mail.smtp.port",
        "mail.smtp.auth",
        "mail.smtp.starttls.enable",
        "mail.smtp.ssl.enable",
        "mail.smtp.ssl.trust",
        "mail.smtp.ssl.protocols",
        "mail.user",
        "mail.password",
        "TrustAll",
      ];

      smtpProps.forEach((prop) => {
        const value = props[prop];
        if (value !== undefined) {
          // Ocultar valores sensibles
          const displayValue =
            prop.includes("password") || prop.includes("Password")
              ? "***HIDDEN***"
              : value;
          console.log(`${prop}: ${displayValue}`);
        } else {
          console.log(`${prop}: ⚠️  NOT SET`);
        }
      });

      // Mostrar otras propiedades no estándar
      console.log("\n📦 OTHER PROPERTIES:");
      Object.keys(props).forEach((key) => {
        if (!smtpProps.includes(key)) {
          const value =
            key.includes("password") || key.includes("Password")
              ? "***HIDDEN***"
              : props[key];
          console.log(`${key}: ${value}`);
        }
      });
    }

    console.log("\n\n🔍 PROBLEM ANALYSIS:");
    console.log("=".repeat(60));

    const issues = [];

    if (!destination.User) {
      issues.push("❌ User not configured in Authentication section");
    }

    if (!destination.Password) {
      issues.push("❌ Password not configured in Authentication section");
    }

    const props = destination.destinationConfiguration || {};

    if (!props["mail.smtp.auth"] || props["mail.smtp.auth"] !== "true") {
      issues.push("⚠️  mail.smtp.auth should be 'true'");
    }

    if (
      !props["mail.smtp.starttls.enable"] ||
      props["mail.smtp.starttls.enable"] !== "true"
    ) {
      issues.push(
        "⚠️  mail.smtp.starttls.enable should be 'true' for port 587"
      );
    }

    if (
      props["mail.smtp.port"] === "587" &&
      props["mail.smtp.ssl.enable"] === "true"
    ) {
      issues.push(
        "⚠️  mail.smtp.ssl.enable should be 'false' for port 587 (use STARTTLS instead)"
      );
    }

    if (!props["mail.smtp.host"]) {
      issues.push("❌ mail.smtp.host not configured");
    }

    if (!props["mail.smtp.port"]) {
      issues.push("❌ mail.smtp.port not configured");
    }

    if (issues.length === 0) {
      console.log("✅ No obvious configuration issues found!");
      console.log("\n💡 The Gmail error suggests:");
      console.log("   1. Username/password might be incorrect");
      console.log(
        "   2. If using Gmail, you need an App Password (not regular password)"
      );
      console.log(
        "   3. 2-Factor Authentication must be enabled for App Passwords"
      );
    } else {
      console.log("Found potential issues:");
      issues.forEach((issue) => console.log(`   ${issue}`));
    }

    console.log("\n📝 FULL DESTINATION OBJECT (DEBUG):");
    console.log("=".repeat(60));
    console.log(
      JSON.stringify(
        {
          ...destination,
          User: destination.User ? "***HIDDEN***" : undefined,
          Password: destination.Password ? "***HIDDEN***" : undefined,
          destinationConfiguration: destination.destinationConfiguration
            ? {
                ...destination.destinationConfiguration,
                "mail.password": destination.destinationConfiguration[
                  "mail.password"
                ]
                  ? "***HIDDEN***"
                  : undefined,
                Password: destination.destinationConfiguration.Password
                  ? "***HIDDEN***"
                  : undefined,
              }
            : undefined,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error("\n💥 Error during check:", error.message);
    process.exit(1);
  }
}

// Execute
if (require.main === module) {
  checkEmailDestination();
}

module.exports = { checkEmailDestination };
