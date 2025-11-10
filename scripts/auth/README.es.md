# Scripts de Autenticación

Scripts de utilidad para autenticación OAuth2, generación de tokens JWT y análisis de tokens.

## Scripts Disponibles

### 🔑 generate-tokens.js
Genera tokens JWT bearer válidos para todos los scopes definidos en `xs-security.json`.

```bash
node scripts/auth/generate-tokens.js
# o
node scripts/auth/generate-tokens.js all
```

**Propósito:** Crear tokens JWT de prueba para testing local sin necesidad de autenticación XSUAA real.

**Qué hace:**
- Lee los scopes de `xs-security.json`
- Genera un token JWT válido para cada scope (admin, operator, etc.)
- Guarda los tokens en `bearer-tokens.json` en el mismo directorio
- Útil para probar endpoints de API localmente

**Archivo de salida:** `scripts/auth/bearer-tokens.json`

---

### 🎫 get-auth-token.js
Obtiene un token de acceso OAuth2 real de XSUAA y prueba el acceso básico al servicio.

```bash
node scripts/auth/get-auth-token.js
```

**Propósito:** Obtener un token de acceso válido del servicio XSUAA desplegado para pruebas.

**Qué hace:**
- Se autentica con XSUAA usando credenciales de cliente
- Obtiene un token de acceso OAuth2 real
- Prueba endpoints básicos del servicio (ShiftBookCategory)
- Muestra información del token y resultados de pruebas

**Caso de uso:** Probar servicios desplegados con autenticación real.

---

### 🔍 decode-jwt-token.js
Decodifica y analiza tokens JWT para entender su estructura y claims.

```bash
node scripts/auth/decode-jwt-token.js <JWT_TOKEN>
```

**Ejemplo:**
```bash
node scripts/auth/decode-jwt-token.js "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Propósito:** Depurar problemas de autenticación inspeccionando el contenido del token.

**Qué muestra:**
- Header del token (algoritmo, tipo)
- Payload del token (claims, scopes, info de usuario)
- Tiempo de expiración del token
- Información de emisor y audiencia
- Todos los claims personalizados

**Caso de uso:** Entender asignaciones de scopes, depurar errores "Unable to map issuer", verificar estructura del token.

---

### 🔄 test-token-exchange.sh
Prueba el intercambio de tokens OAuth2 desde tokens del frontend DMC a tokens del backend.

```bash
./scripts/auth/test-token-exchange.sh "<DMC_JWT_TOKEN>"
```

**Ejemplo:**
```bash
./scripts/auth/test-token-exchange.sh "eyJ0eXAiOiJKV1QiLCJqa..."
```

**Propósito:** Verificar que el intercambio de tokens cross-region o cross-subaccount funciona correctamente.

**Qué hace:**
- Obtiene credenciales XSUAA de la service key de Cloud Foundry
- Intenta intercambiar un token del frontend DMC por un token del backend
- Reporta éxito o fallo con mensajes de error detallados
- Útil para diagnosticar errores "Unable to map issuer"

**Requisitos:** Debe estar autenticado en Cloud Foundry (`cf login`) y tener acceso a la service key de XSUAA.

**Caso de uso:** Probar configuración de confianza cross-region, depurar fallos de intercambio de tokens OAuth2.

---

## Tipos de Tokens

### Tokens Mock (generate-tokens.js)
- **Tipo:** JWT firmado con secreto mock
- **Validez:** Solo para desarrollo local
- **Scopes:** Todos los scopes de xs-security.json
- **Expiración:** 24 horas desde la generación
- **Caso de uso:** Pruebas locales sin XSUAA

### Tokens Reales (get-auth-token.js)
- **Tipo:** Token de acceso OAuth2 de XSUAA
- **Validez:** Listo para producción
- **Scopes:** Basados en el service binding
- **Expiración:** ~2 horas (default de XSUAA)
- **Caso de uso:** Probar servicios desplegados

## Cuándo Usar Cada Script

| Script | Usar Cuando |
|--------|-------------|
| `generate-tokens.js` | Probar localmente sin autenticación de Cloud Foundry |
| `get-auth-token.js` | Probar servicios desplegados con XSUAA real |
| `decode-jwt-token.js` | Depurar errores de autenticación o entender estructura del token |
| `test-token-exchange.sh` | Verificar que el intercambio de tokens cross-region/cross-subaccount funciona |

## Flujos de Trabajo Comunes

### Pruebas de API Local
```bash
# 1. Generar tokens mock
node scripts/auth/generate-tokens.js

