# 🔐 Authentication and Roles Guide - Shift Book Service# 🔐 Guía de Autenticación y Roles - Shift Book Service



## 📋 Summary## 📋 Resumen



The **Shift Book** application uses role-based authentication across **ALL environments** (development, test, hybrid, and production) to ensure security and access control.La aplicación **Shift Book** utiliza autenticación basada en roles en **TODOS los entornos** (desarrollo, test, hybrid y producción) para garantizar la seguridad y el control de acceso.



------



## 🎭 Defined Roles## 🎭 Roles Definidos



### 1️⃣ **shiftbook.operator** (Operator)### 1️⃣ **shiftbook.operator** (Operador)

**Description**: "Can read categories and create/read logs"**Descripción**: "Can read categories and create/read logs"



**Permissions**:**Permisos**:

- ✅ **READ**: Categories, logs, email configuration, translations, work centers- ✅ **READ**: Categorías, logs, configuración de emails, traducciones, centros de trabajo

- ✅ **CREATE**: Logs (create shift book entries)- ✅ **CREATE**: Logs (crear entradas en el shift book)

- ✅ **Allowed actions**:- ✅ **Acciones permitidas**:

  - `addShiftBookEntry` - Create log from DMC  - `addShiftBookEntry` - Crear log desde DMC

  - `batchAddShiftBookEntries` - Create multiple logs  - `batchAddShiftBookEntries` - Crear múltiples logs

  - `advancedCategorySearch` - Advanced category search  - `advancedCategorySearch` - Búsqueda avanzada de categorías

  - `advancedLogSearch` - Advanced log search  - `advancedLogSearch` - Búsqueda avanzada de logs

  - `getMailRecipients` - Query email recipients  - `getMailRecipients` - Consultar destinatarios

  - `getShiftBookLogsPaginated` - View paginated logs  - `getShiftBookLogsPaginated` - Ver logs paginados

  - `getLatestShiftbookLog` - Get latest log  - `getLatestShiftbookLog` - Obtener último log

  - `getShiftbookCategories` - View categories  - `getShiftbookCategories` - Ver categorías

  - `markLogAsRead` / `markLogAsUnread` - Mark logs as read/unread  - `markLogAsRead` / `markLogAsUnread` - Marcar logs

  - `batchMarkLogsAsRead` / `batchMarkLogsAsUnread` - Batch mark logs  - `batchMarkLogsAsRead` / `batchMarkLogsAsUnread` - Marcar múltiples

  - `getLastChangeTimestamp` - View last change timestamp  - `getLastChangeTimestamp` - Ver timestamp de cambios



**Restrictions**:**Restricciones**:

- ❌ **CANNOT** modify (UPDATE) logs- ❌ **NO puede** modificar (UPDATE) logs

- ❌ **CANNOT** delete (DELETE) logs- ❌ **NO puede** eliminar (DELETE) logs

- ❌ **CANNOT** modify categories- ❌ **NO puede** modificar categorías

- ❌ **CANNOT** execute administrative actions- ❌ **NO puede** ejecutar acciones administrativas



------



### 2️⃣ **shiftbook.admin** (Administrator)### 2️⃣ **shiftbook.admin** (Administrador)

**Description**: "Full access to all operations"**Descripción**: "Full access to all operations"



**Permissions**:**Permisos**:

- ✅ **ALL operator permissions** +- ✅ **TODO lo del operator** +

- ✅ **FULL WRITE**: Create, modify, delete on all entities- ✅ **WRITE** completo: Crear, modificar, eliminar en todas las entidades

- ✅ **Exclusive administrative actions**:- ✅ **Acciones administrativas exclusivas**:

  - `createCategoryWithDetails` - Create complete category  - `createCategoryWithDetails` - Crear categoría completa

  - `updateCategoryWithDetails` - Update category  - `updateCategoryWithDetails` - Actualizar categoría

  - `deleteCategoryCascade` - Delete category in cascade  - `deleteCategoryCascade` - Eliminar categoría en cascada

  - `batchInsertMails` - Configure bulk emails  - `batchInsertMails` - Configurar emails masivos

  - `batchInsertTranslations` - Configure bulk translations  - `batchInsertTranslations` - Configurar traducciones masivas

  - `batchInsertWorkcenters` - Configure bulk work centers  - `batchInsertWorkcenters` - Configurar centros de trabajo

  - `sendMailByCategory` - Send manual emails  - `sendMailByCategory` - Enviar emails manuales



