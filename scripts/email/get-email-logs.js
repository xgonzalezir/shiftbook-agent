#!/usr/bin/env node

/**
 * Script para obtener logs específicos de email de la aplicación
 */

const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

async function checkCFLogsForEmail() {
  console.log("🔍 VERIFICANDO LOGS DE EMAIL EN CLOUD FOUNDRY");
  console.log("=".repeat(50));

  try {
    // Verificar si estamos logueados
    console.log("🔐 Verificando autenticación...");
    const { stdout: targetOutput } = await execPromise("cf target");
    console.log("✅ Autenticado en CF");
    console.log(targetOutput);
  } catch (error) {
    console.log("❌ No estás logueado en CF");
    console.log("\n🔑 Para hacer login, ejecuta:");
    console.log("cf login");
    console.log("\n📋 Usa tus credenciales de BTP");
    return;
  }

  try {
    console.log("\n📄 Obteniendo logs recientes de la aplicación...");
    const { stdout: logs } = await execPromise("cf logs shiftbooksrv --recent");

    // Filtrar logs relacionados con email
    const emailLogs = logs
      .split("\n")
      .filter(
        (line) =>
          line.toLowerCase().includes("email") ||
          line.toLowerCase().includes("smtp") ||
          line.toLowerCase().includes("nodemailer") ||
          line.toLowerCase().includes("destination") ||
          line.toLowerCase().includes("shiftbook-email") ||
          line.toLowerCase().includes("mail")
      );

    console.log("\n📧 LOGS RELACIONADOS CON EMAIL:");
    console.log("=".repeat(40));

    if (emailLogs.length > 0) {
      emailLogs.forEach((log) => console.log(log));
    } else {
      console.log("ℹ️ No se encontraron logs específicos de email");
    }

    // Filtrar logs de errores
    const errorLogs = logs
      .split("\n")
      .filter(
        (line) =>
          line.toLowerCase().includes("error") ||
          line.toLowerCase().includes("failed") ||
          line.toLowerCase().includes("exception")
      );

    console.log("\n🚨 LOGS DE ERRORES:");
    console.log("=".repeat(25));

    if (errorLogs.length > 0) {
      errorLogs.slice(-10).forEach((log) => console.log(log)); // Últimos 10 errores
    } else {
      console.log("✅ No se encontraron errores recientes");
    }

    // Buscar logs relacionados con el destination service
    const destinationLogs = logs
      .split("\n")
      .filter(
        (line) =>
          line.toLowerCase().includes("destination") ||
          line.toLowerCase().includes("connectivity")
      );

    console.log("\n🎯 LOGS DEL DESTINATION SERVICE:");
    console.log("=".repeat(35));

    if (destinationLogs.length > 0) {
      destinationLogs.forEach((log) => console.log(log));
    } else {
      console.log("ℹ️ No se encontraron logs del destination service");
    }

    console.log("\n💡 PARA VER LOGS EN TIEMPO REAL:");
    console.log("Ejecuta en otra terminal: cf logs shiftbooksrv");
    console.log("Luego ejecuta: node scripts/send-email-to-xavier.js");
  } catch (error) {
    console.error("❌ Error al obtener logs:", error.message);
    console.log("\n🔧 Verifica que:");
    console.log("1. Estés logueado: cf login");
    console.log("2. Tengas acceso a la aplicación shiftbooksrv");
    console.log("3. Estés en el space correcto");
  }
}

// Función para obtener logs en tiempo real
async function startRealtimeLogs() {
  console.log("📡 INICIANDO LOGS EN TIEMPO REAL...");
  console.log("Presiona Ctrl+C para parar");
  console.log("=".repeat(40));

  const child = exec("cf logs shiftbooksrv");

  child.stdout.on("data", (data) => {
    // Filtrar y resaltar logs importantes
    const lines = data.toString().split("\n");
    lines.forEach((line) => {
      if (
        line.toLowerCase().includes("email") ||
        line.toLowerCase().includes("smtp") ||
        line.toLowerCase().includes("error") ||
        line.toLowerCase().includes("failed")
      ) {
        console.log("🎯 " + line);
      } else if (line.trim()) {
        console.log("   " + line);
      }
    });
  });

  child.stderr.on("data", (data) => {
    console.error("❌ Error:", data.toString());
  });

  child.on("close", (code) => {
    console.log(`\n📊 Logs terminados con código: ${code}`);
  });
}

// Ejecutar función basada en argumentos
const args = process.argv.slice(2);

if (args.includes("--realtime") || args.includes("-r")) {
  startRealtimeLogs();
} else {
  checkCFLogsForEmail();
}

module.exports = { checkCFLogsForEmail, startRealtimeLogs };