# 2. Usar los tokens de bearer-tokens.json en tus llamadas API
curl -H "Authorization: Bearer <token>" http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory
```

### Pruebas de Servicio Desplegado
```bash
# 1. Obtener token real
node scripts/auth/get-auth-token.js

# 2. Copiar el token del output y usarlo
curl -H "Authorization: Bearer <token>" https://your-app.cfapps.us10.hana.ondemand.com/...
```

### Depuración de Problemas de Autenticación
```bash
# 1. Obtener un token del navegador (F12 → Network → Authorization header)

# 2. Decodificarlo para ver qué contiene
node scripts/auth/decode-jwt-token.js "<token>"

# 3. Revisar issuer, scopes, expiración, etc.
```

### Prueba de Intercambio de Tokens
```bash
# 1. Obtener un token JWT de DMC (por ejemplo, desde el navegador o login de DMC)

# 2. Probar el intercambio de tokens
./scripts/auth/test-token-exchange.sh "<DMC_JWT_TOKEN>"
```

## Archivos de Salida

### bearer-tokens.json
Generado por `generate-tokens.js`, contiene tokens JWT mock para todos los scopes:

```json
{
  "admin": {
    "token": "eyJhbGci...",
    "scope": "shiftbook-cap.admin",
    "expires": "2025-10-29T12:00:00Z"
  },
  "operator": {
    "token": "eyJhbGci...",
    "scope": "shiftbook-cap.operator",
    "expires": "2025-10-29T12:00:00Z"
  }
}
```

## Requisitos

- Node.js instalado
- Dependencias: `npm install`
- Para tokens reales: Credenciales XSUAA válidas configuradas en el script
- Para tokens mock: Archivo `xs-security.json` en el root del proyecto

## Notas de Seguridad

⚠️ Estos scripts contienen **credenciales hardcodeadas** solo para entornos de desarrollo.

🔒 **Nunca:**
- Commitear credenciales de producción reales
- Usar tokens mock en producción
- Compartir tokens públicamente

✅ **Siempre:**
- Mantener credenciales en variables de entorno para producción
- Rotar secrets regularmente
- Usar tokens mock solo para desarrollo local

## Resolución de Problemas

### "Cannot find xs-security.json"
- Asegúrate de ejecutar desde el root del proyecto
- Verifica que xs-security.json exista en el directorio root

### "401 Unauthorized" al usar tokens reales
- Verifica que las credenciales XSUAA sean correctas
- Verifica que el service binding existe: `cf services`
- Asegúrate de que las credenciales no hayan expirado

### "Invalid signature" al decodificar
- El token podría estar expirado
- El token podría ser de un entorno diferente
- Usa el script solo para inspección, la validación de firma es opcional

### Errores "Unable to map issuer"
- Verifica si el token es de una subaccount o región diferente
- Verifica la configuración de confianza cross-region
- Asegúrate de que se usan el client ID y secret correctos para XSUAA

## Documentación Relacionada

- Ver `__docs/DEPLOYMENT_INSTRUCTIONS.md` para flujos de despliegue
- Ver `__docs/CROSS_REGION_TRUST_SETUP.md` para autenticación cross-region
- Ver `scripts/CRUD_TESTING_README.md` para ejemplos de pruebas de API
