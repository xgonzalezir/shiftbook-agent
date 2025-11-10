#!/usr/bin/env node

/**
 * Script para revisar logs de Cloud Foundry y diagnosticar problemas de email
 */

console.log(`
🔍 GUÍA PARA REVISAR LOGS DE CLOUD FOUNDRY
=========================================

Para diagnosticar por qué los emails no están llegando, necesitamos revisar 
los logs de la aplicación en Cloud Foundry.

📋 MÉTODOS PARA ACCEDER A LOS LOGS:

1. 🌐 VÍA BTP COCKPIT (MÉTODO VISUAL):
   ====================================
   a) Ir a: https://cockpit.us10.hana.ondemand.com/
   b) Subaccount: gbi-manu-dev
   c) Spaces: Cloud Foundry > Spaces > dev
   d) Applications: shiftbooksrv
   e) Click en "Logs" en el menú lateral
   f) Ver logs en tiempo real

2. 💻 VÍA CF CLI (MÉTODO COMANDO):
   ===============================
   a) Instalar CF CLI si no lo tienes:
      - Mac: brew install cloudfoundry/tap/cf-cli@8
      - O descargar de: https://github.com/cloudfoundry/cli/releases
   
   b) Configurar CF CLI:
      cf api https://api.cf.us10.hana.ondemand.com
      cf login
      
   c) Ver logs en tiempo real:
      cf logs shiftbooksrv
      
   d) Ver logs recientes:
      cf logs shiftbooksrv --recent

3. 🎯 QUÉ BUSCAR EN LOS LOGS:
   ==========================
   Busca líneas que contengan:
   - "email" o "Email"
   - "SMTP" o "smtp"
   - "nodemailer"
   - "destination"
   - "failed" o "error"
   - "shiftbook-email"

4. 🚨 ERRORES COMUNES A BUSCAR:
   ============================
   - "SMTP connection failed"
   - "Authentication failed"
   - "Connection timeout"
   - "Destination not found"
   - "Invalid credentials"
   - "ECONNREFUSED"
   - "ENOTFOUND"

5. 📊 INFORMACIÓN ÚTIL EN LOGS:
   ============================
   - Stack traces de errores
   - Configuración SMTP cargada
   - Intentos de conexión
   - Respuestas del servidor SMTP
   - Estado del destination service

🎯 COMANDOS ESPECÍFICOS PARA DEBUGGEAR:

Después de hacer login con 'cf login', ejecuta estos comandos:

# Ver logs en tiempo real (mientras envías emails)
cf logs shiftbooksrv

# Ver logs recientes
cf logs shiftbooksrv --recent

# Ver logs filtrados por errores
cf logs shiftbooksrv --recent | grep -i error

# Ver logs filtrados por email
cf logs shiftbooksrv --recent | grep -i email

# Ver logs filtrados por SMTP
cf logs shiftbooksrv --recent | grep -i smtp

🔧 PASOS RECOMENDADOS:

1. Abrir una terminal nueva
2. Ejecutar: cf logs shiftbooksrv
3. En otra terminal, ejecutar el script de email:
   node scripts/send-email-to-xavier.js
4. Observar los logs en tiempo real para ver errores

💡 INFORMACIÓN DE LA APLICACIÓN:
===============================
- App Name: shiftbooksrv
- Space: dev
- Org: gbi-manu-dev
- Region: us10
- CF API: https://api.cf.us10.hana.ondemand.com

`);

// Crear un script para facilitar el acceso a logs
const fs = require("fs");
const path = require("path");

const cfLogScript = `#!/bin/bash

echo "🔍 Script para revisar logs de CF - ShiftBook"
echo "============================================="

# Verificar si CF CLI está instalado
if ! command -v cf &> /dev/null; then
    echo "❌ CF CLI no está instalado"
    echo "📥 Instalar con: brew install cloudfoundry/tap/cf-cli@8"
    echo "📥 O descargar de: https://github.com/cloudfoundry/cli/releases"
    exit 1
fi

echo "✅ CF CLI encontrado"

# Verificar si está logueado
if ! cf target &> /dev/null; then
    echo "🔐 No estás logueado en CF"
    echo "📋 Ejecuta estos comandos:"
    echo "   cf api https://api.cf.us10.hana.ondemand.com"
    echo "   cf login"
    echo ""
    echo "🔑 Usa tus credenciales de BTP"
    exit 1
fi

echo "✅ Autenticado en CF"
echo ""

# Mostrar información actual
echo "📊 Información actual:"
cf target

echo ""
echo "🎯 Opciones disponibles:"
echo "1. Ver logs en tiempo real (Ctrl+C para parar)"
echo "2. Ver logs recientes"
echo "3. Ver logs filtrados por errores"
echo "4. Ver logs filtrados por email"
echo "5. Ver logs filtrados por SMTP"
echo ""

read -p "Selecciona una opción (1-5): " option

case $option in
    1)
        echo "📡 Viendo logs en tiempo real..."
        echo "💡 Ejecuta el script de email en otra terminal para ver logs"
        cf logs shiftbooksrv
        ;;
    2)
        echo "📄 Logs recientes:"
        cf logs shiftbooksrv --recent
        ;;
    3)
        echo "🚨 Logs con errores:"
        cf logs shiftbooksrv --recent | grep -i error
        ;;
    4)
        echo "📧 Logs relacionados con email:"
        cf logs shiftbooksrv --recent | grep -i email
        ;;
    5)
        echo "📮 Logs relacionados con SMTP:"
        cf logs shiftbooksrv --recent | grep -i smtp
        ;;
    *)
        echo "❌ Opción inválida"
        ;;
esac
`;

// Guardar el script
const scriptPath = path.join(__dirname, "check-cf-logs.sh");
fs.writeFileSync(scriptPath, cfLogScript);
fs.chmodSync(scriptPath, "755");

console.log(`
✅ Script creado: ${scriptPath}

🚀 PARA USAR EL SCRIPT:
======================
cd /Users/xgonzalez/Documents/GBI_CAP_Projects/shift-book/scripts
./check-cf-logs.sh

📱 TAMBIÉN PUEDES USAR COMANDOS DIRECTOS:
========================================
cf api https://api.cf.us10.hana.ondemand.com
cf login
cf logs shiftbooksrv --recent | grep -i email

`);
