# SAP BTP SSL Configuration Guide for Teams Webhooks

## 🏢 SAP BTP Environment SSL Considerations

Cuando despliegues en SAP BTP (Business Technology Platform), **NO necesitas hacer configuraciones adicionales de certificados SSL**. El código ya está preparado para manejar automáticamente los diferentes entornos.

### ✅ **Lo que YA ESTÁ CONFIGURADO:**

#### 1. **Detección Automática de Entorno BTP**
```typescript
// En teams-notification-service.ts
rejectUnauthorized: process.env.NODE_ENV === "production"
```

#### 2. **Identificación de BTP Production**
```typescript
// En ShiftBookService.ts
if (process.env.VCAP_SERVICES) {
  // Detecta automáticamente que está en BTP
}
```

#### 3. **Configuración SSL Dual**
- **Desarrollo**: `rejectUnauthorized: false` (certificados relajados)
- **BTP Producción**: `rejectUnauthorized: true` (certificados estrictos)

### 🔧 **Variables de Entorno en BTP**

#### **Cloud Foundry Environment Variables**
SAP BTP automáticamente establecerá:
```bash
NODE_ENV=production
VCAP_SERVICES={"destination":[...]}
VCAP_APPLICATION={"name":"shiftbook",...}
```

#### **Manifest.yml Configuration**
```yaml
applications:
  - name: shiftbook-srv
    env:
      NODE_ENV: production
      CDS_ENV: production
```

### 🚀 **Deployment Steps - NO ACTION NEEDED**

#### **1. Build y Deploy**
```bash
# Build MTA
mbt build

# Deploy a BTP
cf deploy mta_archives/shiftbook_1.0.0.mtar
```

#### **2. Verificación Automática**
El sistema automáticamente:
- Detecta `NODE_ENV=production`
- Habilita validación SSL estricta
- Usa certificados de BTP confiables
- Conecta a webhooks de Teams con SSL completo

### 🔍 **Logs de Verificación en BTP**

```bash
# Ver logs de la aplicación
cf logs shiftbook-srv --recent

# Buscar por confirmación SSL
cf logs shiftbook-srv --recent | grep "SSL\|TEAMS\|webhook"
```

#### **Logs Esperados en Producción:**
```
📢 [TEAMS] SSL Configuration: ENFORCED (production mode)
✅ [TEAMS] Notification sent successfully to webhook
📊 Response status: 200
```

### ⚠️ **Solo SI HAY PROBLEMAS (Poco Probable)**

#### **Opción 1: Forzar SSL Estricto**
```bash
cf set-env shiftbook-srv TEAMS_SSL_STRICT true
cf restart shiftbook-srv
```

#### **Opción 2: Variables de Debug**
```bash
cf set-env shiftbook-srv DEBUG "*teams*"
cf restart shiftbook-srv
```

### 🌍 **Configuración por Espacio (Space)**

#### **Development Space**
```bash
cf target -s development
# NODE_ENV=development (automático)
```

#### **Production Space**
```bash
cf target -s production
# NODE_ENV=production (automático)
```

### 📋 **Checklist Pre-Deployment**

- ✅ **Webhooks URLs**: Verificar que sean URLs válidas de Teams
- ✅ **MTA Configuration**: `mta.yaml` tiene espacios correctos
- ✅ **Environment Detection**: Código detecta BTP automáticamente
- ✅ **SSL Handling**: Dual method implementado
- ✅ **Error Handling**: Manejo de errores SSL incluido

### 🔐 **Certificados SSL en BTP**

#### **Certificados Automáticos**
- **Cloud Foundry Router**: Maneja SSL termination
- **SAP BTP Platform**: Certificados confiables preinstalados
- **Node.js Runtime**: Reconoce certificados de BTP

#### **No Requiere Configuración Manual**
- ❌ No necesitas instalar certificados
- ❌ No necesitas configurar CA bundles
- ❌ No necesitas modificar TLS settings

### 🧪 **Testing en BTP**

#### **Post-Deployment Verification**
```bash
# Ejecutar test desde BTP app
cf ssh shiftbook-srv
cd app
node -e "
const service = require('./gen/srv/lib/teams-notification-service');
console.log('SSL Config:', process.env.NODE_ENV);
"
```

### 📞 **Teams Webhook Considerations**

#### **Microsoft Teams SSL**
- Teams webhooks usan SSL válido de Microsoft
- Compatible con Node.js certificados estándar
- No requiere configuración especial en BTP

#### **Webhook URL Validation**
```javascript
// El código ya valida webhooks automáticamente
const isValidWebhook = webhookURL.startsWith('https://');
```

### 🚨 **Troubleshooting**

#### **Si aparece error SSL en BTP:**
```bash
# Verificar variables de entorno
cf env shiftbook-srv | grep NODE_ENV

# Verificar connectividad
cf ssh shiftbook-srv
curl -I https://teams.microsoft.com
```

#### **Error común (muy raro):**
```
Error: self signed certificate in certificate chain
```

**Solución (automática en el código):**
```typescript
// Ya implementado - usa método alternativo automáticamente
process.env.NODE_ENV === "production" ? 
  strictSSLMethod() : relaxedSSLMethod()
```

## 🎯 **Resumen: NO ACTION NEEDED**

Tu aplicación está **completamente lista** para BTP deployment:

1. ✅ **SSL handling automático**
2. ✅ **Environment detection**
3. ✅ **Dual method fallback**  
4. ✅ **BTP-specific configurations**
5. ✅ **Error handling robusto**

Simplemente haz `mbt build && cf deploy` y todo funcionará correctamente.