------



## 🖥️ Authentication by Environment## 🖥️ Autenticación por Entorno



### **Development** (Local Development)### **Development** (Desarrollo Local)

**Type**: `dummy` (simulated authentication with predefined users)**Tipo**: `dummy` (autenticación simulada con usuarios predefinidos)



**Available users**:**Usuarios disponibles**:

```json```json

{{

  "alice": {  "alice": {

    "roles": ["shiftbook.admin", "shiftbook.operator"],    "roles": ["shiftbook.admin", "shiftbook.operator"],

    "password": "alice"    "password": "alice"

  },  },

  "bob": {  "bob": {

    "roles": ["shiftbook.operator"],    "roles": ["shiftbook.operator"],

    "password": "bob"    "password": "bob"

  },  },

  "admin": {  "admin": {

    "roles": ["shiftbook.admin", "shiftbook.operator"],    "roles": ["shiftbook.admin", "shiftbook.operator"],

    "password": "admin"    "password": "admin"

  },  },

  "operator": {  "operator": {

    "roles": ["shiftbook.operator"],    "roles": ["shiftbook.operator"],

    "password": "operator"    "password": "operator"

  }  }

}}

``````



**How to use**:**Cómo usar**:

```bash```bash

# Start development server# Iniciar servidor en desarrollo

npm run devnpm run dev



# Or with watch mode# O con watch mode

cds watchcds watch

``````



**Example HTTP authentication**:**Ejemplo de autenticación en HTTP requests**:

```http```http

POST http://localhost:4004/shiftbook/ShiftBookService/addShiftBookEntryPOST http://localhost:4004/shiftbook/ShiftBookService/addShiftBookEntry

Authorization: Basic alice:Authorization: Basic alice:

Content-Type: application/jsonContent-Type: application/json



{{

  "werks": "1000",  "werks": "1000",

  "shoporder": "TEST001",  "shoporder": "TEST001",

  ...  ...

}}

``````



------



### **Test** (Automated Testing)### **Test** (Pruebas Automatizadas)

**Type**: `dummy` (test users)**Tipo**: `dummy` (usuarios de prueba)



**Available users**:**Usuarios disponibles**:

```json```json

{{

  "test-operator": {  "test-operator": {

    "roles": ["shiftbook.operator"]    "roles": ["shiftbook.operator"]

  },  },

  "test-admin": {  "test-admin": {

    "roles": ["shiftbook.admin", "shiftbook.operator"]    "roles": ["shiftbook.admin", "shiftbook.operator"]

  }  }

}}

``````



**How to use**:**Cómo usar**:

```bash```bash

npm testnpm test

npm run test:integrationnpm run test:integration

npm run test:e2enpm run test:e2e

``````



------



### **Hybrid** (Development with BTP)### **Hybrid** (Desarrollo con BTP)

**Type**: `xsuaa` (real BTP authentication)**Tipo**: `xsuaa` (autenticación real de BTP)



**Configuration**:**Configuración**:

- Uses XSUAA service binding from BTP- Usa XSUAA service binding de BTP

- Real JWT tokens- Tokens JWT reales

- Roles assigned in BTP Cockpit- Roles asignados en BTP Cockpit



**How to use**:**Cómo usar**:

```bash```bash

# Configure hybrid profile# Configurar hybrid profile

cf bind-service shiftbook-srv shiftbook-authcf bind-service shiftbook-srv shiftbook-auth

npm run hybridnpm run hybrid

``````



------



### **Production** (Production on BTP)### **Production** (Producción en BTP)

**Type**: `xsuaa` (real BTP authentication)**Tipo**: `xsuaa` (autenticación real de BTP)



**Configuration**:**Configuración**:

- Full authentication via XSUAA- Autenticación completa via XSUAA

- OAuth2 with JWT tokens- OAuth2 con tokens JWT

