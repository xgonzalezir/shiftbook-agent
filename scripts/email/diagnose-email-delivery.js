#!/usr/bin/env node

/**
 * Email Delivery Diagnostic Script
 * Diagnostica problemas de entrega de email paso a paso
 */

const axios = require("axios");

// Ignore SSL certificate errors for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// XSUAA credentials
const XSUAA_CREDENTIALS = {
  clientid: "sb-shiftbook-srv-manu-dev-org-dev-v3!t459223",
  clientsecret:
    "b92f25eb-8d57-49e0-9776-63da97edbbb1$Vm4bwArc-VK2RPvi2eIYW6egQxC153r8oFayADyS8bU=",
  url: "https://gbi-manu-dev.authentication.us10.hana.ondemand.com",
};

const BASE_URL =
  "https://manu-dev-org-dev-shiftbooksrv.cfapps.us10-001.hana.ondemand.com";
const SERVICE_PATH = "/shiftbook/ShiftBookService";
const TEST_EMAIL = "xavier.gonzalez@syntax.com";

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

async function diagnoseEmailDelivery() {
  console.log("🔍 EMAIL DELIVERY DIAGNOSTIC");
  console.log("=".repeat(50));

  try {
    const token = await getAccessToken();

    // 1. Verificar una categoría existente con email habilitado
    console.log("\n🏷️ PASO 1: Buscar categorías con email habilitado");
    const categories = await makeRequest(
      "get",
      `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory?$filter=sendmail eq 1&$top=3`,
      null,
      token,
      "GET Categories with email enabled"
    );

    if (!categories?.value?.length) {
      console.log("❌ No se encontraron categorías con email habilitado");
      return;
    }

    const testCategory = categories.value[0];
    console.log(
      `\n📋 Usando categoría: ${testCategory.ID} - "${testCategory.default_desc}"`
    );

    // 2. Verificar destinatarios de email para esta categoría
    console.log("\n📧 PASO 2: Verificar destinatarios de email");
    const recipients = await makeRequest(
      "post",
      `${BASE_URL}${SERVICE_PATH}/getMailRecipients`,
      {
        category: testCategory.ID,
        werks: testCategory.werks,
      },
      token,
      "GET Mail Recipients for Category"
    );

    if (!recipients?.recipients || recipients.count === 0) {
      console.log("⚠️ No hay destinatarios configurados para esta categoría");

      // Agregar el email de prueba
      console.log("\n➕ PASO 2.1: Agregando email de prueba");
      await makeRequest(
        "post",
        `${BASE_URL}${SERVICE_PATH}/batchInsertMails`,
        {
          category: testCategory.ID,
          werks: testCategory.werks,
          mails: [{ mail_address: TEST_EMAIL }],
        },
        token,
        "ADD Test Email Address"
      );

      // Verificar nuevamente
      const newRecipients = await makeRequest(
        "post",
        `${BASE_URL}${SERVICE_PATH}/getMailRecipients`,
        {
          category: testCategory.ID,
          werks: testCategory.werks,
        },
        token,
        "VERIFY Mail Recipients After Adding"
      );

      if (!newRecipients?.recipients) {
        console.log("❌ Fallo al agregar destinatarios");
        return;
      }
    }

    // 3. Probar envío directo de email
    console.log("\n📤 PASO 3: Envío directo de email de prueba");
    const emailResult = await makeRequest(
      "post",
      `${BASE_URL}${SERVICE_PATH}/sendMailByCategory`,
      {
        category: testCategory.ID,
        werks: testCategory.werks,
        subject: `🧪 Email Diagnostic Test - ${new Date().toISOString()}`,
        message: `
Hola Xavier,

Este es un email de diagnóstico enviado para verificar la entrega de correos.

Detalles del test:
- Hora de envío: ${new Date().toLocaleString("es-ES")}
- Categoría: ${testCategory.default_desc}
- Category ID: ${testCategory.ID}
- Werks: ${testCategory.werks}
- Destinatario: ${TEST_EMAIL}

Si recibes este email, la funcionalidad está trabajando correctamente.

Saludos,
Sistema ShiftBook
        `,
      },
      token,
      "SEND Diagnostic Email"
    );

    // 4. Analizar resultado del envío
    console.log("\n📊 PASO 4: Análisis del resultado");
    if (emailResult) {
      console.log(`📧 Destinatarios: ${emailResult.recipients}`);
      console.log(`📊 Estado: ${emailResult.status}`);
      console.log(`🆔 Message ID: ${emailResult.messageId || "No disponible"}`);
      console.log(`⏰ Rate Limit Restante: ${emailResult.rateLimitRemaining}`);

      if (emailResult.status === "failed") {
        console.log("\n❌ PROBLEMA IDENTIFICADO: El email falló al enviarse");
        console.log("Posibles causas:");
        console.log("   1. Configuración SMTP incorrecta en BTP destination");
        console.log("   2. Credenciales de email incorrectas");
        console.log("   3. Servidor SMTP no disponible");
        console.log("   4. Problemas de red/firewall");
      } else if (emailResult.status === "sent") {
        console.log("\n✅ Email enviado exitosamente!");
        console.log(`📬 Revisa la bandeja de entrada de ${TEST_EMAIL}`);
      }
    }

    // 5. Verificar configuración del servicio de email
    console.log("\n🔧 PASO 5: Verificar configuración del servicio");
    const healthCheck = await makeRequest(
      "get",
      `${BASE_URL}/health`,
      null,
      token,
      "Health Check - Email Service Status"
    );

    if (healthCheck) {
      console.log("\n📈 Estado del servicio:");
      console.log(`   Emails enviados: ${healthCheck.emailsSent || 0}`);
      console.log(`   Uptime: ${healthCheck.uptime || "No disponible"}`);
      console.log(
        `   Memoria: ${healthCheck.memory?.heapUsed || "No disponible"}`
      );
    }

    // 6. Recomendaciones
    console.log("\n💡 RECOMENDACIONES:");
    console.log('   1. Verificar el BTP destination "shiftbook-email"');
    console.log("   2. Confirmar credenciales SMTP en BTP Cockpit");
    console.log("   3. Revisar logs de la aplicación en BTP");
    console.log("   4. Verificar que no haya spam filters bloqueando");
    console.log(`   5. Revisar bandeja de spam de ${TEST_EMAIL}`);
  } catch (error) {
    console.error("💥 Error durante el diagnóstico:", error.message);
  }
}

// Ejecutar diagnóstico
if (require.main === module) {
  diagnoseEmailDelivery();
}

module.exports = { diagnoseEmailDelivery };
