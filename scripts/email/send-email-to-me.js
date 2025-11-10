#!/usr/bin/env node

/**
 * Script para agregar email de Xavier y enviar email de prueba directo
 */

const axios = require("axios");

// Ignore SSL certificate errors for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// XSUAA credentials - Updated 2025-10-07
const XSUAA_CREDENTIALS = {
  clientid: "sb-shiftbook-srv-manu-dev-org-dev-v3!t459223",
  clientsecret:
    "a1a10f14-92c9-41fe-bd36-123ff98fccd1$4giMQGH1YFFO5dSozIXPfx_aDsvR2NpTPk-z299jqiE=",
  url: "https://gbi-manu-dev.authentication.us10.hana.ondemand.com",
};

const BASE_URL =
  "https://manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com";
const SERVICE_PATH = "/shiftbook/ShiftBookService";
const XAVIER_EMAIL = "xavier.gonzalez@syntax.com";

async function getAccessToken() {
  try {
    console.log("🔐 Getting access token from XSUAA...");

    const tokenUrl = `${XSUAA_CREDENTIALS.url}/oauth/token`;
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: XSUAA_CREDENTIALS.clientid,
      client_secret: XSUAA_CREDENTIALS.clientsecret,
    });

    const response = await axios.post(tokenUrl, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const token = response.data.access_token;
    console.log("✅ Access token obtained successfully!");
    return token;
  } catch (error) {
    console.error(
      "❌ Error getting access token:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function makeRequest(method, url, data, token, description) {
  try {
    console.log(`\n📡 ${description}`);
    console.log(`   Method: ${method.toUpperCase()} | URL: ${url}`);

    const config = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };

    if (data && (method === "post" || method === "patch" || method === "put")) {
      config.data = data;
      console.log(`   Data: ${JSON.stringify(data, null, 2)}`);
    }

    const response = await axios(config);
    console.log(`✅ Success (${response.status})`);

    if (response.data) {
      console.log(`📄 Response:`, JSON.stringify(response.data, null, 2));
    }

    return response.data;
  } catch (error) {
    console.error(
      `❌ Failed: ${error.response?.status} ${error.response?.statusText}`
    );
    if (error.response?.data) {
      console.error(
        `📄 Error details:`,
        JSON.stringify(error.response.data, null, 2)
      );
    }
    return null;
  }
}