- Token validity: 2 hours- Token validity: 2 horas

- Refresh token validity: 24 hours- Refresh token validity: 24 horas

- Grant types: `client_credentials`, `urn:ietf:params:oauth:grant-type:jwt-bearer`- Grant types: `client_credentials`, `urn:ietf:params:oauth:grant-type:jwt-bearer`



**Role Collections in BTP**:**Role Collections en BTP**:

``````

shiftbook.operator (shiftbook-srv manu-dev-org-dev)shiftbook.operator (shiftbook-srv manu-dev-org-dev)

shiftbook.admin (shiftbook-srv manu-dev-org-dev)shiftbook.admin (shiftbook-srv manu-dev-org-dev)

``````



------



## 🚀 Assigning Roles to Users in BTP## 🚀 Asignar Roles a Usuarios en BTP



### **Step 1: Access BTP Cockpit**### **Paso 1: Acceder a BTP Cockpit**

1. Go to your subaccount (e.g., `manu-dev-org-dev`)1. Ve a tu subaccount (ej: `manu-dev-org-dev`)

2. Navigate to **Security → Role Collections**2. Navega a **Security → Role Collections**



### **Step 2: Select Role Collection**### **Paso 2: Seleccionar Role Collection**

You will see two role collections:Verás dos role collections:

- `shiftbook.operator (shiftbook-srv manu-dev-org-dev)`- `shiftbook.operator (shiftbook-srv manu-dev-org-dev)`

- `shiftbook.admin (shiftbook-srv manu-dev-org-dev)`- `shiftbook.admin (shiftbook-srv manu-dev-org-dev)`



### **Step 3: Assign to User**### **Paso 3: Asignar a Usuario**

1. Click on the desired Role Collection1. Click en el Role Collection deseado

2. Click **"Edit"**2. Click en **"Edit"**

3. In the **"Users"** section, add:3. En la sección **"Users"**, añade:

   - **ID Type**: Email or User   - **ID Type**: Email o User

   - **User ID**: User's email (e.g., `user@company.com`)   - **User ID**: El email del usuario (ej: `usuario@empresa.com`)

4. Click **"Save"**4. Click **"Save"**



### **Step 4: Verify Assignment**### **Paso 4: Verificar Asignación**

- User must log out and log back in- El usuario debe cerrar sesión y volver a entrar

- Roles will be applied on next login- Los roles se aplicarán en el siguiente login

- JWT tokens will include assigned roles- Los tokens JWT incluirán los roles asignados



------



## 🧪 Testing Authentication Locally## 🧪 Probar Autenticación Local



### **Test as Operator** (Bob)### **Probar como Operator** (Bob)

```http```http

POST http://localhost:4004/shiftbook/ShiftBookService/addShiftBookEntryPOST http://localhost:4004/shiftbook/ShiftBookService/addShiftBookEntry

Authorization: Basic bob:bobAuthorization: Basic bob:bob

Content-Type: application/jsonContent-Type: application/json



{{

  "werks": "1000",  "werks": "1000",

  "shoporder": "TEST001",  "shoporder": "TEST001",

  "stepid": "0010",  "stepid": "0010",

  "split": "001",  "split": "001",

  "workcenter": "TEST_WC",  "workcenter": "TEST_WC",

  "user_id": "bob@test.com",  "user_id": "bob@test.com",

  "category": "PASTE_CATEGORY_ID_HERE",  "category": "PASTE_CATEGORY_ID_HERE",

  "subject": "Test log",  "subject": "Test log",

  "message": "Testing operator permissions"  "message": "Testing operator permissions"

}}

``````



**Expected result**: ✅ 200 OK (operator can create logs)**Resultado esperado**: ✅ 200 OK (operator puede crear logs)



------



### **Test as Operator - NOT Allowed Action**### **Probar como Operator - Acción NO permitida**

```http```http

POST http://localhost:4004/shiftbook/ShiftBookService/createCategoryWithDetailsPOST http://localhost:4004/shiftbook/ShiftBookService/createCategoryWithDetails

Authorization: Basic bob:bobAuthorization: Basic bob:bob

Content-Type: application/jsonContent-Type: application/json



