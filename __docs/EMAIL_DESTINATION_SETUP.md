# Email Configuration with SAP BTP Destinations

## Overview
Este documento explica cómo configurar el servicio de email usando **Destinations en SAP BTP** en lugar de variables de entorno directas.

## ¿Por qué usar Destinations?

### ✅ **Ventajas de BTP Destinations:**
- **Seguridad**: Credenciales encriptadas y gestionadas por BTP
- **Centralización**: Configuración en un solo lugar del Cockpit
- **Flexibilidad**: Fácil cambio entre entornos sin redeployment
- **Trazabilidad**: Logs y auditoría integrados
- **Rotación de credenciales**: Sin impacto en la aplicación

### ❌ **Problemas de variables de entorno:**
- Credenciales en texto plano
- Difícil gestión entre entornos
- Riesgo de exposición en logs
- Rotación manual compleja

## Configuración en SAP BTP Cockpit

### 1. **Crear Destination para Email**

1. Ir a **BTP Cockpit** → **Connectivity** → **Destinations**
2. Hacer clic en **"New Destination"**
3. Configurar con estos valores:

```
Name: email-service
Type: HTTP
URL: smtp://your-smtp-server.com:587
Authentication: BasicAuthentication
User: your-email@company.com
Password: your-app-password
```

### 2. **Propiedades adicionales**

Agregar estas propiedades adicionales:

```
TrustAll: true
mail.smtp.auth: true
mail.smtp.starttls.enable: true
mail.smtp.ssl.protocols: TLSv1.2
```

### 3. **Configuración para diferentes proveedores**

#### **Gmail/Google Workspace:**
```
URL: smtp://smtp.gmail.com:587
Authentication: BasicAuthentication
User: your-email@gmail.com
Password: your-app-password
Properties:
  mail.smtp.auth: true
  mail.smtp.starttls.enable: true
```

#### **Microsoft 365/Outlook:**
```
URL: smtp://smtp.office365.com:587
Authentication: BasicAuthentication
User: your-email@company.com
Password: your-app-password
Properties:
  mail.smtp.auth: true
  mail.smtp.starttls.enable: true
```

#### **SendGrid:**
```
URL: smtp://smtp.sendgrid.net:587
Authentication: BasicAuthentication
User: apikey
Password: your-sendgrid-api-key
Properties:
  mail.smtp.auth: true
  mail.smtp.starttls.enable: true
```

## Configuración en la aplicación

### 1. **Variables de entorno necesarias**

Solo necesitas estas variables en `.env`:

```bash
# Email configuration via BTP Destination
EMAIL_DESTINATION_NAME=email-service
EMAIL_FROM_ADDRESS=noreply@company.com
EMAIL_FROM_NAME=Shift Book System
EMAIL_SIMULATION_MODE=false
```

### 2. **Implementación en el código**

El servicio ya está configurado para usar destinations:

```typescript
// Helper function to get email configuration from BTP Destination
const getEmailConfig = async () => {
  try {
    const destinationName = process.env.EMAIL_DESTINATION_NAME || 'email-service';
    
    // Production: Use @sap-cloud-sdk/connectivity
    const { getDestination } = require('@sap-cloud-sdk/connectivity');
    const destination = await getDestination(destinationName);
    
    return {
      type: 'smtp',
      host: destination.url.hostname,
      port: destination.url.port,
      user: destination.username,
      password: destination.password,
      // ... additional config from destination properties
    };
  } catch (error) {
    // Fallback to simulation mode
    return { type: 'simulation' };
  }
};
```

## Instalación de dependencias

Para usar destinations en producción, instala el SDK:

```bash
npm install @sap-cloud-sdk/connectivity @sap-cloud-sdk/http-client
```

## Configuración por entornos

### **Desarrollo Local**
```bash
EMAIL_SIMULATION_MODE=true
# No destination needed - usa simulación
```

### **SAP BTP (Producción)**
```bash
EMAIL_DESTINATION_NAME=email-service
EMAIL_SIMULATION_MODE=false
# Destination configurado en BTP Cockpit
```

## Testing

### **Test local con simulación:**
```bash
npm test
# Logs: "EMAIL SIMULATION - Category: X, Recipients: ..."
```

### **Test con destination real:**
1. Configurar destination en BTP
2. Bindear aplicación al destination service
3. Ejecutar tests con `EMAIL_SIMULATION_MODE=false`

## Monitoreo y Logs

### **BTP Cockpit - Connectivity Logs:**
- Ir a **Connectivity** → **Destinations** → **email-service**
- Ver **Connection Tests** y **Usage Logs**

### **Application Logs:**
```typescript
console.log('Email sent via destination:', {
  destination: destinationName,
  recipients: recipients.length,
  status: result.status
});
```

## Seguridad

### **Buenas prácticas:**

1. ✅ **Usar App Passwords** en lugar de credenciales principales
2. ✅ **Habilitar TLS/SSL** siempre
3. ✅ **Rotar credenciales** regularmente
4. ✅ **Monitorear uso** desde BTP Cockpit
5. ✅ **Usar diferentes destinations** por entorno

### **Configuración de seguridad:**
```
TrustAll: false  # Solo en desarrollo
mail.smtp.ssl.enable: true
mail.smtp.ssl.protocols: TLSv1.2
```

## Troubleshooting

### **Errores comunes:**

1. **"Destination not found"**
   - Verificar nombre de destination en BTP Cockpit
   - Verificar que la app está bindeada al destination service

2. **"Authentication failed"**
   - Verificar credenciales en destination
   - Verificar que se usa App Password si es necesario

3. **"Connection timeout"**
   - Verificar URL y puerto
   - Verificar conectividad de red

### **Debug mode:**
```bash
DEBUG=connectivity npm start
# Mostrará logs detallados de destinations
```

## Próximos pasos

1. **Configurar destination** en BTP Cockpit
2. **Instalar SAP Cloud SDK** para connectivity
3. **Actualizar implementación** para usar destination real
4. **Configurar monitoring** y alertas
5. **Documentar procedimientos** para rotación de credenciales

## Referencias

- [SAP BTP Destinations Guide](https://help.sap.com/docs/CP_CONNECTIVITY/cca91383641e40ffbe03bdc78f00f681/72696d6d06c0490394ac3069da600278.html)
- [SAP Cloud SDK Connectivity](https://sap.github.io/cloud-sdk/docs/js/features/connectivity/destinations)
- [Email Security Best Practices](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/e129aa3c5a7c4c5bb8b7aadc6b5b5e51.html)
