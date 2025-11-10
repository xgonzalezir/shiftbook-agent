# Scripts de Diagnóstico de Destinos BTP

Herramientas para validar y diagnosticar la configuración de destinos en SAP BTP.

## Scripts Disponibles

### 📧 check-email-destination.sh
Script wrapper para verificar específicamente el destino de email.

```bash
bash scripts/check-destination/check-email-destination.sh
```

**Uso:** Verificación completa del destino `shiftbook-email` con validación de CF login y servicios vinculados.

---

### 📡 check-destination-btp.js
Verifica destinos usando el SDK de SAP Cloud.

```bash
node scripts/check-destination/check-destination-btp.js
```

**Uso:** Diagnosticar si los destinos están correctamente configurados y accesibles desde la aplicación.

---

### 🔧 check-destination-config.js
Se autentica directamente con el servicio de destinos usando OAuth2.

```bash
node scripts/check-destination/check-destination-config.js
```

**Uso:** Obtener detalles completos de la configuración del destino `shiftbook-backend`.

---

### 📋 check-destinations.js
Lista todos los destinos disponibles y sus propiedades.

```bash
node scripts/check-destination/check-destinations.js
```

**Uso:** Ver todos los destinos configurados (email-service, shiftbook-email, etc.).

---

### 📜 list-destinations.js
Lista todos los destinos en BTP usando credenciales de VCAP_SERVICES.

```bash
node scripts/check-destination/list-destinations.js
```

**Uso:** Obtener una lista completa de todos los destinos disponibles en el entorno BTP. Usa HTTPS nativo en vez del SDK.

---

### 🔑 check-destination-service-key.js
Verifica la configuración usando una service key directa.

```bash
node scripts/check-destination/check-destination-service-key.js
```

**Uso:** Cuando necesitas validar credenciales específicas del servicio de destinos.

---

### 🛠️ check-destination-setup.sh
Script bash que muestra la configuración requerida para el destino backend.

```bash
bash scripts/check-destination/check-destination-setup.sh
```

**Uso:** Guía de referencia para configurar manualmente el destino `shiftbook-backend`.

---

## Cuándo Usar Estos Scripts

- ✅ **Durante setup inicial** del proyecto en un nuevo entorno
- 🐛 **Debugging** cuando los emails no se envían
- 🔍 **Validación** después de cambios en BTP Cockpit
- 📊 **Diagnóstico** de problemas de autenticación OAuth2

## Requisitos

- Estar autenticado en Cloud Foundry: `cf login`
- Tener los servicios de destinos vinculados a la aplicación
- Dependencias instaladas: `npm install`

## Notas

⚠️ Estos scripts contienen **credenciales sensibles** en algunos casos. No commitear cambios que expongan secrets.