{{

  "werks": "1000",  "werks": "1000",

  "sendmail": 1,  "sendmail": 1,

  "translations": [...]  "translations": [...]

}}

``````



**Expected result**: ❌ 403 Forbidden (operator CANNOT create categories)**Resultado esperado**: ❌ 403 Forbidden (operator NO puede crear categorías)



------



### **Test as Admin** (Alice)### **Probar como Admin** (Alice)

```http```http

POST http://localhost:4004/shiftbook/ShiftBookService/createCategoryWithDetailsPOST http://localhost:4004/shiftbook/ShiftBookService/createCategoryWithDetails

Authorization: Basic alice:aliceAuthorization: Basic alice:alice

Content-Type: application/jsonContent-Type: application/json



{{

  "werks": "1000",  "werks": "1000",

  "sendmail": 1,  "sendmail": 1,

  "sendworkcenters": 1,  "sendworkcenters": 1,

  "translations": [  "translations": [

    { "lng": "en", "desc": "New category" }    { "lng": "es", "desc": "Nueva categoría" }

  ],  ],

  "teamsChannel": {  "teamsChannel": {

    "name": "Test Channel",    "name": "Test Channel",

    "webhookURL": "https://mysyntax.webhook.office.com/webhookb2/...",    "webhookURL": "https://mysyntax.webhook.office.com/webhookb2/...",

    "active": true    "active": true

  }  }

}}

``````



**Expected result**: ✅ 200 OK (admin can create categories)**Resultado esperado**: ✅ 200 OK (admin puede crear categorías)



------



## 🔍 Verifying Authentication in Logs## 🔍 Verificar Autenticación en Logs



Logs will show authentication information:Los logs mostrarán información de autenticación:



``````

Authentication: JWT authenticated user: alice with roles: ['shiftbook.admin', 'shiftbook.operator']Authentication: JWT authenticated user: alice with roles: ['shiftbook.admin', 'shiftbook.operator']

``````



Or for unauthorized users:O para usuarios sin autorización:



``````

[SECURITY] Authorization failed for user: bob, required roles: ['shiftbook.admin'][SECURITY] Authorization failed for user: bob, required roles: ['shiftbook.admin']

``````



------



## 📊 Permission Matrix by Entity## 📊 Tabla de Permisos por Entidad



| Entity | Operator READ | Operator CREATE | Operator UPDATE | Operator DELETE | Admin FULL || Entidad | Operator READ | Operator CREATE | Operator UPDATE | Operator DELETE | Admin FULL |

|---------|--------------|-----------------|-----------------|-----------------|------------||---------|--------------|-----------------|-----------------|-----------------|------------|

| ShiftBookLog | ✅ | ✅ | ❌ | ❌ | ✅ || ShiftBookLog | ✅ | ✅ | ❌ | ❌ | ✅ |

| ShiftBookCategory | ✅ | ❌ | ❌ | ❌ | ✅ || ShiftBookCategory | ✅ | ❌ | ❌ | ❌ | ✅ |

| ShiftBookCategoryMail | ✅ | ❌ | ❌ | ❌ | ✅ || ShiftBookCategoryMail | ✅ | ❌ | ❌ | ❌ | ✅ |

| ShiftBookCategoryLng | ✅ | ❌ | ❌ | ❌ | ✅ || ShiftBookCategoryLng | ✅ | ❌ | ❌ | ❌ | ✅ |

| ShiftBookCategoryWC | ✅ | ❌ | ❌ | ❌ | ✅ || ShiftBookCategoryWC | ✅ | ❌ | ❌ | ❌ | ✅ |

| ShiftBookLogWC | ✅ | ❌ | ❌ | ❌ | ✅ || ShiftBookLogWC | ✅ | ❌ | ❌ | ❌ | ✅ |

| ShiftBookTeamsChannel | ✅ | ❌ | ❌ | ❌ | ✅ || ShiftBookTeamsChannel | ✅ | ❌ | ❌ | ❌ | ✅ |



------



## 🛡️ Security## 🛡️ Seguridad



### **Service-Level Protection**### **Protección a Nivel de Servicio**

