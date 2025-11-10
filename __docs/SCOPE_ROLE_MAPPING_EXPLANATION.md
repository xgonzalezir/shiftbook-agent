# Explicación: Mapeo de Scopes y Roles en OAuth 2.0 Token Exchange

**Fecha**: 23 de Octubre de 2025  
**Proyecto**: ShiftBook - SSO Cross-Account  
**Contexto**: Cómo se gestionan los roles del cliente y los scopes del backend

---

## 📋 Índice

1. [El Problema del Mapeo Cross-Account](#el-problema-del-mapeo-cross-account)
2. [Solución: Trust + Foreign Scopes + Mapeo](#solución-trust--foreign-scopes--mapeo)
3. [Flujo Completo del Token Exchange](#flujo-completo-del-token-exchange)
4. [Las 3 Opciones de Mapeo](#las-3-opciones-de-mapeo)
5. [Comparación de Opciones](#comparación-de-opciones)
6. [Implementación Recomendada para ShiftBook](#implementación-recomendada-para-shiftbook)
7. [Debugging y Verificación](#debugging-y-verificación)
8. [Resumen Clave](#resumen-clave)

---

## El Problema del Mapeo Cross-Account

En un escenario cross-account tenemos **dos XSUAAs diferentes** en cuentas BTP separadas:

```
XSUAA del Cliente                    XSUAA Nuestro (Backend)
─────────────────                    ──────────────────────
Roles del cliente:                   Scopes que definimos:
- Operator_Plant_A                   - shiftbook-srv.operator
- Supervisor_Shift_1                 - shiftbook-srv.admin
- Manager_Manufacturing
```

**El desafío**: ¿Cómo relacionamos los roles del cliente con nuestros scopes cuando están en diferentes sistemas de autenticación?

---

## Solución: Trust + Foreign Scopes + Mapeo

### 1. CONFIGURACIÓN DE TRUST (Backend xs-security.json)

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
  
  // ⭐ CLAVE 1: Confiar en el XSUAA del cliente
  "trusted-client-id-suffixes": [
    "!b*|client-xsuaa-app-id"  // App ID del XSUAA del cliente
  ],
  
  // ⭐ CLAVE 2: Aceptar scopes "extranjeros" del cliente
  "foreign-scope-references": [
    "uaa.user",                      // Scope básico
    "client-app.shiftbook.use",      // Scope operator del cliente
    "client-app.shiftbook.admin"     // Scope admin del cliente
  ],
  
  // ⭐ CLAVE 3: Habilitar Token Exchange
  "oauth2-configuration": {
    "grant-types": [
      "urn:ietf:params:oauth:grant-type:jwt-bearer"  // Token exchange
    ]
  },
  
  "authorities": [
    "$ACCEPT_GRANTED_AUTHORITIES"
  ]
}
```

**Explicación de los 3 elementos clave**:

1. **`trusted-client-id-suffixes`**: Le dice a nuestro XSUAA que confíe en tokens emitidos por el XSUAA del cliente
2. **`foreign-scope-references`**: Lista de scopes del cliente que aceptamos como válidos
3. **`grant-types`**: Habilita el flujo JWT Bearer para intercambio de tokens

---

## Flujo Completo del Token Exchange

### Diagrama del Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│ PASO 1: Usuario se autentica en XSUAA del Cliente              │
└─────────────────────────────────────────────────────────────────┘

Usuario → Client XSUAA → JWT Token emitido:
{
  "iss": "https://client-xsuaa.authentication.sap/oauth/token",
  "user_name": "juan.perez@cliente.com",
  "scope": [
    "uaa.user",
    "client-app.shiftbook.use"  // Rol del cliente
  ],
  "client_id": "client-app-id"
}


┌─────────────────────────────────────────────────────────────────┐
│ PASO 2: Frontend hace request al Backend con token del cliente │
└─────────────────────────────────────────────────────────────────┘

Frontend (Approuter) → Backend URL
Headers: {
  Authorization: "Bearer [token-del-cliente]"
}


┌─────────────────────────────────────────────────────────────────┐
│ PASO 3: Backend valida y intercambia el token                   │
└─────────────────────────────────────────────────────────────────┘

Backend → Nuestro XSUAA:
POST /oauth/token
{
  grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
  assertion: "[token-del-cliente]",  // Token original
  client_id: "shiftbook-srv",
  client_secret: "[secret]"
}

Nuestro XSUAA valida:
1. ✓ ¿El token del cliente es válido?
2. ✓ ¿Confiamos en el emisor? (trusted-client-id-suffixes)
3. ✓ ¿El usuario tiene scopes válidos? (foreign-scope-references)


┌─────────────────────────────────────────────────────────────────┐
│ PASO 4: XSUAA emite NUEVO token con NUESTROS scopes            │
└─────────────────────────────────────────────────────────────────┘

Nuestro XSUAA → Nuevo JWT:
{
  "iss": "https://our-xsuaa.authentication.sap/oauth/token",
  "user_name": "juan.perez@cliente.com",  // ✓ Identidad mantenida
  "scope": [
    "shiftbook-srv.operator",  // ✓ Nuestro scope aplicado
    "uaa.user"
  ],
  "ext_attr": {
    "enhancer": "XSUAA"
  }
}


┌─────────────────────────────────────────────────────────────────┐
│ PASO 5: Backend usa nuevo token para autorización              │
└─────────────────────────────────────────────────────────────────┘

Backend CAP Service valida:
- ✓ Token emitido por nuestro XSUAA
- ✓ Scope "shiftbook-srv.operator" presente
- ✓ Usuario autorizado para operación
```

---

## Las 3 Opciones de Mapeo

### Opción A: Mapeo Implícito (Más Simple)

**Concepto**: Todos los usuarios autenticados del cliente obtienen el mismo scope básico.

```json
// En nuestro xs-security.json
{
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "description": "Operator access"
      // Sin restricciones - todos los usuarios del cliente obtienen este scope
    }
  ],
  "foreign-scope-references": [
    "uaa.user"  // Suficiente con tener este scope del cliente
  ]
}
```

**Flujo**:
```
Token Cliente                          Token Intercambiado
─────────────                          ───────────────────
user: juan.perez                       user: juan.perez
scope:                                 scope:
  - uaa.user ✓              →            - uaa.user
  - Operator_Plant_A                     - shiftbook-srv.operator ✓
```

**Resultado**: 
- Usuario tiene `uaa.user` en token del cliente
- Tras token exchange → obtiene `shiftbook-srv.operator`
- **Todos los usuarios del cliente tienen mismo nivel de acceso**

#### ✅ Ventajas:
- Muy simple de configurar
- No requiere coordinación compleja con cliente
- Rápido de implementar
- Ideal para MVP o PoC

#### ❌ Desventajas:
- TODOS los usuarios tienen mismos permisos
- No hay diferenciación de roles
- No apto para producción con múltiples niveles de acceso
- Sin control granular

---

### Opción B: Mapeo Explícito ⭐ **RECOMENDADO**

**Concepto**: Scopes específicos del cliente se mapean a nuestros scopes de forma declarativa.

#### Paso 1: Cliente define scopes en su XSUAA

En la cuenta BTP del **cliente** - xs-security.json:

```json
{
  "xsappname": "client-app",
  "scopes": [
    {
      "name": "$XSAPPNAME.shiftbook.use",
      "description": "Use ShiftBook as operator"
    },
    {
      "name": "$XSAPPNAME.shiftbook.admin",
      "description": "Administer ShiftBook"
    }
  ],
  "role-templates": [
    {
      "name": "ShiftBook_User",
      "description": "ShiftBook basic user",
      "scope-references": [
        "uaa.user",
        "$XSAPPNAME.shiftbook.use"
      ]
    },
    {
      "name": "ShiftBook_Admin",
      "description": "ShiftBook administrator",
      "scope-references": [
        "uaa.user",
        "$XSAPPNAME.shiftbook.admin"
      ]
    }
  ]
}
```

Cliente crea Role Collections en BTP Cockpit:

```
Role Collection: "ShiftBook_Operators"
├─ Role Template: ShiftBook_User
├─ Scope: client-app.shiftbook.use
└─ Assigned to: juan.perez@cliente.com, operador1@cliente.com

Role Collection: "ShiftBook_Administrators"
├─ Role Template: ShiftBook_Admin
├─ Scope: client-app.shiftbook.admin
└─ Assigned to: maria.gomez@cliente.com, supervisor1@cliente.com
```

#### Paso 2: Backend acepta esos scopes

En nuestra xs-security.json:

```json
{
  "xsappname": "shiftbook-srv",
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
  "foreign-scope-references": [
    "uaa.user",
    "client-app.shiftbook.use",    // ⭐ Aceptamos estos scopes
    "client-app.shiftbook.admin"
  ],
  "trusted-client-id-suffixes": [
    "!b*|client-app"  // ⭐ Confiamos en el XSUAA del cliente
  ]
}
```

#### Paso 3: El mapeo sucede automáticamente

**Usuario Operador**:
```
Token Cliente                          Token Intercambiado
─────────────────                      ───────────────────
user: juan.perez                       user: juan.perez
scope:                                 scope:
  - uaa.user                 →           - uaa.user
  - client-app.shiftbook.use ✓           - shiftbook-srv.operator ✓
```

**Usuario Admin**:
```
Token Cliente                          Token Intercambiado
─────────────────                      ───────────────────
user: maria.gomez                      user: maria.gomez
scope:                                 scope:
  - uaa.user                 →           - uaa.user
  - client-app.shiftbook.admin ✓         - shiftbook-srv.admin ✓
```

**Reglas de Mapeo**:
```
Scope del Cliente              →  Scope en Backend
─────────────────────────────────────────────────────
client-app.shiftbook.use       →  shiftbook-srv.operator
client-app.shiftbook.admin     →  shiftbook-srv.admin
uaa.user (solo)                →  Sin acceso (rechazado)
```

#### ✅ Ventajas:
- Mapeo granular role-to-scope
- Diferentes niveles de acceso por usuario
- Configuración declarativa (sin código)
- Cliente controla asignación de roles
- Fácil de mantener y auditar
- Patrón estándar SAP BTP

#### ❌ Desventajas:
- Requiere coordinación con cliente
- Cliente debe crear Role Collections específicas
- Más configuración inicial
- Necesita documentación clara del mapeo

---

### Opción C: Mapeo Programático (Máxima Flexibilidad)

**Concepto**: El código del backend decide dinámicamente qué scopes asignar basándose en lógica personalizada.

```typescript
// srv/middleware/scope-mapper.ts
import * as xsenv from '@sap/xsenv';
import axios from 'axios';
import jwt from 'jsonwebtoken';

export class ScopeMapper {
  
  /**
   * Mapea roles del cliente a nuestros scopes usando lógica personalizada
   */
  mapClientRolesToScopes(clientToken: any): string[] {
    const clientScopes = clientToken.scope || [];
    const mappedScopes = [];
    
    // Mapeo basado en roles del cliente
    if (clientScopes.includes('Operator_Plant_A')) {
      mappedScopes.push('shiftbook-srv.operator');
    }
    
    if (clientScopes.includes('Operator_Plant_B')) {
      mappedScopes.push('shiftbook-srv.operator');
    }
    
    if (clientScopes.includes('Manager_Manufacturing')) {
      mappedScopes.push('shiftbook-srv.operator');
      mappedScopes.push('shiftbook-srv.admin');
    }
    
    // Mapeo basado en atributos del usuario
    if (clientToken.email && clientToken.email.includes('@vip-client.com')) {
      mappedScopes.push('shiftbook-srv.premium');
    }
    
    // Lógica compleja basada en contexto
    if (this.isWorkingHours() && this.hasPlantAccess(clientToken)) {
      mappedScopes.push('shiftbook-srv.realtime-access');
    }
    
    // Mapeo basado en múltiples condiciones
    if (clientToken.department === 'Production' && 
        clientToken.experience_years > 2) {
      mappedScopes.push('shiftbook-srv.advanced-operator');
    }
    
    return mappedScopes;
  }
  
  /**
   * Realiza token exchange con scopes específicos
   */
  async exchangeTokenWithScopes(clientToken: string): Promise<string> {
    const services = xsenv.getServices({ xsuaa: { tag: 'xsuaa' } });
    const xsuaaConfig = services.xsuaa;
    
    // 1. Decodificar token del cliente
    const decoded = jwt.decode(clientToken, { complete: true });
    
    // 2. Mapear a nuestros scopes usando lógica personalizada
    const scopes = this.mapClientRolesToScopes(decoded.payload);
    
    // 3. Solicitar token exchange con scopes específicos
    const response = await axios.post(
      `${xsuaaConfig.url}/oauth/token`,
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: clientToken,
        client_id: xsuaaConfig.clientid,
        client_secret: xsuaaConfig.clientsecret,
        scope: scopes.join(' ')  // ⭐ Scopes solicitados dinámicamente
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data.access_token;
  }
  
  private isWorkingHours(): boolean {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 22; // 6 AM a 10 PM
  }
  
  private hasPlantAccess(token: any): boolean {
    return token.plant_codes && token.plant_codes.length > 0;
  }
}

// Uso en CAP Service
module.exports = cds.service.impl(async function() {
  const scopeMapper = new ScopeMapper();
  
  this.before('*', async (req) => {
    if (req.headers.authorization) {
      const clientToken = req.headers.authorization.substring(7);
      const exchangedToken = await scopeMapper.exchangeTokenWithScopes(clientToken);
      
      // Usar el token intercambiado
      req.headers.authorization = `Bearer ${exchangedToken}`;
    }
  });
});
```

#### ✅ Ventajas:
- Control total sobre mapeo
- Lógica personalizada compleja
- Puede usar cualquier atributo del token
- Dinámico (puede cambiar sin redeployar XSUAA)
- Mapeo contextual (hora, ubicación, etc.)
- Ideal para casos de uso muy específicos

#### ❌ Desventajas:
- Requiere desarrollo y mantenimiento
- Más complejo de debuggear
- Lógica de autorización en código (no declarativa)
- Posibles problemas de performance
- Mayor superficie de ataque (bugs en código)
- Requiere pruebas exhaustivas

---

## Comparación de Opciones

| Aspecto | Opción A: Implícito | Opción B: Explícito | Opción C: Programático |
|---------|---------------------|---------------------|------------------------|
| **Complejidad setup** | ★☆☆ Baja | ★★☆ Media | ★★★ Alta |
| **Flexibilidad** | ★☆☆ Baja | ★★☆ Media | ★★★ Muy Alta |
| **Configuración** | Solo backend | Backend + Cliente | Backend + Código |
| **Mantenimiento** | ★★★ Fácil | ★★☆ Medio | ★☆☆ Requiere desarrollo |
| **Granularidad** | ★☆☆ Todos iguales | ★★★ Role-to-scope | ★★★ Lógica custom |
| **Performance** | ★★★ Excelente | ★★★ Excelente | ★★☆ Buena |
| **Debugging** | ★★★ Fácil | ★★☆ Medio | ★☆☆ Complejo |
| **Seguridad** | ★★☆ Media | ★★★ Alta | ★★☆ Depende código |
| **Auditabilidad** | ★★☆ Media | ★★★ Alta | ★★☆ Media |
| | | | |
| **Recomendado para:** | | | |
| MVP/PoC | ✓ | | |
| Producción estándar | | ✓ | |
| Casos complejos | | | ✓ |
| Múltiples clientes | | ✓ | |
| Requisitos únicos | | | ✓ |

---

## Implementación Recomendada para ShiftBook

### 🎯 Usar Opción B: Mapeo Explícito

**Razones**:
- Balance perfecto entre simplicidad y flexibilidad
- 2 niveles de acceso son suficientes (operator/admin)
- Cliente controla asignación de usuarios a roles
- Configuración declarativa (sin código custom)
- Fácil de debuggear y mantener
- Patrón estándar SAP BTP
- Escalable a múltiples clientes

### Paso 1: Cliente crea Role Collections

El cliente debe crear en su BTP Cockpit:

```
Role Collection: "ShiftBook_Operator"
─────────────────────────────────────
Description: Can create and read shift logs
Scopes:
  └─ client-app.shiftbook.use
Assigned Users:
  ├─ juan.perez@cliente.com
  ├─ operador1@cliente.com
  └─ operador2@cliente.com


Role Collection: "ShiftBook_Admin"
───────────────────────────────────
Description: Can manage categories and all logs
Scopes:
  └─ client-app.shiftbook.admin
Assigned Users:
  ├─ maria.gomez@cliente.com
  └─ supervisor1@cliente.com
```

### Paso 2: Cliente actualiza su xs-security.json

```json
{
  "xsappname": "client-app",
  "tenant-mode": "dedicated",
  "scopes": [
    {
      "name": "$XSAPPNAME.shiftbook.use",
      "description": "Use ShiftBook application"
    },
    {
      "name": "$XSAPPNAME.shiftbook.admin",
      "description": "Administer ShiftBook application"
    }
  ],
  "role-templates": [
    {
      "name": "ShiftBook_User",
      "description": "ShiftBook user role",
      "scope-references": [
        "uaa.user",
        "$XSAPPNAME.shiftbook.use"
      ]
    },
    {
      "name": "ShiftBook_Admin",
      "description": "ShiftBook admin role",
      "scope-references": [
        "uaa.user",
        "$XSAPPNAME.shiftbook.admin"
      ]
    }
  ]
}
```

### Paso 3: Nuestro xs-security.json

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
      "description": "Admin - Full access including categories"
    }
  ],
  
  "foreign-scope-references": [
    "uaa.user",
    "client-app.shiftbook.use",
    "client-app.shiftbook.admin"
  ],
  
  "trusted-client-id-suffixes": [
    "!b*|client-app"
  ],
  
  "oauth2-configuration": {
    "grant-types": [
      "urn:ietf:params:oauth:grant-type:jwt-bearer"
    ],
    "token-validity": 7200,
    "refresh-token-validity": 86400
  },
  
  "authorities": [
    "$ACCEPT_GRANTED_AUTHORITIES"
  ]
}
```

### Paso 4: Documentar Reglas de Mapeo

Crear documento compartido con el cliente:

```
MAPEO DE SCOPES SHIFTBOOK
═════════════════════════

Scope del Cliente              →  Scope Backend ShiftBook
─────────────────────────────────────────────────────────
client-app.shiftbook.use       →  shiftbook-srv.operator
client-app.shiftbook.admin     →  shiftbook-srv.admin
uaa.user (solo)                →  Sin acceso (rechazado)

PERMISOS POR SCOPE
══════════════════

shiftbook-srv.operator:
  ✓ Leer logs propios
  ✓ Crear nuevos logs
  ✓ Marcar logs como leídos/no leídos
  ✗ No puede gestionar categorías
  ✗ No puede eliminar logs de otros

shiftbook-srv.admin:
  ✓ Todos los permisos de operator
  ✓ Gestionar categorías
  ✓ Ver/editar/eliminar logs de todos
  ✓ Configurar notificaciones
  ✓ Acceso a métricas y reportes
```

### Paso 5: Validación en Backend CAP

```javascript
// srv/shiftbook-service.cds
service ShiftBookService {
  
  @requires: 'operator'
  entity ShiftBookLog as projection on db.ShiftBookLog;
  
  @requires: 'admin'
  entity ShiftBookCategory as projection on db.ShiftBookCategory;
}

// srv/shiftbook-service.js
module.exports = cds.service.impl(async function() {
  
  this.before('READ', 'ShiftBookLog', async (req) => {
    // CAP automáticamente valida el scope basado en @requires
    // Operator y Admin pueden leer
    console.log(`User ${req.user.id} accessing logs`);
  });
  
  this.before('CREATE', 'ShiftBookLog', async (req) => {
    // Validar que el usuario tenga scope operator o admin
    if (!req.user.is('operator') && !req.user.is('admin')) {
      req.reject(403, 'Requires operator or admin scope');
    }
    
    // Añadir información del usuario al log
    req.data.user_id = req.user.id;
    req.data.created_at = new Date();
  });
  
  this.before('*', 'ShiftBookCategory', async (req) => {
    // Solo admins pueden gestionar categorías
    if (!req.user.is('admin')) {
      req.reject(403, 'Requires admin scope to manage categories');
    }
  });
  
  this.before('DELETE', 'ShiftBookLog', async (req) => {
    // Solo admins pueden eliminar logs
    if (!req.user.is('admin')) {
      req.reject(403, 'Only admins can delete logs');
    }
  });
  
  // Logging de autorización para auditoría
  this.on('*', '*', async (req, next) => {
    const result = await next();
    
    console.log('Authorization audit:', {
      timestamp: new Date().toISOString(),
      user: req.user.id,
      scopes: req.user.attr?.scope || [],
      operation: req.event,
      entity: req.target?.name,
      granted: true
    });
    
    return result;
  });
});
```

---

## Debugging y Verificación

### Ver Token del Cliente (Frontend - start.js)

```javascript
// PodPlugins/start.js
var approuter = require('@sap/approuter');
var ar = approuter();

ar.beforeRequestHandler.use('/backend', function(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      // Decodificar JWT (solo payload, sin validar firma)
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64').toString()
        );
        
        console.log('🔍 CLIENT TOKEN DETAILS:');
        console.log('   User:', payload.user_name);
        console.log('   Client ID:', payload.client_id);
        console.log('   Scopes:', payload.scope);
        console.log('   Issuer:', payload.iss);
        console.log('   Expires:', new Date(payload.exp * 1000).toISOString());
        
        // Verificar scopes específicos de ShiftBook
        const hasOperator = payload.scope?.includes('client-app.shiftbook.use');
        const hasAdmin = payload.scope?.includes('client-app.shiftbook.admin');
        console.log('   Has Operator:', hasOperator ? '✓' : '✗');
        console.log('   Has Admin:', hasAdmin ? '✓' : '✗');
      }
    } catch (err) {
      console.error('Error decoding token:', err.message);
    }
  } else {
    console.log('⚠️  No Authorization header found');
  }
  
  next();
});

