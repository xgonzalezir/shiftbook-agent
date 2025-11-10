# 🔧 Configuration Management con User-Provided Service

La aplicación Shift Book ahora utiliza un **User-Provided Service** en BTP para gestionar toda la configuración de manera centralizada y segura.

## 📋 ¿Qué ha cambiado?

### Antes (Variables de entorno)
- Variables dispersas en `.env`, `mta.yaml` y código
- Riesgo de exposición de credenciales
- Difícil gestión entre entornos
- Redeploy necesario para cambios

### Ahora (User-Provided Service)
- **✅ Configuración centralizada** en BTP Cockpit
- **✅ Credenciales seguras** (no en código)
- **✅ Cambios sin redeploy** (solo restart)
- **✅ Diferentes configs por entorno**

## 🚀 Configuración Inicial

### 1. **Nombre del User-Provided Service**
```
shiftbook-config
```

### 2. **Crear el servicio**
```bash
# Usar el script incluido
./scripts/manage-config-service.sh create

# O manualmente
cf create-user-provided-service shiftbook-config -p config.json
```

### 3. **JSON de configuración**
Ver archivo `config.json` (para producción) o `config-development.json` (para desarrollo).

## 📝 Configuración por Entornos

### Producción (`config.json`)
```json
{
  "NODE_ENV": "production",
  "EMAIL_SIMULATION_MODE": "false",
  "DMC_SIMULATION_MODE": "false",
  "EMAIL_FROM_ADDRESS": "noreply@yourcompany.com",
  "DMC_BASE_URL": "https://your-dmc-system.com/api/v1",
  "CORS_ALLOWED_ORIGINS": "https://your-app.cfapps.eu10.hana.ondemand.com"
}
```

### Desarrollo (`config-development.json`)
```json
{
  "NODE_ENV": "development",
  "EMAIL_SIMULATION_MODE": "true",
  "DMC_SIMULATION_MODE": "true",
  "EMAIL_FROM_ADDRESS": "dev-noreply@localhost",
  "DMC_BASE_URL": "http://localhost:8080/dmc/api"
}
```

## 🛠️ Scripts de Gestión

### Crear servicio
```bash
./scripts/manage-config-service.sh create
```

### Actualizar servicio
```bash
./scripts/manage-config-service.sh update
```

### Ver detalles del servicio
```bash
./scripts/manage-config-service.sh show
```

### Validar configuración
```bash
./scripts/manage-config-service.sh validate
```

### Eliminar servicio
```bash
./scripts/manage-config-service.sh delete
```

## 🔍 Cómo funciona la aplicación

### 1. **Prioridad de configuración**
1. User-Provided Service (`shiftbook-config`)
2. Variables de entorno (`.env`)
3. Valores por defecto

### 2. **Lectura de configuración**
```javascript
// La aplicación lee automáticamente desde:
const config = await configManager.init();

// Configuración específica
const emailConfig = await configManager.getEmailConfig();
const dmcConfig = await configManager.getDMCConfig();
```

### 3. **Logs de configuración**
Al iniciar, la aplicación muestra:
```
✅ Configuration loaded from User-Provided Service: shiftbook-config
📋 Configuration Summary: {
  "environment": "production",
  "emailSimulation": "false",
  "features": {...}
}
```

## 📊 Variables principales a configurar

### **Email**
- `EMAIL_FROM_ADDRESS`: Dirección de envío
- `EMAIL_FROM_NAME`: Nombre del remitente
- `EMAIL_SIMULATION_MODE`: `"true"` para desarrollo, `"false"` para producción

### **DMC Integration**
- `DMC_BASE_URL`: URL de tu sistema DMC
- `DMC_SIMULATION_MODE`: `"true"` para desarrollo, `"false"` para producción
- `DMC_TIMEOUT`: Timeout en milisegundos

### **Security**
- `CORS_ALLOWED_ORIGINS`: URLs permitidas para CORS
- `FEATURE_*`: Flags para habilitar/deshabilitar funcionalidades

## 🔄 Deployment Process

### 1. **Crear configuración**
```bash
# Editar config.json con tus valores
# Crear el User-Provided Service
./scripts/manage-config-service.sh create
```

### 2. **Deploy aplicación**
```bash
mbt build && cf deploy
```

### 3. **Verificar**
```bash
cf logs shiftbook-srv --recent
```

## 🔧 Troubleshooting

### La aplicación no encuentra el servicio
```bash
# Verificar que existe
cf services | grep shiftbook-config

# Verificar el binding
cf env shiftbook-srv | grep VCAP_SERVICES
```

### Cambiar configuración sin redeploy
```bash
# Actualizar el servicio
./scripts/manage-config-service.sh update

# Reiniciar la aplicación
cf restart shiftbook-srv
```

### Ver la configuración actual
```bash
./scripts/manage-config-service.sh show
```

## 🎯 Ventajas para Producción

- **🔐 Seguridad**: Credenciales no están en código
- **🚀 Flexibilidad**: Cambios rápidos sin redeploy
- **📋 Centralización**: Una sola fuente de verdad
- **🔄 Versionado**: Diferentes configs por entorno
- **📊 Auditoría**: BTP trackea todos los cambios

¡Tu aplicación está ahora lista para producción con gestión de configuración profesional! 🎉