The entire service requires authentication:El servicio completo requiere autenticación:

```cds```cds

service ShiftBookService @(requires: ['shiftbook.operator', 'shiftbook.admin'])service ShiftBookService @(requires: ['shiftbook.operator', 'shiftbook.admin'])

``````



### **Entity-Level Protection**### **Protección a Nivel de Entidad**

```cds```cds

@restrict: [@restrict: [

  { grant: 'READ', to: ['shiftbook.operator', 'shiftbook.admin'] },  { grant: 'READ', to: ['shiftbook.operator', 'shiftbook.admin'] },

  { grant: 'CREATE', to: ['shiftbook.operator', 'shiftbook.admin'] },  { grant: 'CREATE', to: ['shiftbook.operator', 'shiftbook.admin'] },

  { grant: 'UPDATE,DELETE', to: 'shiftbook.admin' }  { grant: 'UPDATE,DELETE', to: 'shiftbook.admin' }

]]

entity ShiftBookLog as projection on db.ShiftBookLog;entity ShiftBookLog as projection on db.ShiftBookLog;

``````



### **Action-Level Protection**### **Protección a Nivel de Acción**

```cds```cds

@requires: 'shiftbook.admin'@requires: 'shiftbook.admin'

action createCategoryWithDetails(...) returns UUID;action createCategoryWithDetails(...) returns UUID;



@requires: ['shiftbook.operator', 'shiftbook.admin']@requires: ['shiftbook.operator', 'shiftbook.admin']

action addShiftBookEntry(...) returns ShiftBookLogResult;action addShiftBookEntry(...) returns ShiftBookLogResult;

``````



------



## 🚨 Troubleshooting## 🚨 Troubleshooting



### **Error: 403 Forbidden**### **Error: 403 Forbidden**

**Cause**: User doesn't have the required role**Causa**: Usuario no tiene el rol necesario



**Solution**:**Solución**:

1. Verify user has the role assigned in BTP (production)1. Verificar que el usuario tiene el rol asignado en BTP (producción)

2. Verify you're using the correct user (development: alice, bob, admin, operator)2. Verificar que estás usando el usuario correcto (desarrollo: alice, bob, admin, operator)

3. Review logs to see which role is required3. Revisar logs para ver qué rol se requiere



### **Error: 401 Unauthorized**### **Error: 401 Unauthorized**

**Cause**: No authentication provided**Causa**: No se proporcionó autenticación



**Solution**:**Solución**:

1. Add `Authorization: Basic username:password` header in development1. Añadir header `Authorization: Basic username:password` en desarrollo

2. Include valid JWT token in production2. Incluir JWT token válido en producción



### **Roles not applied in production**### **Los roles no se aplican en producción**

**Cause**: `CDS_ENV` not configured correctly**Causa**: `CDS_ENV` no está configurado correctamente



**Solution**:**Solución**:

1. Verify `mta.yaml` has `CDS_ENV: production`1. Verificar que `mta.yaml` tiene `CDS_ENV: production`

2. Verify XSUAA service is bound correctly: `cf services`2. Verificar que XSUAA service está bound correctamente: `cf services`

3. Redeploy: `npm run deploy`3. Redesplegar: `npm run deploy`



### **User without roles can do everything**### **Usuario sin roles puede hacer todo**

**Cause**: Authentication in `mocked` mode**Causa**: Autenticación en modo `mocked`



**Solution**:**Solución**:

1. Verify `.env` file has `CDS_ENV=development`1. Verificar archivo `.env` tiene `CDS_ENV=development`

2. Verify `package.json` uses `kind: dummy` (not `mocked`)2. Verificar `package.json` usa `kind: dummy` (no `mocked`)

3. Restart server: `npm run dev`3. Reiniciar servidor: `npm run dev`



------



## 📝 Configuration Files## 📝 Configuración de Archivos



### **xs-security.json** (Role definitions)### **xs-security.json** (Definición de roles)

```json```json