async function sendEmailToXavier() {
  console.log("📧 DIRECT EMAIL SEND TO XAVIER");
  console.log("=".repeat(50));

  try {
    const token = await getAccessToken();

    // 1. Buscar la primera categoría disponible (cualquiera)
    console.log("\n🏷️ STEP 1: Search for first available category");
    const categories = await makeRequest(
      "get",
      `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory?$top=1`,
      null,
      token,
      "GET First Available Category"
    );

    if (!categories?.value?.length) {
      console.log("❌ No categories found");
      return;
    }

    const testCategory = categories.value[0];
    console.log(
      `\n📋 Using category: ${testCategory.ID} (Werks: ${testCategory.werks})`
    );

    // 2. Agregar email de Xavier a esta categoría
    console.log("\n➕ Add email");
    const addEmailResult = await makeRequest(
      "post",
      `${BASE_URL}${SERVICE_PATH}/batchInsertMails`,
      {
        category: testCategory.ID,
        werks: testCategory.werks,
        mails: [{ mail_address: XAVIER_EMAIL }],
      },
      token,
      "ADD Xavier Email to Category"
    );

    if (!addEmailResult) {
      console.log("Email already exists");
    }

    // 3. Verificar que se agregó correctamente
    console.log("\n🔍 STEP 3: Verify recipients");
    const recipients = await makeRequest(
      "post",
      `${BASE_URL}${SERVICE_PATH}/getMailRecipients`,
      {
        category: testCategory.ID,
        werks: testCategory.werks,
      },
      token,
      "VERIFY Mail Recipients"
    );

    console.log(`\n📧 Current recipients: ${recipients?.recipients || "None"}`);
    console.log(`📊 Total recipients: ${recipients?.count || 0}`);

    // 4. Enviar email de prueba
    console.log("\n📤 STEP 4: Send test email to Xavier");
    const emailResult = await makeRequest(
      "post",
      `${BASE_URL}${SERVICE_PATH}/sendMailByCategory`,
      {
        category: testCategory.ID,
        werks: testCategory.werks,
        subject: `🚨 URGENT TEST - ShiftBook Email for Xavier - ${new Date().toLocaleString(
          "en-US"
        )}`,
        message: `
Hello Xavier!

This is a DIRECT test email from the ShiftBook system.

📅 Date and time: ${new Date().toLocaleString("en-US")}
🏭 Category ID: ${testCategory.ID}
🔢 Werks: ${testCategory.werks}
📧 Your email: ${XAVIER_EMAIL}

🎯 Purpose: Validate that email delivery works correctly.

✅ If you receive this email, it means:
  - XSUAA authentication works
  - The email service is operational
  - Your address is configured correctly
  - The BTP destination is working

❌ If you DO NOT receive this email, check:
  - SMTP configuration in BTP destination "shiftbook-email"
  - Email server credentials
  - Spam/firewall filters
  - Application logs in BTP

--
ShiftBook System
Environment: Production
URL: ${BASE_URL}
      `,
      },
      token,
      "SEND Test Email to Xavier"
    );

    // 5. Analizar resultado
    console.log("\n📊 STEP 5: Analyze send result");
    if (emailResult) {
      console.log(`\n📧 Target recipients: ${emailResult.recipients}`);
      console.log(`📊 Send status: ${emailResult.status}`);
      console.log(`🆔 Message ID: ${emailResult.messageId || "Not available"}`);
      console.log(`⏰ Rate Limit Remaining: ${emailResult.rateLimitRemaining}`);

      if (emailResult.status === "failed") {
        console.log("\n❌ PROBLEM!: The email failed to send");
        console.log("\n🔧 REQUIRED ACTIONS:");
        console.log(
          '   1. 🏗️ Check BTP destination "shiftbook-email" in BTP Cockpit'
        );
        console.log("   2. 🔑 Confirm correct SMTP credentials");
        console.log(
          "   3. 🌐 Check network connectivity from BTP to SMTP server"
        );
        console.log("   4. 📋 Review detailed logs in BTP Application Logs");
        console.log("   5. 🧪 Test SMTP configuration with external tools");
      } else if (emailResult.status === "sent") {
        console.log("\n✅ SUCCESS!: Email sent successfully");
        console.log(`📬 Check your inbox: ${XAVIER_EMAIL}`);
        console.log("📱 Also check your spam/junk folder");
        console.log("⏰ The email may take a few minutes to arrive");
      } else {
        console.log(`\n⚠️ Unknown status: ${emailResult.status}`);
      }
    } else {
      console.log("\n❌ No response received from email service");
    }

    // 6. Crear una entrada de log que debería disparar el email automáticamente
    console.log("\n📝 STEP 6: Create log entry to trigger automatic email");
    const logEntry = await makeRequest(
      "post",
      `${BASE_URL}${SERVICE_PATH}/addShiftBookEntry`,
      {
        werks: testCategory.werks,
        shoporder: "TEST123456",
        stepid: "0010",
        split: "001",
        workcenter: "WC_TEST_001",
        user_id: "xavier.gonzalez@syntax.com",
        category: testCategory.ID,
        subject: "🧪 Automatic email test",
        message: `This log entry was created automatically to trigger an email to Xavier. Created on ${new Date().toLocaleString(
          "en-US"
        )}`,
      },
      token,
      "CREATE Log Entry to Trigger Automatic Email"
    );

    if (logEntry) {
      console.log(
        "\n✅ Log entry created - this should trigger an automatic email"
      );
    }
  } catch (error) {
    console.error("💥 Error during process:", error.message);
  }
}

// Execute send
if (require.main === module) {
  sendEmailToXavier();
}

module.exports = { sendEmailToXavier };