ar.start();
```

**Output Ejemplo**:
```
🔍 CLIENT TOKEN DETAILS:
   User: juan.perez@cliente.com
   Client ID: client-app!t123456
   Scopes: [ 'uaa.user', 'client-app.shiftbook.use' ]
   Issuer: https://client-xsuaa.authentication.eu10.hana.ondemand.com/oauth/token
   Expires: 2025-10-23T14:30:00.000Z
   Has Operator: ✓
   Has Admin: ✗
```

### Ver Token Intercambiado (Backend - middleware)

```typescript
// srv/middleware/auth-debugger.ts
import * as cds from '@sap/cds';

cds.on('served', () => {
  const app = cds.app;
  
  app.use((req, res, next) => {
    if (req.user && req.user.id) {
      console.log('🔍 EXCHANGED TOKEN DETAILS:');
      console.log('   User ID:', req.user.id);
      console.log('   User Email:', req.user.attr?.email);
      console.log('   Token Scopes:', req.user.attr?.scope || []);
      console.log('   Is Authenticated:', req.user.is('authenticated'));
      console.log('   Has Operator:', req.user.is('operator'));
      console.log('   Has Admin:', req.user.is('admin'));
      
      // Verificar atributos adicionales
      console.log('   Token Attributes:', {
        client_id: req.user.attr?.client_id,
        zone_uuid: req.user.attr?.zone_uuid,
        grant_type: req.user.attr?.grant_type
      });
    } else {
      console.log('⚠️  No authenticated user found');
    }
    
    next();
  });
});
```

**Output Ejemplo**:
```
🔍 EXCHANGED TOKEN DETAILS:
   User ID: juan.perez@cliente.com
   User Email: juan.perez@cliente.com
   Token Scopes: [ 'uaa.user', 'shiftbook-srv.operator' ]
   Is Authenticated: true
   Has Operator: true
   Has Admin: false
   Token Attributes: {
     client_id: 'sb-shiftbook-srv!t789012',
     zone_uuid: 'xyz-zone-uuid',
     grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer'
   }
