# 🔧 User-Provided Service Configuration for Shift Book

## Nombre del User-Provided Service
```
shiftbook-config
```

## Comando para crear el User-Provided Service

```bash
cf create-user-provided-service shiftbook-config -p config.json
```

## Archivo JSON de configuración (`config.json`) - SIMPLIFICADO

```json
{
  "EMAIL_FROM_ADDRESS": "noreply@yourcompany.com",
  "EMAIL_FROM_NAME": "Shift Book System",
  "EMAIL_SIMULATION_MODE": "false",
  
  "DMC_BASE_URL": "https://your-dmc-system.com/api/v1",
  "DMC_SIMULATION_MODE": "false",
  
  "CORS_ALLOWED_ORIGINS": "https://your-app-domain.cfapps.eu10.hana.ondemand.com"
}
```

> ⚡ **Nota**: Solo incluimos las variables específicas de tu entorno. Las demás usan valores por defecto seguros.

## Pasos para configurar:

### 1. Crear el archivo JSON
Crea un archivo llamado `config.json` con el contenido anterior y ajusta solo estos valores según tu entorno:

**Obligatorios para producción:**
- `EMAIL_FROM_ADDRESS`: Tu dirección de email corporativa
- `DMC_BASE_URL`: URL de tu sistema DMC  
- `CORS_ALLOWED_ORIGINS`: URL de tu aplicación en BTP

**Opcionales (tienen defaults seguros):**
- `EMAIL_FROM_NAME`: Nombre del remitente (default: "Shift Book System")
- `EMAIL_SIMULATION_MODE`: false para envío real, true para simulación
- `DMC_SIMULATION_MODE`: false para integración real, true para simulación

**Variables omitidas (usan defaults):**
- `NODE_ENV`, `PORT`, `CDS_ENV`: Configurados automáticamente por BTP
- `EMAIL_DESTINATION_NAME`, `DMC_DESTINATION_NAME`: Usan nombres estándar
- `DMC_TIMEOUT`, `DMC_VALIDATION_ENABLED`: Valores por defecto optimizados
- `FEATURE_*`: Funcionalidades habilitadas por defecto
- `HTTP_CACHE_*`, `DB_POOL_*`: Configuración de rendimiento optimizada

### 2. Crear el User-Provided Service
```bash
cf create-user-provided-service shiftbook-config -p config.json
```

### 3. Verificar la creación
```bash
cf services
```
Deberías ver `shiftbook-config` en la lista de servicios.

### 4. Ver la configuración
```bash
cf service shiftbook-config
```

### 5. Actualizar la configuración (si es necesario)
```bash
cf update-user-provided-service shiftbook-config -p config-updated.json
```

### 6. Bindear a la aplicación
El binding se hace automáticamente durante el deploy con `mbt build && cf deploy` ya que está configurado en el `mta.yaml`.

## Ventajas de usar User-Provided Service:

✅ **Centralización**: Toda la configuración en un solo lugar
✅ **Seguridad**: No hay variables de entorno en código o logs
✅ **Flexibilidad**: Cambios sin redeploy de la aplicación
✅ **Versionado**: Puedes mantener diferentes configs para diferentes entornos
✅ **Auditoría**: BTP mantiene logs de cambios de configuración

## Configuración por entorno:

### Desarrollo Local
La aplicación usará las variables de entorno del `.env` como fallback si no encuentra el User-Provided Service.

### BTP (Producción)
La aplicación primero intentará leer desde `shiftbook-config` y luego fallback a variables de entorno.

## 🏗️ Configuraciones por Entorno

### **Producción** (`config.json`):
```json
{
  "EMAIL_FROM_ADDRESS": "noreply@yourcompany.com",
  "EMAIL_FROM_NAME": "Shift Book System",
  "EMAIL_SIMULATION_MODE": "false",
  
  "DMC_BASE_URL": "https://your-dmc-system.com/api/v1",
  "DMC_SIMULATION_MODE": "false",
  
  "CORS_ALLOWED_ORIGINS": "https://your-app-domain.cfapps.eu10.hana.ondemand.com"
}
```

### **Desarrollo** (`config-development.json`):
```json
{
  "NODE_ENV": "development",
  "LOG_LEVEL": "debug",
  
  "EMAIL_FROM_ADDRESS": "dev-noreply@localhost",
  "EMAIL_FROM_NAME": "Shift Book Dev System", 
  "EMAIL_SIMULATION_MODE": "true",
  
  "DMC_BASE_URL": "http://localhost:8080/dmc/api",
  "DMC_SIMULATION_MODE": "true",
  
  "CORS_ALLOWED_ORIGINS": "http://localhost:3000,http://localhost:8080,http://localhost:4004",
  
  "FEATURE_DEBUG_MODE": "true"
}
```

### **Staging/Testing** (opcional):
```json
{
  "EMAIL_FROM_ADDRESS": "staging-noreply@yourcompany.com",
  "EMAIL_SIMULATION_MODE": "true",
  
  "DMC_BASE_URL": "https://staging-dmc.yourcompany.com/api/v1",
  "DMC_SIMULATION_MODE": "false",
  
  "CORS_ALLOWED_ORIGINS": "https://staging-shiftbook.cfapps.eu10.hana.ondemand.com"
}
```

## 📋 Variables y Defaults

### ✅ **Variables en User-Provided Service (solo las necesarias):**
- `EMAIL_FROM_ADDRESS` - Email del remitente
- `EMAIL_FROM_NAME` - Nombre del remitente
- `EMAIL_SIMULATION_MODE` - true/false para simulación
- `DMC_BASE_URL` - URL del sistema DMC
- `DMC_SIMULATION_MODE` - true/false para simulación DMC
- `CORS_ALLOWED_ORIGINS` - Dominios permitidos
- `NODE_ENV` - Solo para desarrollo/debug
- `LOG_LEVEL` - Solo para desarrollo/debug  
- `FEATURE_DEBUG_MODE` - Solo para desarrollo

### 🔧 **Variables con defaults seguros (no necesitas configurar):**
- `PORT` → "8080" (configurado por BTP)
- `CDS_ENV` → "production" (automático por BTP)
- `EMAIL_DESTINATION_NAME` → "email-service"
- `DMC_DESTINATION_NAME` → "dmc-service"
- `DMC_TIMEOUT` → "30000"
- `DMC_VALIDATION_ENABLED` → "true"
- `SAP_DESTINATION_NAME` → "sap-backend"
- `DEFAULT_LANGUAGE` → "en"
- `SUPPORTED_LANGUAGES` → "en,es,de"
- `SERVICE_NAMESPACE` → "syntax.gbi.sap.dme.plugins.shiftbook"
- `CORS_ALLOWED_METHODS` → "GET,POST,PUT,DELETE,OPTIONS"
- `FEATURE_EMAIL_ENABLED` → "true"
- `FEATURE_DMC_INTEGRATION` → "true"
- `HTTP_CACHE_*`, `DB_POOL_*` → Valores optimizados

### 🎯 **Resultado**: 
- **Antes**: 25+ variables de configuración
- **Ahora**: 3-6 variables esenciales según entorno
- **Ventaja**: Configuración más simple y menos propensa a errores

## Testing
Después del deploy, puedes verificar que la configuración se lee correctamente revisando los logs:

```bash
cf logs shiftbook-srv --recent
```

Deberías ver:
```
✅ Configuration loaded from User-Provided Service: shiftbook-config
📋 Configuration Summary: {...}
```
