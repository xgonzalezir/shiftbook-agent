#!/usr/bin/env node

/**
 * Guía para configurar BTP Destination para email
 */

console.log(`
🏗️ GUÍA DE CONFIGURACIÓN BTP DESTINATION PARA EMAIL
====================================================

El problema es que los emails tienen status "failed", lo que indica un problema 
de configuración SMTP en el BTP Destination.

📋 PASOS PARA REVISAR/CONFIGURAR:

1. 🌐 Acceder a BTP Cockpit:
   - URL: https://cockpit.us10.hana.ondemand.com/
   - Ir a tu subaccount: gbi-manu-dev

2. 🎯 Navegar a Destinations:
   - Menú: Connectivity > Destinations
   - Buscar: "shiftbook-email"

3. 🔧 Verificar configuración del destination "shiftbook-email":
   
   CONFIGURACIÓN REQUERIDA:
   ========================
   Name: shiftbook-email
   Type: HTTP (o MAIL si está disponible)
   URL: smtp://tu-servidor-smtp.com:587
   
   PROPIEDADES ADICIONALES:
   ========================
   mail.smtp.host = tu-servidor-smtp.com
   mail.smtp.port = 587
   mail.smtp.ssl.enable = false
   mail.smtp.starttls.enable = true
   mail.smtp.auth = true
   
   AUTENTICACIÓN:
   =============
   Authentication: BasicAuthentication
   User: tu-usuario-smtp@dominio.com
   Password: tu-contraseña-smtp

4. 🧪 SERVIDORES SMTP COMUNES:

   GMAIL:
   ------
   mail.smtp.host = smtp.gmail.com
   mail.smtp.port = 587
   mail.smtp.ssl.enable = false
   mail.smtp.starttls.enable = true
   User: tu-email@gmail.com
   Password: app-password (no tu contraseña normal)

   OUTLOOK/OFFICE365:
   ------------------
   mail.smtp.host = smtp-mail.outlook.com
   mail.smtp.port = 587
   mail.smtp.ssl.enable = false
   mail.smtp.starttls.enable = true
   User: tu-email@outlook.com
   Password: tu-contraseña

   SERVIDOR CORPORATIVO:
   --------------------
   mail.smtp.host = smtp.syntax.com (o el servidor de Syntax)
   mail.smtp.port = 587 (o 25, 465 según configuración)
   User: xavier.gonzalez@syntax.com
   Password: tu-contraseña-corporativa

5. 🔍 VERIFICAR LOGS EN BTP:
   - Ir a: Cloud Foundry > Spaces > dev > Applications
   - Seleccionar: shiftbooksrv
   - Ver: Logs
   - Buscar errores relacionados con SMTP

6. 🧪 PROBAR CONFIGURACIÓN:
   Después de configurar el destination, ejecutar:
   
   cd /Users/xgonzalez/Documents/GBI_CAP_Projects/shift-book
   node scripts/send-email-to-xavier.js

📧 EMAILS CONFIGURADOS ACTUALMENTE:
==================================
✅ xavier.gonzalez@syntax.com (TU EMAIL - agregado correctamente)
✅ qm.team@company.com
✅ quality.control@company.com

📊 ESTADO ACTUAL:
================
- Rate Limit: 9 emails restantes
- Categoría: Quality Control (1000)
- Destinatarios: 3 configurados
- Problema: Configuración SMTP en BTP destination

💡 NOTA IMPORTANTE:
==================
Una vez que configures el BTP destination correctamente, 
los emails deberían empezar a enviarse automáticamente.

Tu email ya está configurado en el sistema, solo falta 
la configuración SMTP en BTP.

🎯 PRÓXIMO PASO:
===============
1. Configura el BTP destination "shiftbook-email" con las credenciales SMTP correctas
2. Ejecuta nuevamente: node scripts/send-email-to-xavier.js
3. Revisa tu bandeja de entrada (y spam)

`);

console.log(
  "✅ Guía de configuración mostrada. Configura el BTP destination y prueba nuevamente."
);