```

### Herramienta de Verificación de Tokens

```javascript
// tools/token-verifier.js
const jwt = require('jsonwebtoken');

function verifyTokenMapping(clientToken, exchangedToken) {
  console.log('═══════════════════════════════════════════');
  console.log('TOKEN MAPPING VERIFICATION');
  console.log('═══════════════════════════════════════════\n');
  
  // Decodificar ambos tokens
  const client = jwt.decode(clientToken);
  const exchanged = jwt.decode(exchangedToken);
  
  console.log('CLIENT TOKEN:');
  console.log('  User:', client.user_name);
  console.log('  Scopes:', client.scope);
  console.log('  Issuer:', client.iss);
  console.log('');
  
  console.log('EXCHANGED TOKEN:');
  console.log('  User:', exchanged.user_name);
  console.log('  Scopes:', exchanged.scope);
  console.log('  Issuer:', exchanged.iss);
  console.log('');
  
  console.log('MAPPING VERIFICATION:');
  console.log('  ✓ User identity preserved:', 
    client.user_name === exchanged.user_name);
  
  // Verificar mapeo de scopes
  const hasClientOperator = client.scope?.includes('client-app.shiftbook.use');
  const hasBackendOperator = exchanged.scope?.includes('shiftbook-srv.operator');
  const hasClientAdmin = client.scope?.includes('client-app.shiftbook.admin');
  const hasBackendAdmin = exchanged.scope?.includes('shiftbook-srv.admin');
  
  console.log('  ✓ Operator mapping:', 
    hasClientOperator ? 
      (hasBackendOperator ? 'client-app.shiftbook.use → shiftbook-srv.operator' : '✗ FAILED') :
      'N/A');
  
  console.log('  ✓ Admin mapping:', 
    hasClientAdmin ? 
      (hasBackendAdmin ? 'client-app.shiftbook.admin → shiftbook-srv.admin' : '✗ FAILED') :
      'N/A');
  
  console.log('');
  console.log('═══════════════════════════════════════════\n');
}