{{

  "scopes": [  "scopes": [

    {    {

      "name": "$XSAPPNAME.operator",      "name": "$XSAPPNAME.operator",

      "description": "read categories and create/read logs"      "description": "read categories and create/read logs"

    },    },

    {    {

      "name": "$XSAPPNAME.admin",      "name": "$XSAPPNAME.admin",

      "description": "full access to all operations"      "description": "full access to all operations"

    }    }

  ],  ],

  "role-templates": [  "role-templates": [

    {    {

      "name": "shiftbook.operator",      "name": "shiftbook.operator",

      "scope-references": ["$XSAPPNAME.operator"]      "scope-references": ["$XSAPPNAME.operator"]

    },    },

    {    {

      "name": "shiftbook.admin",      "name": "shiftbook.admin",

      "scope-references": ["$XSAPPNAME.admin"]      "scope-references": ["$XSAPPNAME.admin"]

    }    }

  ]  ]

}}

``````



### **mta.yaml** (Role Collections)### **mta.yaml** (Role Collections)

```yaml```yaml

role-collections:role-collections:

  - name: 'shiftbook.operator (shiftbook-srv ${org}-${space})'  - name: 'shiftbook.operator (shiftbook-srv ${org}-${space})'

    description: 'Shiftbook Operator - Can read categories and create/read logs'    description: 'Shiftbook Operator - Can read categories and create/read logs'

    role-template-references:    role-template-references:

      - 'shiftbook.operator'      - 'shiftbook.operator'

  - name: 'shiftbook.admin (shiftbook-srv ${org}-${space})'  - name: 'shiftbook.admin (shiftbook-srv ${org}-${space})'

    description: 'Shiftbook Administrator - Full access to all operations'    description: 'Shiftbook Administrator - Full access to all operations'

    role-template-references:    role-template-references:

      - 'shiftbook.admin'      - 'shiftbook.admin'

``````



### **package.json** (Configuration by environment)### **package.json** (Configuración por entorno)

```json```json

"auth": {"auth": {

  "[development]": {  "[development]": {

    "kind": "dummy",    "kind": "dummy",

    "users": { ... }    "users": { ... }

  },  },

  "[production]": {  "[production]": {

    "kind": "xsuaa"    "kind": "xsuaa"

  }  }

}}

``````



------



## ✅ Implementation Checklist## ✅ Checklist de Implementación



- [x] Roles defined in `xs-security.json`- [x] Roles definidos en `xs-security.json`

- [x] Role Collections configured in `mta.yaml`- [x] Role Collections configuradas en `mta.yaml`

- [x] Dummy authentication in development with test users- [x] Autenticación dummy en desarrollo con usuarios de prueba

- [x] XSUAA enabled in hybrid and production- [x] XSUAA habilitado en hybrid y production

- [x] `@requires` on service and actions- [x] `@requires` en servicio y acciones

- [x] `@restrict` on entities with granular permissions- [x] `@restrict` en entidades con permisos granulares

- [x] Variable `CDS_ENV=production` in mta.yaml- [x] Variable `CDS_ENV=production` en mta.yaml

- [x] Documentation for roles and permissions- [x] Documentación de roles y permisos

- [x] Tests with different users and roles- [x] Tests con diferentes usuarios y roles

- [ ] Assign Role Collections to users in BTP Cockpit (manual)- [ ] Asignar Role Collections a usuarios en BTP Cockpit (manual)



------



## 📚 References## 📚 Referencias



- [SAP CAP Security Guide](https://cap.cloud.sap/docs/guides/security/)- [SAP CAP Security Guide](https://cap.cloud.sap/docs/guides/security/)

- [XSUAA Configuration](https://help.sap.com/docs/btp/sap-business-technology-platform/xsuaa)- [XSUAA Configuration](https://help.sap.com/docs/btp/sap-business-technology-platform/xsuaa)

- [Role-Based Access Control](https://cap.cloud.sap/docs/guides/authorization)- [Role-Based Access Control](https://cap.cloud.sap/docs/guides/authorization)

- [BTP Role Collections](https://help.sap.com/docs/btp/sap-business-technology-platform/managing-role-collections)- [BTP Role Collections](https://help.sap.com/docs/btp/sap-business-technology-platform/managing-role-collections)



------



**Last updated**: October 6, 2025**Última actualización**: 6 de octubre de 2025

