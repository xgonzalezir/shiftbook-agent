# Análisis: SSO entre XSUAA del Cliente y XSUAA Propio en SAP BTP

**Fecha**: 23 de Octubre de 2025  
**Proyecto**: ShiftBook - Backend CAP Service  
**Contexto**: Plugin Fiori (Frontend) desplegado en cuenta del cliente + Backend CAP en nuestra cuenta BTP

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Contexto del Problema](#contexto-del-problema)
3. [Arquitectura Actual](#arquitectura-actual)
4. [Análisis del Problema](#análisis-del-problema)
5. [Soluciones Propuestas](#soluciones-propuestas)
6. [Comparativa de Soluciones](#comparativa-de-soluciones)
7. [Recomendaciones](#recomendaciones)
8. [Referencias y Recursos](#referencias-y-recursos)

---

## 🎯 Resumen Ejecutivo

### El Problema
Necesitamos establecer SSO (Single Sign-On) entre dos instancias de XSUAA en diferentes cuentas de SAP BTP:
- **Frontend**: Plugin Fiori (SAP Approuter + UI5) desplegado en la instancia DMC del cliente (CloudFoundry en su cuenta)
- **Backend**: Servicio CAP + HANA DB + XSUAA desplegado en nuestra cuenta BTP

El frontend es un DMC Pod Plugin que se ejecuta embebido en el sistema Digital Manufacturing Cloud del cliente como un iframe, con SAP Approuter manejando el enrutamiento de autenticación y la UI comunicándose con nuestro backend mediante destinos configurados.

### Objetivo
Permitir que usuarios autenticados en el XSUAA del cliente puedan consumir nuestro servicio backend sin reautenticación, manteniendo la identidad del usuario (principal propagation) y los controles de autorización.

### Hallazgos Clave del Análisis del Frontend
El repositorio `shift-book-pod-plugin` revela:
- Actualmente usa un **patrón de XSUAA compartido** en desarrollo (frontend y backend en la misma cuenta)
- Tres patrones de destinos configurados (`/backend/`, `/backend-noauth/`, `/backend-clientcredentials/`)
- Autenticación exitosa usando autenticación basada en rutas en xs-app.json
- Patrón probado: destino `NoAuthentication` con `forwardAuthToken: true` funciona dentro de la misma cuenta
- **Desafío para producción**: Escenario cross-account requiere OAuth2SAMLBearerAssertion y configuración explícita de trust

---

## 🏗️ Contexto del Problema

### Arquitectura Multi-Cuenta

```
┌─────────────────────────────────────────────────────────────────┐
│               CUENTA BTP DEL CLIENTE                            │
│                                                                 │
│  ┌──────────────────────────────────────────┐                   │
│  │  DMC (Digital Manufacturing Cloud)       │                   │
│  │  ┌────────────────────────────────────┐  │                   │
│  │  │  Frontend Fiori Plugin             │  │                   │
│  │  │  (ShiftBook UI)                    │  │                   │
│  │  │  - SAP Approuter (@sap/approuter)  │  │                   │
│  │  │  - Aplicación UI5                  │  │                   │
│  │  │  - Enrutamiento xs-app.json        │  │                   │
│  │  └────────────────────────────────────┘  │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                 │
│  ┌──────────────────────────────────────────┐                   │
│  │  XSUAA Cliente                           │                   │
│  │  - Usuarios corporativos                 │                   │
│  │  - Políticas de autenticación            │                   │
│  │  - IdP corporativo (IAS/AD)              │                   │
│  └──────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                          ⬇️  SSO requerido
┌─────────────────────────────────────────────────────────────────┐
│               NUESTRA CUENTA BTP (PROVEEDOR)                    │
│                                                                 │
│  ┌──────────────────────────────────────────┐                   │
│  │  Backend CAP Service                     │                   │
│  │  - ShiftBookService (OData V4)           │                   │
│  │  - Lógica de negocio                     │                   │
│  │  - Notificaciones (Email/Teams)          │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                 │
│  ┌──────────────────────────────────────────┐                   │
│  │  HANA Cloud Database                     │                   │
│  │  - ShiftBookLog                          │                   │
│  │  - ShiftBookCategory                     │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                 │
│  ┌──────────────────────────────────────────┐                   │
│  │  XSUAA Propio                            │                   │
│  │  - Scopes: operator, admin               │                   │
│  │  - Role Collections                      │                   │
│  │  - tenant-mode: dedicated                │                   │
│  └──────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Configuración Actual

#### xs-security.json del Backend

```json
{
  "xsappname": "shiftbook-srv",
  "tenant-mode": "dedicated",
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "description": "Operator - Read/Create logs",
      "granted-apps": ["$XSAPPNAME(application, shiftbook-plugin)"]
    },
    {
      "name": "$XSAPPNAME.admin",
      "description": "Admin - Full access",
      "granted-apps": ["$XSAPPNAME(application, shiftbook-plugin)"]
    }
  ],
  "oauth2-configuration": {
    "grant-types": [
      "client_credentials",
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "user_token",
      "refresh_token"
    ]
  }
}
```

#### xs-security.json del Frontend (shift-book-pod-plugin)

```json
{
  "xsappname": "shiftbook-plugin",
  "tenant-mode": "dedicated",
  "description": "Security profile of called application",
  "scopes": [
    {
      "name": "uaa.user",
      "description": "UAA"
    }
  ],
  "role-templates": [
    {
      "name": "Token_Exchange",
      "description": "UAA",
      "scope-references": [
        "uaa.user"
      ]
    }
  ]
}
```

#### Configuración de Enrutamiento xs-app.json del Frontend

```json
{
  "welcomeFile": "/PodPlugins/index.html",
  "authenticationMethod": "route",
  "logout": {
    "logoutEndpoint": "/do/logout"
  },
  "routes": [
    {
      "source": "^/PodPlugins/(.*)$",
      "target": "$1",
      "localDir": "webapp",
      "authenticationType": "none"
    },
    {
      "source": "^/backend/(.*)$",
      "target": "$1",
      "destination": "shiftbook-backend",
      "authenticationType": "xsuaa",
      "csrfProtection": false,
      "scope": ["$XSAPPNAME.operator", "$XSAPPNAME.admin"]
    },
    {
      "source": "^/backend-noauth/(.*)$",
      "target": "$1",
      "destination": "shiftbook-backend-noauth",
      "authenticationType": "none",
      "csrfProtection": true
    },
    {
      "source": "^/backend-clientcredentials/(.*)$",
      "target": "$1",
      "destination": "shiftbook-backend-OAuth2ClientCredentials",
      "authenticationType": "none",
      "csrfProtection": true
    }
  ]
}
```

#### Stack Tecnológico de la Aplicación Frontend

**Repositorio**: `shift-book-pod-plugin`

**Stack Tecnológico**:
- **Approuter**: `@sap/approuter` v14.3.2 - maneja autenticación y enrutamiento
- **Framework UI**: SAP UI5 (basado en JavaScript)
- **Despliegue**: CloudFoundry HTML5 Application
- **Arquitectura**: DMC Pod Plugin embebido en Digital Manufacturing Cloud del cliente

**Componentes Clave**:
1. **start.js**: Inicio personalizado del approuter con middleware de logging de tokens JWT
2. **CommonController.js**: Controlador base con lógica de cliente HTTP usando API `fetch()`
3. **config.json**: Configuración específica por entorno (DEV/QA/PRD/LOCAL)
4. **Múltiples destinos configurados**:
   - `/backend/` - Autenticación XSUAA (requiere scopes operator/admin)
   - `/backend-noauth/` - Sin autenticación
   - `/backend-clientcredentials/` - Flujo OAuth2 Client Credentials

**Patrón Actual de Comunicación con Backend**:
```javascript
// Desde CommonController.js (patrón actualizado)
// Función centralizada de construcción de URLs
_buildApiUrl: function(tableUrl, filter) {
    filter = filter || "";
    return `${this.configObject[this.env].appUrl}${tableUrl}${filter}`;
},

// Ejemplo de uso - ruta de destino explícita:
const url = this._buildApiUrl(
    "/destinations/shiftbook-backend/shiftbook/ShiftBookService/ShiftBookCategory",
    "?$filter=werks eq '2000'"
);

// Ejemplo de URL construida:
// https://manu-dev-org-dev-shiftbook-plugin.cfapps.us10-001.hana.ondemand.com
// /destinations/shiftbook-backend/shiftbook/ShiftBookService/ShiftBookCategory?$filter=werks eq '2000'
```

**Configuración CORS** (desde mta.yaml):
- Orígenes permitidos: Host DMC del cliente (ej: `syntax-dmc-demo.execution.eu20-quality.web.dmc.cloud.sap`)
- Métodos permitidos: GET, POST, OPTIONS, PATCH, DELETE, PUT
- Headers especiales: `x-dme-plant`, `x-dme-industry-type` (específicos de DMC)
- Configurado para embedding en iframe en DMC

---

## 🔍 Análisis del Problema

### Desafíos Técnicos

1. **Aislamiento de Cuentas BTP**
   - Cada cuenta BTP tiene su propio XSUAA independiente
   - No existe trust automático entre XSUAAs de diferentes cuentas
   - Los tokens JWT emitidos por un XSUAA no son válidos en otro por defecto

2. **Propagación de Identidad**
   - El usuario se autentica en el XSUAA del cliente
   - El backend necesita validar esa autenticación
   - Se deben mantener las autorizaciones (scopes) definidas en nuestro xs-security.json

3. **Complejidad de Configuración**
   - Requiere configuración en ambas cuentas BTP
   - Necesita coordinación entre cliente y proveedor
   - Gestión de certificados y metadatos SAML/OAuth

4. **Autorización vs Autenticación**
   - **Autenticación**: Verificar la identidad del usuario (responsabilidad del cliente)
   - **Autorización**: Verificar permisos en nuestro servicio (responsabilidad nuestra)

### Desafíos Específicos del Frontend

5. **Arquitectura DMC Pod Plugin**
   - El frontend se ejecuta como iframe embebido dentro de la aplicación DMC del cliente
   - Debe respetar CSP (Content Security Policy) de DMC y restricciones de iframe
   - Requiere configuración CORS específica para comunicación cross-origin
   - Control limitado sobre el flujo de autenticación (DMC controla el frame exterior)

6. **Problemas del Flujo de Autenticación Actual**
   - El frontend usa actualmente **tres patrones de destinos diferentes**:
     - `/backend/` con autenticación XSUAA (espera scopes del XSUAA del backend)
     - `/backend-noauth/` sin autenticación
     - `/backend-clientcredentials/` usando flujo client credentials
   - Esto crea confusión: ¿qué flujo usar para SSO cross-account?
   - El flujo client credentials no mantiene identidad del usuario (pierde principal propagation)
   - Los destinos sin autenticación exponen endpoints sin seguridad adecuada

7. **Complejidad del Reenvío de Tokens del Approuter**
   - El approuter necesita reenviar tokens del XSUAA del cliente a nuestro backend
   - El `xs-app.json` actual tiene estrategias de autenticación mezcladas:
     ```json
     "scope": ["$XSAPPNAME.operator", "$XSAPPNAME.admin"]
     ```
   - Estos scopes referencian el **XSUAA del backend** (`$XSAPPNAME` = shiftbook-srv)
   - Pero los tokens vienen del **XSUAA del cliente** - ¡discordancia de scopes!

8. **Discordancia de Scopes de Tokens**
   - Frontend espera scopes: `shiftbook-srv.operator`, `shiftbook-srv.admin`
   - XSUAA del cliente emite tokens con sus propios scopes
   - Backend valida contra sus scopes XSUAA
   - **Brecha crítica**: ¿Cómo mapear roles de usuario del cliente a nuestros scopes del backend?

9. **Desafío de Configuración del Destination Service**
   - El `mta.yaml` del frontend requiere servicio de destinos:
     ```yaml
     - name: shiftbook-plugin-destination
       type: org.cloudfoundry.existing-service
       parameters:
         service-name: shiftbook-destination
     ```
   - Este destino necesita configurarse para **token exchange cross-account**
   - La configuración actual probablemente apunta a nuestro XSUAA, no al del cliente
   - Necesita tipo de autenticación OAuth2SAMLBearerAssertion u OAuth2UserTokenExchange

10. **Configuración de Múltiples Entornos**
    - El frontend tiene entornos DEV/QA/PRD en `config.json`
    - Cada entorno puede tener diferentes:
      - URLs de host DMC
      - Configuraciones de destinos
      - Relaciones de trust XSUAA
    - Los cambios deben coordinarse en todos los entornos

---

## 💡 Soluciones Propuestas

### Solución 1: OAuth 2.0 Token Exchange (JWT Bearer Grant) ⭐ **RECOMENDADA**

#### Descripción
Utilizar el flujo OAuth 2.0 JWT Bearer Token Exchange (RFC 8693) para intercambiar el token del cliente por un token válido en nuestro XSUAA, manteniendo la identidad del usuario.

#### Arquitectura

```
┌─────────────┐                                    ┌──────────────┐
│   Usuario   │                                    │  XSUAA       │
│  (Cliente)  │                                    │  Cliente     │
└──────┬──────┘                                    └──────┬───────┘
       │                                                  │
       │ 1. Login                                         │
       │─────────────────────────────────────────────────>│
       │                                                  │
       │ 2. JWT Token (del cliente)                       │
       │<─────────────────────────────────────────────────│
       │                                                  │
┌──────▼──────────────────────────────────────────┐       │
│  Frontend Plugin (en cuenta cliente)            │       │
│  - Token JWT del XSUAA del cliente              │       │
└──────┬──────────────────────────────────────────┘       │
       │                                                  │
       │ 3. API Call con JWT del cliente                  │
       │                                                  │
┌──────▼───────────────────────────────────────────┐      │
│  Backend CAP (nuestra cuenta)                    │      │
│  ┌────────────────────────────────────────────┐  │      │
│  │  XSUAA Token Exchange Service              │  │      │
│  │  4. Validate JWT del cliente               │  │      │
│  │  5. Exchange por JWT propio                │──┼──────┘
│  │  6. Return nuevo JWT                       │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  CAP Service con JWT propio                │  │
│  │  - Autorización con scopes propios         │  │
│  │  - Principal propagation mantenido         │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

#### Configuración

**1. Configurar Trust entre XSUAAs**

En **nuestra cuenta BTP** (xs-security.json):

```json
{
  "xsappname": "shiftbook-srv",
  "tenant-mode": "dedicated",
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "description": "Operator - Read/Create logs"
    },
    {
      "name": "$XSAPPNAME.admin",
      "description": "Admin - Full access"
    }
  ],
  "oauth2-configuration": {
    "grant-types": [
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "client_credentials"
    ],
    "token-validity": 7200,
    "refresh-token-validity": 86400
  },
  "foreign-scope-references": [
    "uaa.user"
  ],
  "trusted-client-id-suffixes": [
    "!b*|shiftbook-plugin",
    "!b*|client-xsuaa-app-id"
  ]
}
```

**2. Configurar el Frontend para Token Exchange**

**Actualizar xs-app.json** en `shift-book-pod-plugin`:

```json
{
  "welcomeFile": "/PodPlugins/index.html",
  "authenticationMethod": "route",
  "logout": {
    "logoutEndpoint": "/do/logout"
  },
  "routes": [
    {
      "source": "^/PodPlugins/(.*)$",
      "target": "$1",
      "localDir": "webapp",
      "authenticationType": "none"
    },
    {
      "source": "^/backend/(.*)$",
      "target": "$1",
      "destination": "shiftbook-backend-tokenexchange",
      "authenticationType": "xsuaa",
      "csrfProtection": false
    }
  ]
}
```

**Actualizar Configuración del Destination** (`shiftbook-backend-tokenexchange`):

Crear un nuevo destino en la cuenta BTP del cliente con estas propiedades:

```properties
Name=shiftbook-backend-tokenexchange
Type=HTTP
URL=https://our-backend-url.cfapps.eu10.hana.ondemand.com
Authentication=OAuth2SAMLBearerAssertion
# O
Authentication=OAuth2JWTBearer

# Configuración del Token Service
tokenServiceURL=https://our-xsuaa.authentication.eu10.hana.ondemand.com/oauth/token
clientId=<our-xsuaa-client-id>
clientSecret=<our-xsuaa-client-secret>

# Propiedades adicionales
HTML5.DynamicDestination=true
WebIDEEnabled=true
WebIDEUsage=odata_gen
```

**Actualizar mta.yaml** en `shift-book-pod-plugin`:

```yaml
ID: shiftbook-plugin
_schema-version: "3.2"
version: 1.0.0

modules:
  - name: shiftbook-plugin
    type: html5
    path: PodPlugins
    parameters:
      disk-quota: 256M
      memory: 128M
    requires:
      - name: shiftbook-plugin-auth  # XSUAA del cliente
      - name: shiftbook-plugin-destination

resources:
  - name: shiftbook-plugin-auth
    type: org.cloudfoundry.existing-service
    parameters:
      service-name: client-xsuaa-service  # Proporcionado por el cliente
  
  - name: shiftbook-plugin-destination
    type: org.cloudfoundry.existing-service
    parameters:
      service-name: client-destination-service  # Proporcionado por el cliente
```

**Actualizar Código del Frontend** (CommonController.js):

```javascript
// Eliminar múltiples patrones de destinos, consolidar a uno
// Usar el método centralizado _buildApiUrl()

// Añadir/Actualizar _buildApiUrl para soportar destino cross-account
_buildApiUrl: function(tableUrl, filter) {
    filter = filter || "";
    return `${this.configObject[this.env].appUrl}${tableUrl}${filter}`;
},

// Actualizar doDatabaseCallGet para usar destino unificado
doDatabaseCallGet: function(sTableUrl, filter, sModelName, callBackFunction) {
    const that = this;
    BusyIndicator.show(0);
    
    // Construir URL usando patrón unificado - approuter maneja token exchange
    var sUrl = this._buildApiUrl(
        `/backend/shiftbook/ShiftBookService/${sTableUrl}`,
        filter ? filter : ""
    );
    
    return fetch(sUrl, {
        method: 'GET',
        headers: {
            "Accept": "application/json",
            "X-Dme-Plant": this.plant
            // El header de Authorization es añadido automáticamente por approuter
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        that.logger.info("doDatabaseCallGet => respuesta recibida");
        that.getView().setModel(new JSONModel(data), sModelName);
        if (callBackFunction) {
            callBackFunction(data);
        }
        return data;
    })
    .catch(err => {
        that.logger.error("doDatabaseCallGet => Error: " + err.message);
        that.showErrorMessage(err.message, 10000);
        that.getView().setModel(new JSONModel(), sModelName);
        throw err;
    })
    .finally(() => {
        BusyIndicator.hide();
    });
}
```

**Actualizar config.json**:

```json
{
  "DEV": {
    "dmcHost": "syntax-dmc-demo.execution.eu20-quality.web.dmc.cloud.sap",
    "appUrl": "https://client-dev-shiftbook-plugin.cfapps.us10-001.hana.ondemand.com",
    "destinationPath": "/backend/",  // Destino unificado
    "publicAPIPath": ""
  },
  "QA": {
    "dmcHost": "client-qa-dmc.execution.eu20.web.dmc.cloud.sap",
    "appUrl": "https://client-qa-shiftbook-plugin.cfapps.us10-001.hana.ondemand.com",
    "destinationPath": "/backend/"
  },
  "PRD": {
    "dmcHost": "client-prd-dmc.execution.eu10.web.dmc.cloud.sap",
    "appUrl": "https://client-prd-shiftbook-plugin.cfapps.eu10.hana.ondemand.com",
    "destinationPath": "/backend/"
  }
}
```

**3. Implementar Token Exchange en el Backend**

```typescript
// srv/middleware/token-exchange.ts
import * as xsenv from '@sap/xsenv';
import axios from 'axios';

interface TokenExchangeConfig {
  clientid: string;
  clientsecret: string;
  url: string;
}

export class TokenExchangeMiddleware {
  private xsuaaConfig: TokenExchangeConfig;

  constructor() {
    const services = xsenv.getServices({ 
      xsuaa: { tag: 'xsuaa' } 
    });
    this.xsuaaConfig = services.xsuaa;
  }

  async exchangeToken(clientToken: string): Promise<string> {
    const tokenEndpoint = `${this.xsuaaConfig.url}/oauth/token`;
    
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: clientToken,
      client_id: this.xsuaaConfig.clientid,
      client_secret: this.xsuaaConfig.clientsecret,
      response_type: 'token'
    });

    try {
      const response = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw new Error('Authentication failed');
    }
  }
}

// Middleware en srv/server.ts
cds.on('bootstrap', async (app) => {
  const tokenExchange = new TokenExchangeMiddleware();
  
  app.use('/shiftbook', async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const clientToken = authHeader.substring(7);
      
      try {
        // Exchange token del cliente por nuestro token
        const ourToken = await tokenExchange.exchangeToken(clientToken);
        
        // Reemplazar el token en la petición
        req.headers.authorization = `Bearer ${ourToken}`;
      } catch (error) {
        return res.status(401).json({ 
          error: 'Authentication failed' 
        });
      }
    }
    
    next();
  });
});
```

#### Ventajas
✅ **SAP Guidelines Compliant**: Utiliza mecanismos estándar de OAuth 2.0  
✅ **Principal Propagation**: Mantiene la identidad del usuario original  
✅ **Autorización Granular**: Permite aplicar nuestros scopes y role collections  
✅ **Auditoría Completa**: El usuario original queda registrado en logs  
✅ **Sin Cambios en IAS**: No requiere configurar Identity Authentication Service adicional  
✅ **Flexibilidad**: Permite diferentes políticas de autenticación por cliente

#### Desventajas
⚠️ **Complejidad Inicial**: Requiere configuración en ambas cuentas  
⚠️ **Overhead de Red**: Cada petición requiere un token exchange  
⚠️ **Gestión de Confianza**: Necesita mantener trusted-client-id-suffixes actualizado  
⚠️ **Debugging**: Más complejo rastrear problemas de autenticación

#### Esfuerzo de Implementación
- **Configuración**: 2-3 días
- **Desarrollo**: 3-5 días
- **Testing**: 2-3 días
- **Documentación**: 1-2 días
- **Total**: ~10-15 días

---

### Solución 2: SAP Identity Authentication Service (IAS) como Hub Central ⭐

#### Descripción
Utilizar SAP IAS como Identity Provider central que actúa como proxy entre el IdP corporativo del cliente y ambos XSUAAs, estableciendo trust común.

#### Arquitectura

```
                    ┌────────────────────────┐
                    │   IdP Corporativo      │
                    │   (Azure AD, Okta...)  │
                    └───────────┬────────────┘
                                │ SAML/OIDC
                                │
                    ┌───────────▼────────────┐
                    │  SAP IAS (Hub)         │
                    │  - User Federation     │
                    │  - SSO Central         │
                    │  - MFA / Policies      │
                    └───┬────────────────┬───┘
                        │                │
            SAML Trust  │                │  SAML Trust
                        │                │
        ┌───────────────▼──┐         ┌──▼──────────────┐
        │  XSUAA Cliente   │         │  XSUAA Propio   │
        │  (DMC Frontend)  │         │  (CAP Backend)  │
        └──────────────────┘         └─────────────────┘
```

#### Configuración

**1. Configurar IAS como IdP Central**

```yaml
# Trust Configuration en XSUAA del Cliente
identity-provider: sap-ias
origin: https://client-tenant.accounts.ondemand.com
saml:
  metadata-url: https://client-tenant.accounts.ondemand.com/saml/metadata
```

**2. Configurar Trust en Nuestra Cuenta**

En SAP BTP Cockpit → Subaccount → Security → Trust Configuration:

```yaml
# Establecer trust con el mismo IAS
identity-provider: sap-ias
origin: https://client-tenant.accounts.ondemand.com
saml:
  metadata-url: https://client-tenant.accounts.ondemand.com/saml/metadata
  
# Attribute Mapping
attributes:
  - name: Groups
    source: groups
  - name: email
    source: mail
```

**3. Configurar IAS para ambas aplicaciones**

En IAS Administration Console:

```yaml
# Aplicación 1: Frontend DMC
applications:
  - name: shiftbook-frontend
    type: saml
    assertion-attributes:
      - name: Groups
        value: ${user.groups}
    default-attributes:
      scope: operator

# Aplicación 2: Backend CAP
applications:
  - name: shiftbook-backend
    type: saml
    assertion-attributes:
      - name: Groups
        value: ${user.groups}
      - name: email
        value: ${user.email}
```

**4. Mapeo de Grupos a Role Collections**

En nuestra cuenta BTP:

```json
// Configuración de mapeo de grupos
{
  "role-collections": [
    {
      "name": "ShiftBook_Operator",
      "role-template-references": [
        "$XSAPPNAME.operator"
      ],
      "group-mappings": [
        "SHIFTBOOK_OPERATORS",
        "DMC_USERS"
      ]
    },
    {
      "name": "ShiftBook_Admin",
      "role-template-references": [
        "$XSAPPNAME.admin"
      ],
      "group-mappings": [
        "SHIFTBOOK_ADMINS",
        "DMC_ADMINS"
      ]
    }
  ]
}
```

#### Ventajas
✅ **SSO Verdadero**: Una única autenticación para todas las aplicaciones  
✅ **SAP Best Practice**: Solución recomendada oficialmente por SAP  
✅ **Gestión Centralizada**: Usuarios y políticas en un único lugar  
✅ **MFA Integrado**: Soporte nativo para autenticación multifactor  
✅ **User Provisioning**: Sincronización automática de usuarios  
✅ **Escalable**: Fácil agregar más aplicaciones en el futuro

#### Desventajas
⚠️ **Requiere IAS**: El cliente debe tener un tenant de SAP IAS (coste adicional)  
⚠️ **Coordinación**: Necesita acceso administrativo al IAS del cliente  
⚠️ **Migración de Usuarios**: Puede requerir migración si usan otro IdP  
⚠️ **Vendor Lock-in**: Mayor dependencia del ecosistema SAP

#### Esfuerzo de Implementación
- **Provisioning IAS**: 1-2 días
- **Configuración Trust**: 2-3 días
- **User Migration**: 3-5 días (depende del número de usuarios)
- **Testing**: 3-4 días
- **Documentación**: 2 días
- **Total**: ~12-18 días

---

### Solución 3: SAP Destination Service con Principal Propagation

#### Descripción
Utilizar el SAP Destination Service como intermediario que maneja la autenticación entre cuentas, aprovechando el mecanismo de Principal Propagation.

#### Arquitectura

```
┌────────────────────────────────────────────────────────┐
│          CUENTA BTP DEL CLIENTE                        │
│                                                        │
│  ┌──────────────────────────────────────────┐          │
│  │  Frontend Plugin                         │          │
│  │  - User authenticated                    │          │
│  └──────┬───────────────────────────────────┘          │
│         │                                              │
│  ┌──────▼───────────────────────────────────┐          │
│  │  Destination: "ShiftBookBackend"         │          │
│  │  - URL: backend.cfapps.eu10...           │          │
│  │  - Authentication: OAuth2SAMLBearer      │          │
│  │  - audience: shiftbook-srv               │          │
│  │  - authnContextClassRef: ...             │          │
│  └──────┬───────────────────────────────────┘          │
│         │                                              │
│  ┌──────▼───────────────────────────────────┐          │
│  │  Connectivity Service                    │          │
│  │  - Token conversion                      │          │
│  │  - Principal propagation                 │          │
│  └──────┬───────────────────────────────────┘          │
└─────────┼──────────────────────────────────────────────┘
          │ HTTP + JWT
          │
┌─────────▼────────────────────────────────────────────┐
│          NUESTRA CUENTA BTP (PROVEEDOR)              │
│                                                      │
│  ┌──────────────────────────────────────────┐        │
│  │  CAP Backend Service                     │        │
│  │  - Validates JWT                         │        │
│  │  - Apply scopes/authorizations           │        │
│  └──────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────┘
```

#### Configuración

**1. Crear Destination en la Cuenta del Cliente**

En BTP Cockpit del Cliente → Connectivity → Destinations:

```properties
# Destination Configuration
Name=ShiftBookBackend
Type=HTTP
URL=https://shiftbook-srv.cfapps.eu10.hana.ondemand.com
ProxyType=Internet
Authentication=OAuth2SAMLBearerAssertion

# OAuth2 Configuration
tokenServiceURL=https://provider-xsuaa.authentication.eu10.hana.ondemand.com/oauth/token
clientId=sb-shiftbook-srv!t12345
clientSecret=<client-secret>
audience=shiftbook-srv

# Additional Properties
authnContextClassRef=urn:oasis:names:tc:SAML:2.0:ac:classes:X509
nameIdFormat=urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress
```

**2. Configurar xs-security.json para aceptar Principal Propagation**

```json
{
  "xsappname": "shiftbook-srv",
  "tenant-mode": "dedicated",
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "description": "Operator - Read/Create logs"
    },
    {
      "name": "$XSAPPNAME.admin",
      "description": "Admin - Full access"
    }
  ],
  "oauth2-configuration": {
    "grant-types": [
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "urn:ietf:params:oauth:grant-type:saml2-bearer",
      "client_credentials"
    ],
    "token-validity": 7200
  },
  "role-collections": [
    {
      "name": "ShiftBook_Operator",
      "description": "Operator role for ShiftBook",
      "role-template-references": [
        "$XSAPPNAME.operator"
      ]
    }
  ]
}
```

**3. Configurar el Frontend para usar Destination**

```javascript
// En el código del plugin Fiori
sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/odata/v4/ODataModel"
], function(UIComponent, ODataModel) {
  "use strict";

  return UIComponent.extend("com.client.shiftbook.Component", {
    init: function() {
      UIComponent.prototype.init.apply(this, arguments);
      
      // Usar Destination Service
      const oModel = new ODataModel({
        serviceUrl: "/destinations/ShiftBookBackend/shiftbook/",
        synchronizationMode: "None",
        operationMode: "Server",
        autoExpandSelect: true,
        earlyRequests: true
      });
      
      this.setModel(oModel);
    }
  });
});
```

**4. Configurar approuter en cuenta del cliente (xs-app.json)**

```json
{
  "welcomeFile": "/index.html",
  "authenticationMethod": "route",
  "routes": [
    {
      "source": "^/destinations/ShiftBookBackend/(.*)$",
      "target": "$1",
      "destination": "ShiftBookBackend",
      "authenticationType": "xsuaa",
      "csrfProtection": true
    },
    {
      "source": "^(.*)$",
      "target": "$1",
      "authenticationType": "xsuaa"
    }
  ]
}
```

#### Ventajas
✅ **SAP Native Solution**: Utiliza servicios nativos de BTP  
✅ **Principal Propagation**: Mantiene identidad del usuario  
✅ **Configuración Centralizada**: Destinations gestionadas en cockpit  
✅ **Sin Código Adicional**: Principalmente configuración  
✅ **Auditoría**: Usuario original visible en logs

#### Desventajas
⚠️ **Requiere Connectivity Service**: Binding adicional en cuenta del cliente  
⚠️ **Configuración Compleja**: Muchos parámetros OAuth2  
⚠️ **Gestión de Secrets**: Client secrets deben compartirse  
⚠️ **Debugging Difícil**: Errores de configuración son crípticos  
⚠️ **Limitado a Cloud Foundry**: No funciona bien en Kyma

#### Esfuerzo de Implementación
- **Configuración Destinations**: 2-3 días
- **Configuración XSUAA**: 1-2 días
- **Frontend Integration**: 2-3 días
- **Testing**: 3-4 días
- **Documentación**: 1-2 días
- **Total**: ~10-16 días

---

## 📊 Comparativa de Soluciones

| Criterio | OAuth Token Exchange | IAS Hub | Destination Service |
|----------|---------------------|---------|---------------------|
| **Complejidad Técnica** | Media | Media-Alta | Alta |
| **Coste Adicional** | ❌ No | ✅ Sí (IAS) | ❌ No |
| **Time-to-Market** | 2-3 semanas | 3-4 semanas | 2-3 semanas |
| **Mantenibilidad** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Escalabilidad** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **SAP Best Practice** | ✅ Sí | ✅✅ Muy Recomendado | ✅ Sí |
| **Principal Propagation** | ✅ Completo | ✅ Completo | ✅ Completo |
| **MFA Support** | ⚠️ Limitado | ✅ Nativo | ⚠️ Limitado |
| **Multi-Tenant Ready** | ✅ Sí | ✅ Sí | ⚠️ Parcial |
| **Vendor Lock-in** | Medio | Alto | Alto |
| **Documentación SAP** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎯 Recomendaciones

### Recomendación Principal: **Solución 1 + Solución 2 (Híbrida)**

#### Fase 1: Implementación Rápida (2-3 semanas)
**Implementar OAuth Token Exchange (Solución 1)**
- ✅ Permite lanzar rápidamente sin dependencias externas
- ✅ No requiere IAS adicional
- ✅ Cumple con requisitos de SSO y principal propagation
- ✅ Mantiene control total sobre autenticación/autorización

#### Fase 2: Optimización a Largo Plazo (3-6 meses)
**Migrar a IAS como Hub (Solución 2)**
- ✅ Mejor práctica de SAP
- ✅ Preparado para escalar a múltiples clientes
- ✅ MFA y políticas de seguridad centralizadas
- ✅ Reduce complejidad operativa a largo plazo

### Justificación

1. **Time-to-Market**: La Solución 1 permite entregar valor inmediato
2. **Flexibilidad**: No nos comprometemos con costes de IAS hasta validar el modelo de negocio
3. **Escalabilidad**: IAS es la mejor opción cuando tengamos múltiples clientes
4. **Reducción de Riesgo**: Validamos la arquitectura antes de invertir en IAS

### Plan de Migración

```
Mes 1-2: OAuth Token Exchange
  ├─ Implementación básica
  ├─ Testing con cliente piloto
  └─ Go-Live MVP

Mes 3-4: Evaluación
  ├─ Feedback del cliente
  ├─ Análisis de logs/performance
  └─ Decisión sobre IAS

Mes 5-6: Migración a IAS (si procede)
  ├─ Provisioning de IAS
  ├─ Configuración paralela
  ├─ Migración gradual de usuarios
  └─ Deprecación de token exchange
```

---

## 📖 Aprendizajes de la Implementación Existente (Entorno de Desarrollo)

### Análisis del Setup de Desarrollo Actual

Basado en el análisis del repositorio `shift-book-pod-plugin`, el entorno de desarrollo usa actualmente un **enfoque de XSUAA compartido simplificado** que difiere del escenario cross-account de producción.

#### Arquitectura de Desarrollo Actual

```
┌──────────────────────────────────────────────────┐
│  MISMA CUENTA BTP (Desarrollo/Testing)           │
│                                                  │
│  ┌────────────────────────┐                     │
│  │  shiftbook-plugin      │                     │
│  │  (Frontend Approuter)  │─────┐               │
│  └────────────────────────┘     │               │
│                                 │               │
│  ┌────────────────────────┐     │               │
│  │  shiftbook-srv         │     │               │
│  │  (Backend CAP)         │─────┤               │
│  └────────────────────────┘     │               │
│                                 ▼               │
│                        ┌────────────────┐        │
│                        │ shiftbook-auth │        │
│                        │ (XSUAA Shared) │        │
│                        └────────────────┘        │
│                                                  │
│  Destination: shiftbook-backend                  │
│  - NoAuthentication                              │
│  - forwardAuthToken: true                        │
└──────────────────────────────────────────────────┘
```

#### Hallazgos Clave del Entorno de Desarrollo

**1. Patrón Exitoso de XSUAA Compartido** (Documentado en XSUAA-DESTINATION-ANALYSIS.md)

El entorno de desarrollo resolvió exitosamente problemas de autenticación mediante:
- Uso de una **única instancia XSUAA** (`shiftbook-auth`) compartida por frontend y backend
- Configuración del approuter con **autenticación basada en rutas**:
  ```json
  {
    "authenticationMethod": "route",
    "routes": [
      {
        "source": "^/PodPlugins/(.*)$",
        "authenticationType": "none"  // Recursos estáticos
      },
      {
        "source": "^/destinations/shiftbook-backend/(.*)$",
        "authenticationType": "xsuaa"  // Llamadas API requieren auth
      }
    ]
  }
  ```
- Destino configurado como `NoAuthentication` con `forwardAuthToken: true`

**2. Lecciones Aprendidas - Lo que NO Funcionó**

❌ **Instancias XSUAA Separadas Fallaron**:
- Inicialmente se intentó con instancias separadas `shiftbook-plugin-auth` y `shiftbook-auth`
- Resultado: `Unable to map issuer: Origin claim is missing in the token`
- Causa raíz: Los tokens del XSUAA frontend carecían de claims requeridos para validación del Destination service
- El intercambio de tokens entre instancias separadas no es soportado por el SAP Destination service

❌ **Autenticación Global "none" Falló**:
- El xs-app.json inicial tenía `"authenticationMethod": "none"` globalmente
- No se generaban tokens JWT
- Los usuarios no estaban autenticados en absoluto
- Se corrigió cambiando a autenticación basada en rutas

**3. Factores Críticos de Éxito**

✅ **Autenticación Basada en Rutas es Esencial**:
```json
{
  "authenticationMethod": "route",  // ¡NO "none"!
  "routes": [
    {
      "source": "^/backend/(.*)$",
      "authenticationType": "xsuaa"  // La generación de tokens ocurre aquí
    }
  ]
}
```

✅ **Reenvío de Tokens del Destination**:
```properties
Name=shiftbook-backend
Authentication=NoAuthentication
forwardAuthToken=true
HTML5.DynamicDestination=true
```

✅ **xs-security.json del Backend con granted-apps**:
```json
{
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "granted-apps": ["$XSAPPNAME(application, shiftbook-plugin)"]
    }
  ]
}
```

### Implicaciones para el Escenario de Producción Cross-Account

El entorno de desarrollo prueba que **dentro de la misma cuenta**, el XSUAA compartido funciona perfectamente. Sin embargo, para **producción cross-account**, este enfoque no funcionará porque:

1. **No se Puede Compartir XSUAA Entre Cuentas**: 
   - Cada cuenta BTP tiene instancias XSUAA aisladas
   - El XSUAA del cliente no puede ser "compartido" con nuestro backend

2. **El Reenvío de Tokens no Funcionará Cross-Account**:
   - `forwardAuthToken: true` solo funciona cuando el XSUAA de destino confía en el XSUAA de origen
   - Cross-account requiere configuración explícita de trust vía OAuth2SAMLBearerAssertion

3. **Desafío de Validación de Scopes**:
   - En dev: Backend valida scopes del mismo XSUAA donde se emiten
   - En prod: Backend debe validar scopes del XSUAA del cliente (emisor diferente)
   - Requiere `foreign-scope-references` y `trusted-client-id-suffixes`

### Ruta de Migración de Dev a Producción

```
Desarrollo (Misma Cuenta)          Producción (Cross-Account)
────────────────────────           ──────────────────────────

Frontend XSUAA: shiftbook-auth  →  Frontend XSUAA: client-xsuaa
Backend XSUAA: shiftbook-auth   →  Backend XSUAA: our-xsuaa

Destination:                       Destination:
- NoAuthentication              →  - OAuth2SAMLBearerAssertion
- forwardAuthToken: true        →  - tokenServiceURL: our-xsuaa
                                   - clientId: our-xsuaa-client
                                   - clientSecret: ***

Backend xs-security.json:          Backend xs-security.json:
- granted-apps: [               →  - trusted-client-id-suffixes:
    "shiftbook-plugin"          →      ["!b*|client-app-id"]
  ]                             →  - foreign-scope-references:
                                       ["uaa.user"]
```

### Estrategia de Testing

**Fase 1: Validar Entorno Dev** ✅ (Ya completado)
- XSUAA compartido funcionando
- Reenvío de tokens confirmado
- Respuestas HTTP 200 en logs de producción

**Fase 2: Crear Configuración de Trust** (Siguiente paso)
1. Configurar `trusted-client-id-suffixes` en nuestro xs-security.json del backend
2. Añadir app-id del XSUAA del cliente a lista de confianza
3. Probar con destino OAuth2SAMLBearerAssertion

**Fase 3: Cambios en Frontend**
1. Actualizar ruta de destino en xs-app.json para usar destino cross-account
2. Actualizar config.json con URLs del cliente
3. Probar flujo de token exchange

**Fase 4: Mapeo de Scopes**
1. Definir mapeos de roles entre roles del cliente y nuestros scopes
2. Implementar validación de scopes en backend
3. Probar autorización con diferentes roles de usuario

---

## 📚 Referencias y Recursos

### Documentación Oficial SAP

1. **OAuth Token Exchange**
   - [CAP - Consuming Services (Forward Auth Token)](https://cap.cloud.sap/docs/guides/using-services#forward-auth-token)
   - [SAP Authorization and Trust Management](https://help.sap.com/docs/CP_AUTHORIZ_TRUST_MNG/ae8e8427ecdf407790d96dad93b5f723/6373bb7a96114d619bfdfdc6f505d1b9.html)

2. **IAS Integration**
   - [SAP Cloud Identity Services - Identity Authentication](https://help.sap.com/docs/IDENTITY_AUTHENTICATION)
   - [Establish Trust with SAP IAS](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/cb1bc8f1bd5c482e891063960d7acd78.html)

3. **Destination Service**
   - [SAP BTP Connectivity - Destinations](https://help.sap.com/docs/CP_CONNECTIVITY/cca91383641e40ffbe03bdc78f00f681/e4f1d97cbb571014a247d10f9f9a685d.html)
   - [OAuth2SAMLBearerAssertion](https://help.sap.com/docs/CP_CONNECTIVITY/cca91383641e40ffbe03bdc78f00f681/c69ea6aacd714ad2ae8ceb5fc3ceea56.html)

4. **Cross-Account Scenarios**
   - [SAP BTP Security Guide](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/e129aa20c78c4a9fb379b9803b02e5f6.html)
   - [Multi-Tenancy in CAP](https://cap.cloud.sap/docs/guides/multitenancy/)

5. **SAP Approuter**
   - [Paquete npm @sap/approuter](https://www.npmjs.com/package/@sap/approuter)
   - [Configuración Application Router](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/01c5f9ba7d6847aaaf069d153b981b51.html)
   - [Configuración xs-app.json](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/c19f165084d742a2b8e1bcacb9c8e9c1.html)
   - [Autenticación Basada en Rutas](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/6ba89596e3a64a5480c3977d4ea7fdba.html)

6. **Desarrollo de DMC Pod Plugin**
   - [SAP Digital Manufacturing Cloud - Guía Pod Plugin](https://help.sap.com/docs/sap-digital-manufacturing)
   - [Integración DMC UI Framework](https://help.sap.com/docs/SAP_DIGITAL_MANUFACTURING_CLOUD/extensions)

### SAP Community Posts Relevantes

1. **"Embedding SAP Cloud Portal into Microsoft Teams including SSO"**
   - Ejemplo práctico de configuración de trust cross-account
   - Configuración de CSP headers y iframe domains

2. **"SAP BTP FAQs - Part 3 (Security)"**
   - Explicación de XSUAA, OAuth, SAML y JWT
   - Diferencias entre platform users y business users

3. **"Strengthening SAP BTP Security: SSO with Cloud Connector"**
   - Token-based authentication
   - Eliminación de credenciales estáticas

### Herramientas y Utilidades

- **JWT Debugger**: https://jwt.io
- **SAML Tracer**: Plugin para debugging SAML flows
- **Postman Collections**: Para testing de OAuth flows
- **SAP API Business Hub**: Especificaciones de APIs

---

## 📝 Notas de Implementación

### Consideraciones de Seguridad

1. **Token Lifetime**: Configurar tiempos de vida apropiados
   ```json
   "token-validity": 7200,        // 2 horas
   "refresh-token-validity": 86400 // 24 horas
   ```

2. **Scopes Mínimos**: Aplicar principio de least privilege
   ```json
   {
     "granted-apps": ["$XSAPPNAME(application, shiftbook-plugin)"]
   }
   ```

3. **Audit Logging**: Implementar logging comprehensivo
   ```typescript
   cds.on('served', () => {
     cds.log('info').log('Service authenticated', {
       user: req.user.id,
       origin: req.headers.origin,
       timestamp: new Date().toISOString()
     });
   });
   ```

### Testing Checklist

- [ ] Usuario del cliente puede autenticarse en DMC
- [ ] Token se intercambia correctamente
- [ ] Scopes apropiados se aplican en backend
- [ ] Principal propagation mantiene identidad original
- [ ] Logs de auditoría capturan usuario correcto
- [ ] Timeout y refresh de tokens funcionan
- [ ] Errores de autenticación se manejan apropiadamente
- [ ] Performance es aceptable (<200ms overhead)

### Métricas de Éxito

| Métrica | Target | Medición |
|---------|--------|----------|
| Token Exchange Latency | <100ms | Prometheus metrics |
| Authentication Success Rate | >99% | Application logs |
| User Experience (SSO) | Seamless | User feedback |
| Security Incidents | 0 | Audit logs review |

---

## 🔄 Versionado del Documento

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2025-10-23 | GitHub Copilot | Documento inicial con 3 soluciones propuestas |
| 1.1 | 2025-10-23 | GitHub Copilot | Análisis del repositorio frontend shift-book-pod-plugin añadido:<br>- Arquitectura frontend (Approuter + UI5)<br>- Configuraciones xs-security.json y xs-app.json actuales<br>- Desafíos específicos de autenticación del frontend<br>- Restricciones DMC Pod Plugin (CORS, embedding iframe)<br>- Análisis de discordancia de scopes de tokens<br>- Aprendizajes entorno desarrollo (patrón XSUAA compartido)<br>- Ruta de migración dev a producción cross-account<br>- Solución 1 actualizada con detalles implementación frontend<br>- Referencias Approuter y DMC añadidas |
| 1.2 | 2025-10-23 | GitHub Copilot | Ejemplos de código actualizados para reflejar patrones frontend más recientes:<br>- Reemplazada constante DESTINATION con método _buildApiUrl()<br>- Actualizado patrón de comunicación backend con construcción centralizada URLs<br>- Añadido header X-Dme-Plant en ejemplos fetch<br>- Alineado con mejoras rama main remota (13 commits adelante) |

---

**Fin del Análisis**