module.exports = { verifyTokenMapping };
```

---

## Resumen Clave

### El mapeo de scopes en Token Exchange funciona mediante 5 pasos:

1. **🔐 TRUST** (`trusted-client-id-suffixes`)
   - Backend dice: "Confío en el XSUAA del cliente"
   - Permite que tokens del cliente sean aceptados

2. **🌐 FOREIGN SCOPES** (`foreign-scope-references`)
   - Backend dice: "Acepto estos scopes específicos del cliente"
   - Lista explícita de scopes válidos

3. **🔄 TOKEN EXCHANGE** (grant type JWT Bearer)
   - XSUAA valida token del cliente
   - Emite nuevo token con nuestros scopes
   - Mantiene identidad del usuario

4. **🎯 MAPEO** (implícito, explícito o programático)
   - Define cómo scopes del cliente se traducen a nuestros scopes
   - Puede ser automático o personalizado

5. **✅ AUTORIZACIÓN** (CAP `@requires`)
   - Backend valida scopes en cada operación
   - Rechaza peticiones sin scopes adecuados

### Para ShiftBook: Recomendación Final

**Usar Mapeo Explícito (Opción B)** con:
- 2 scopes del cliente: `client-app.shiftbook.use`, `client-app.shiftbook.admin`
- 2 scopes nuestros: `shiftbook-srv.operator`, `shiftbook-srv.admin`
- Mapeo 1:1 documentado y acordado con el cliente
- Validación en CAP con `@requires` y `req.user.is()`

**Ventajas de esta elección**:
✓ Balance entre simplicidad y control  
✓ Escalable a múltiples clientes  
✓ Mantenimiento declarativo  
✓ Patrón estándar SAP BTP  
✓ Fácil debugging y auditoría  

---

**Fin del Documento**
