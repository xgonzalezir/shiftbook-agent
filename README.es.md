# ShiftBook - Servicio de Gestión de Turnos SAP CAP

## Tabla de Contenidos
- [Propósito de Negocio](#propósito-de-negocio)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
  - [Arquitectura Backend](#arquitectura-backend)
  - [Arquitectura Frontend](#arquitectura-frontend)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Comenzando](#comenzando)
  - [Requisitos Previos](#requisitos-previos)
  - [Instalación](#instalación)
  - [Configuración de Base de Datos](#configuración-de-base-de-datos)
  - [Ejecutar la Aplicación](#ejecutar-la-aplicación)
- [Desarrollo](#desarrollo)
- [Pruebas](#pruebas)
- [Despliegue](#despliegue)
- [Configuración](#configuración)
- [Seguridad](#seguridad)
- [Gobernanza y Cumplimiento](#gobernanza-y-cumplimiento)

---

## Propósito de Negocio

ShiftBook es un sistema empresarial de gestión de turnos y comunicación diseñado para el Entorno de Manufactura Digital de SAP (SAP DME). Proporciona una solución integral para gestionar registros de turnos, categorías y comunicaciones a través de múltiples centros de trabajo y plantas (werks).

### Características Clave de Negocio

- **Gestión de Registros de Turnos**: Crear, leer, actualizar y rastrear registros de turnos con metadatos enriquecidos incluyendo órdenes de fabricación, centros de trabajo y marcas de tiempo
- **Gestión de Categorías**: Organizar registros en categorías configurables con soporte multilingüe (Inglés, Alemán, Español, Francés, Italiano, Portugués)
- **Notificaciones Multicanal**: Notificaciones automáticas por correo electrónico y Microsoft Teams basadas en la configuración de categoría
- **Enrutamiento de Centros de Trabajo**: Distribución inteligente de registros a centros de trabajo destino con seguimiento de leído/no leído
- **Pista de Auditoría**: Registro de auditoría completo para cumplimiento y trazabilidad
- **Control de Acceso Basado en Roles**: Permisos granulares con roles de Operador y Administrador
- **Soporte Multi-Tenant**: Datos aislados por planta (werks) para despliegue a nivel empresarial

### Casos de Uso

- Documentación y comunicación de traspaso de turnos
- Seguimiento y escalamiento de problemas de producción
- Transferencia de conocimiento entre turnos
- Registro de incidentes de mantenimiento y calidad
- Notificaciones en tiempo real a centros de trabajo y partes interesadas relevantes

---

## Stack Tecnológico

### Tecnologías Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **SAP Cloud Application Programming Model (CAP)** | ^9.2.0 | Framework principal para desarrollo de servicios |
| **Node.js** | ^18.x | Runtime de JavaScript |
| **TypeScript** | ^5.8.3 | Desarrollo con tipado seguro |
| **SAP HANA Cloud** | Última | Base de datos de producción (contenedores HDI) |
| **SQLite** | ^2.0.2 | Base de datos para desarrollo y pruebas |
| **Express** | ^4.x | Framework de servidor HTTP |
| **XSUAA** | ^4.x | Autenticación y autorización |

### Librerías Principales

- **@cap-js/hana**: Integración con base de datos HANA
- **@sap/cds-mtxs**: Multi-tenancy y extensibilidad
- **@sap-cloud-sdk**: SAP Cloud SDK para conectividad
- **nodemailer**: Integración de servicio de correo electrónico
- **winston**: Registro estructurado con rotación diaria
- **axios**: Cliente HTTP para servicios externos
- **passport**: Middleware de autenticación
- **handlebars**: Motor de plantillas para correos electrónicos

### Herramientas de Desarrollo

- **Jest**: Pruebas unitarias, de integración y E2E
- **TypeScript**: Verificación de tipos estáticos
- **ESLint**: Análisis de calidad de código
- **ts-jest**: Soporte de TypeScript para Jest
- **@cap-js/cds-typer**: Generación de tipos desde modelos CDS

### Plataforma Cloud

- **SAP Business Technology Platform (BTP)**
- **Cloud Foundry Runtime**
- **Servicio XSUAA**: Autenticación de usuarios
- **Servicio Destination**: Conectividad con sistemas externos
- **SAP HANA Cloud**: Servicio de base de datos

---

## Arquitectura

### Arquitectura Backend

ShiftBook sigue una arquitectura por capas basada en las mejores prácticas de SAP CAP:

```
┌─────────────────────────────────────────────────────────────┐
│                   Capa API (OData V4)                        │
│              /shiftbook/ShiftBookService                     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Capa de Servicio (CAP)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Servicio     │  │ Gestión de   │  │ Servicio de     │  │
│  │ ShiftBook    │  │ Categorías   │  │ Notificaciones  │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Capa de Lógica de Negocio                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Validadores  │  │ Servicio de  │  │ Integración     │  │
│  │              │  │ Email        │  │ Teams           │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Optimizador  │  │ Monitor de   │  │ Circuit         │  │
│  │ de Consultas │  │ Rendimiento  │  │ Breaker         │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Capa de Middleware                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Middleware   │  │ Middleware   │  │ Manejador de    │  │
│  │ de Auth      │  │ de Logging   │  │ Errores         │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Detector de  │  │ Registro de  │                        │
│  │ Idioma       │  │ Auditoría    │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Capa de Acceso a Datos                     │
│              Abstracción de Base de Datos CDS                │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Gestor de    │  │ Monitor de   │  │ Servicio de     │  │
│  │ Conexiones   │  │ Pool         │  │ Consultas       │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Capa de Base de Datos                      │
│     SAP HANA Cloud (Producción) / SQLite (Desarrollo)       │
└─────────────────────────────────────────────────────────────┘
```

#### Componentes Backend Clave

1. **Capa de Servicio** (`srv/shiftbook-service.ts`)
   - Implementación de servicio OData V4
   - Acciones y funciones de negocio
   - Aplicación de autorización

2. **Lógica de Negocio** (`srv/lib/`)
   - `business-validator.ts`: Validación de entrada y reglas de negocio
   - `email-service.ts`: Entrega de correo electrónico multicanal
   - `email-templates.ts`: Plantillas basadas en Handlebars
   - `optimized-query-service.ts`: Optimización de consultas y caché

3. **Middleware** (`srv/lib/`)
   - `auth-logger.ts`: Seguimiento de autenticación
   - `auth-monitor.ts`: Monitoreo de seguridad
   - `logging-middleware.ts`: Registro de solicitudes/respuestas
   - `language-middleware.ts`: Soporte de I18n
   - `error-handler.ts`: Manejo centralizado de errores

4. **Monitoreo y Resiliencia** (`srv/lib/`)
   - `performance-monitor.ts`: Métricas de rendimiento
   - `connection-pool-monitor.ts`: Seguimiento de conexiones de base de datos
   - `circuit-breaker.ts`: Protección de servicios externos
   - `audit-logger.ts`: Registro de cumplimiento

5. **Modelo de Datos** (`db/schema.cds`)
   - `ShiftBookLog`: Entidad principal de registro de turnos
   - `ShiftBookCategory`: Configuración de categorías
   - `ShiftBookCategoryLng`: Traducciones
   - `ShiftBookCategoryMail`: Destinatarios de correo electrónico
   - `ShiftBookCategoryWC`: Asignaciones de centros de trabajo
   - `ShiftBookLogWC`: Relaciones registro-a-centro de trabajo
   - `ShiftBookTeamsChannel`: Integración con Teams
   - `AuditLog`: Pista de auditoría

### Arquitectura Frontend

El frontend está diseñado para integración con SAP Fiori, típicamente desplegado como aplicaciones SAP Fiori Elements o UI5 personalizadas.

```
┌─────────────────────────────────────────────────────────────┐
│                   SAP Fiori Launchpad                        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Aplicaciones UI5                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Gestión de   │  │ Admin de     │  │ Reportes y      │  │
│  │ Registros    │  │ Categorías   │  │ Analíticas      │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Cliente OData V4                           │
│              (@sap-cloud-sdk/http-client)                    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Servicio CAP ShiftBook                     │
│              /shiftbook/ShiftBookService                     │
└─────────────────────────────────────────────────────────────┘
```

#### Puntos de Integración Frontend

- **Servicio OData V4**: Operaciones CRUD completas vía `/shiftbook/ShiftBookService`
- **Acciones Personalizadas**: Operaciones por lotes, búsqueda avanzada, paginación
- **Autenticación**: Integración SSO basada en XSUAA
- **I18n**: Soporte multilingüe vía traducciones del lado del servicio

---

## Estructura del Proyecto

```
shift-book/
├── db/                              # Modelos y artefactos de base de datos
│   ├── schema.cds                   # Definiciones del modelo de datos principal
│   ├── data/                        # Datos iniciales/de prueba
│   │   ├── dev/                     # Datos semilla de desarrollo
│   │   └── backup/                  # Respaldos de datos
│   ├── src/                         # Procedimientos/funciones de base de datos
│   └── package.json                 # Configuración del deployer de BD
│
├── srv/                             # Capa de servicio
│   ├── shiftbook-service.cds        # Definiciones de servicio
│   ├── ShiftBookService.ts          # Implementación servicio #1 (¡debe sincronizar!)
│   ├── shiftbook-service.ts         # Implementación servicio #2 (¡debe sincronizar!)
│   ├── server.js                    # Servidor Express personalizado
│   ├── health-check.ts              # Endpoints de verificación de salud
│   └── lib/                         # Librerías de lógica de negocio
│       ├── audit-logger.ts          # Registro de auditoría
│       ├── auth-logger.ts           # Registro de autenticación
│       ├── auth-monitor.ts          # Monitoreo de seguridad
│       ├── business-validator.ts    # Reglas de validación
│       ├── circuit-breaker.ts       # Patrones de resiliencia
│       ├── connection-pool-monitor.ts
│       ├── database-connection.ts   # Utilidades de BD
│       ├── email-service.ts         # Entrega de correo electrónico
│       ├── email-templates.ts       # Plantillas de correo
│       ├── error-handler.ts         # Manejo de errores
│       ├── error-messages.ts        # Catálogo de mensajes de error
│       ├── language-detector.ts     # Detección de I18n
│       ├── language-middleware.ts   # Middleware de I18n
│       ├── logging-middleware.ts    # Registro de solicitudes
│       ├── optimized-query-service.ts
│       └── performance-monitor.ts
│
├── test/                            # Suites de pruebas
│   ├── unit/                        # Pruebas unitarias
│   ├── integration/                 # Pruebas de integración
│   ├── e2e/                         # Pruebas de extremo a extremo
│   ├── service/                     # Pruebas de capa de servicio
│   ├── workflow/                    # Pruebas de flujo de trabajo
│   ├── fixtures/                    # Datos de prueba
│   ├── utils/                       # Utilidades de prueba
│   └── README.md                    # Documentación de pruebas
│
├── _i18n/                           # Internacionalización
│   ├── en.json                      # Traducciones en inglés
│   ├── de.json                      # Traducciones en alemán
│   ├── es.json                      # Traducciones en español
│   ├── fr.json                      # Traducciones en francés
│   ├── it.json                      # Traducciones en italiano
│   └── pt.json                      # Traducciones en portugués
│
├── config/                          # Archivos de configuración
│   ├── auth/                        # Configuraciones de autenticación
│   └── database.js                  # Configuraciones de base de datos
│
├── scripts/                         # Scripts de utilidad
│   ├── setup-dev-data.js            # Configuración de datos de desarrollo
│   ├── generate-coverage-report.js  # Reporte de cobertura de pruebas
│   ├── test-connection-pool.js      # Prueba de pool de conexiones
│   ├── test-performance-monitoring.js
│   └── test-structured-logging.js
│
├── __frontend/                      # Placeholder de frontend
│   └── xs.security.json             # Configuración de seguridad frontend
│
├── .taskmaster/                     # Documentación del proyecto y gobernanza
├── docs/                            # Documentación adicional
├── coverage-reports/                # Reportes de cobertura de pruebas
├── performance-reports/             # Métricas de rendimiento
│
├── .env.example                     # Plantilla de variables de entorno
├── package.json                     # Dependencias de Node.js
├── tsconfig.json                    # Configuración de TypeScript
├── jest.config.js                   # Configuración de pruebas Jest
├── eslint.config.mjs                # Configuración de ESLint
├── mta.yaml                         # Descriptor de despliegue MTA
├── manifest.yml                     # Manifiesto de Cloud Foundry
├── xs-security.json                 # Configuración de seguridad XSUAA
├── docs/
│   ├── CHANGELOG.md                 # Historial de versiones
│   ├── CONTRIBUTING.md              # Guías de contribución
│   └── DESTINATION_CONFIG.md        # Guía de configuración de destinos
└── LICENSE                          # Información de licencia
```

---

## Comenzando

### Requisitos Previos

Antes de configurar la aplicación ShiftBook, asegúrese de tener instalado lo siguiente:

#### Software Requerido

| Software | Versión Mínima | Propósito |
|----------|---------------|-----------|
| **Node.js** | 18.x o superior | Runtime de JavaScript |
| **npm** | 8.x o superior | Gestor de paquetes |
| **@sap/cds-dk** | 9.x | Toolkit de desarrollo SAP CAP |
| **Cloud Foundry CLI** | Última | Despliegue en BTP (producción) |
| **MBT** | Última | Herramienta de construcción de aplicaciones multi-objetivo |
| **Git** | Última | Control de versiones |

#### Software Opcional (para escenarios específicos)

- **SQLite3**: Para inspección de base de datos local (preinstalado en macOS/Linux)
- **SAP HANA Client**: Para acceso directo a base de datos HANA
- **Docker**: Para desarrollo en contenedores (opcional)

#### Servicios de SAP BTP (para despliegue en producción)

- Instancia de SAP HANA Cloud
- Instancia de servicio XSUAA
- Instancia de servicio Destination
- Espacio de Cloud Foundry con cuotas apropiadas

### Instalación

#### 1. Clonar el Repositorio

```bash
git clone https://github.com/syntax-gbi/shift-book-1.git
cd shift-book
```

#### 2. Instalar Dependencias

```bash
npm install
```

Esto instalará todas las dependencias requeridas de Node.js incluyendo:
- Framework SAP CAP
- Compilador de TypeScript
- Frameworks de pruebas
- Librerías de lógica de negocio

#### 3. Instalar SAP CDS Development Kit (si no está instalado)

```bash
npm install -g @sap/cds-dk
```

Verificar la instalación:
```bash
cds version
```

#### 4. Instalar Cloud Foundry CLI (para despliegue en BTP)

Siga la [guía de instalación de Cloud Foundry CLI](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html) para su sistema operativo.

#### 5. Instalar Herramienta de Construcción MBT (para despliegue MTA)

```bash
npm install -g mbt
```

### Configuración de Base de Datos

ShiftBook soporta múltiples configuraciones de base de datos dependiendo del entorno.

#### Entorno de Desarrollo (SQLite)

SQLite se utiliza para desarrollo local con configuración mínima requerida.

##### 1. Inicializar Base de Datos de Desarrollo

```bash
npm run setup:dev-data
```

Este script:
- Creará el archivo de base de datos SQLite en `db/shiftbook-dev.db`
- Desplegará el esquema
- Cargará datos iniciales desde `db/data/dev/`

##### 2. Desplegar Esquema de Base de Datos

```bash
npm run db:deploy:dev
```

Esto ejecuta `cds deploy` con configuración específica de desarrollo.

##### 3. Verificar Base de Datos

```bash
sqlite3 db/shiftbook-dev.db ".tables"
```

Debería ver las siguientes tablas:
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookLog`
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookCategory`
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookCategoryMail`
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookCategoryLng`
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookCategoryWC`
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookLogWC`
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookTeamsChannel`
- `syntax_gbi_sap_dme_plugins_shiftbook_AuditLog`

#### Entorno de Pruebas (SQLite en Memoria)

Para pruebas, se utiliza una base de datos SQLite en memoria:

```bash
npm run db:deploy:test
```

Esto es manejado automáticamente por el framework de pruebas.

#### Entorno Híbrido (SAP HANA Cloud)

El modo híbrido se conecta a SAP HANA Cloud mientras se ejecuta localmente.

##### Requisitos Previos
- Instancia de SAP HANA Cloud aprovisionada
- Service key creada para contenedor HDI
- Credenciales configuradas en `cds.env.json`

##### 1. Crear Service Key

```bash
cf create-service-key shiftbook-db shiftbook-db-key
cf service-key shiftbook-db shiftbook-db-key
```

##### 2. Configurar Entorno Local

Crear o actualizar `cds.env.json`:

```json
{
  "requires": {
    "db": {
      "kind": "hana",
      "credentials": {
        "host": "<hana-host>",
        "port": "<hana-port>",
        "user": "<user>",
        "password": "<password>",
        "schema": "<schema>",
        "encrypt": true
      }
    }
  }
}
```

##### 3. Desplegar en HANA

```bash
npm run db:deploy:hybrid
```

#### Entorno de Producción (SAP HANA Cloud en BTP)

El despliegue en producción se maneja a través del proceso de construcción y despliegue MTA.

```bash
npm run build:mta
cf deploy mta_archives/shiftbook_1.0.0.mtar
```

El módulo deployer de base de datos (`shiftbook-db-deployer`) automáticamente:
1. Creará el contenedor HDI
2. Desplegará todos los objetos del esquema
3. Creará artefactos de base de datos
4. Configurará los permisos necesarios

### Ejecutar la Aplicación

#### Modo de Desarrollo (con recarga automática)

```bash
npm run dev
```

Esto:
- Configurará datos de desarrollo
- Iniciará el servidor CAP con `cds watch`
- Habilitará recarga automática en cambios de archivos
- Usará base de datos SQLite
- Usará autenticación simulada (dummy)
- Iniciará en `http://localhost:4004`

Acceder al servicio:
- **Raíz del servicio**: http://localhost:4004
- **Metadatos del servicio**: http://localhost:4004/shiftbook/ShiftBookService/$metadata
- **Verificación de salud**: http://localhost:4004/health
- **Vista previa Fiori**: http://localhost:4004/fiori.html

#### Modo de Producción (local)

```bash
npm run prod
```

Esto simula configuración de producción localmente:
- Variables de entorno de producción
- Configuraciones de rendimiento optimizadas
- Registro estructurado en JSON

#### Modo Híbrido (local + HANA Cloud)

```bash
npm run hybrid
```

Ejecutar localmente pero conectarse a base de datos SAP HANA Cloud.

#### Modo de Pruebas

```bash
npm run dev:test
```

Ejecutar con configuración específica de pruebas y base de datos en memoria.

---

## Desarrollo

### Flujo de Trabajo de Desarrollo

⚠️ **Importante**: Al modificar implementaciones de servicio, recuerde actualizar AMBOS:
- `srv/ShiftBookService.ts` 
- `srv/shiftbook-service.ts`

Consulte `docs/CONTRIBUTING.md` para detalles sobre este requisito crítico.

1. **Realizar Cambios**: Editar archivos TypeScript en `srv/` o archivos CDS en `db/` o `srv/`
2. **Actualizar Ambos Archivos**: Si cambia lógica de servicio, actualice ambos archivos de implementación
3. **Recarga Automática**: Los cambios se detectan automáticamente en modo desarrollo
4. **Seguridad de Tipos**: Ejecutar compilador TypeScript:
   ```bash
   npm run build:ts
   ```
5. **Análisis de Código**: Verificar calidad del código:
   ```bash
   npm run lint
   ```

### Scripts Disponibles

| Script | Propósito |
|--------|-----------|
| `npm start` | Iniciar servidor de producción |
| `npm run dev` | Modo desarrollo con recarga automática |
| `npm run watch` | Modo observación (alternativa a dev) |
| `npm run build` | Construcción completa de producción |
| `npm run build:dev` | Construcción de desarrollo |
| `npm run build:ts` | Compilar solo TypeScript |
| `npm run build:mta` | Construir archivo MTA para despliegue |
| `npm test` | Ejecutar todas las pruebas |
| `npm run test:unit` | Ejecutar solo pruebas unitarias |
| `npm run test:integration` | Ejecutar pruebas de integración |
| `npm run test:e2e` | Ejecutar pruebas de extremo a extremo |
| `npm run test:coverage` | Generar reporte de cobertura |

### Trabajando con TypeScript

El proyecto usa TypeScript para seguridad de tipos. Los tipos generados desde modelos CDS están disponibles:

```typescript
import { ShiftBookLog, ShiftBookCategory } from '#cds-models/syntax.gbi.sap.dme.plugins.shiftbook';
```

Regenerar tipos después de cambios en modelos CDS:

```bash
cds build
```

### Estilo de Código

- **Usar TypeScript** para todas las implementaciones de servicio en `srv/lib/`
- **Convenciones de Nomenclatura**: Usar kebab-case para archivos (ej., `email-service.ts`)
- **Seguridad de Tipos**: Evitar el tipo `any`, usar interfaces TypeScript apropiadas
- **Documentación**: Incluir comentarios JSDoc para funciones públicas
- **Manejo de Errores**: Seguir patrones existentes para manejo de errores y registro de auditoría
- **Registro de Auditoría**: Incluir registro de auditoría para todas las operaciones críticas
- **Nombres Significativos**: Usar nombres descriptivos para variables y funciones

### Variables de Entorno

Crear un archivo `.env` basado en `.env.example`:

```env
# Configuración del Servidor
PORT=4004
NODE_ENV=development
CDS_ENV=development

# Base de Datos
DB_KIND=sqlite
DB_URL=db/shiftbook-dev.db

# Registro
LOG_LEVEL=info
LOG_FORMAT=json

# Servicio de Correo Electrónico (opcional para desarrollo)
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=tu-email@example.com
MAIL_PASSWORD=tu-contraseña
MAIL_FROM=noreply@example.com

# Autenticación (para híbrido/producción)
XSUAA_URL=
XSUAA_CLIENTID=
XSUAA_CLIENTSECRET=
```

---

## Pruebas

ShiftBook incluye cobertura completa de pruebas en múltiples niveles con un **requisito mínimo de cobertura de código del 70%**.

### Estructura de Pruebas

```
test/
├── unit/                 # Pruebas unitarias rápidas y aisladas
├── integration/          # Pruebas de integración con base de datos
├── e2e/                  # Pruebas de flujo de trabajo de extremo a extremo
├── service/              # Pruebas de capa de servicio
└── workflow/             # Pruebas de flujo de trabajo de negocio
```

### Ejecutar Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar suites de pruebas específicas
npm run test:unit
npm run test:integration
npm run test:e2e

# Ejecutar con cobertura
npm run test:coverage

# Modo observación para TDD
npm run test:watch

# Limpiar caché de Jest
npm run test:clean
```

### Configuración de Pruebas

Las pruebas usan Jest con las siguientes configuraciones:
- `jest.config.js`: Configuración principal
- `jest.integration.config.js`: Pruebas de integración
- `jest.e2e.config.js`: Pruebas E2E
- `jest.debug.config.js`: Configuración de depuración

### Requisitos de Cobertura de Pruebas

- **Mínimo 70% de cobertura de código** en todos los tipos de prueba
- Las pruebas unitarias no deben tener dependencias externas
- Las pruebas de integración deben usar base de datos de prueba
- Las pruebas E2E deben cubrir flujos de trabajo críticos del negocio

### Escribir Pruebas

Ejemplo de prueba unitaria:

```typescript
import cds from '@sap/cds';

describe('ShiftBookService', () => {
  let service: any;

  beforeAll(async () => {
    service = await cds.connect.to('ShiftBookService');
  });

  test('debería crear registro de turno', async () => {
    const result = await service.addShiftBookEntry({
      werks: '1000',
      shoporder: 'SO123',
      workcenter: 'WC001',
      category: 'category-uuid',
      subject: 'Registro de Prueba',
      message: 'Mensaje de Prueba'
    });
    
    expect(result).toBeDefined();
    expect(result.guid).toBeDefined();
  });
});
```

---

## Despliegue

### Despliegue en Cloud Foundry

#### 1. Construir Archivo MTA

```bash
npm run build:mta
```

Esto crea `mta_archives/shiftbook_1.0.0.mtar`.

#### 2. Iniciar Sesión en Cloud Foundry

```bash
cf login -a <api-endpoint> -o <org> -s <space>
```

#### 3. Desplegar Aplicación

```bash
npm run deploy
```

O manualmente:

```bash
cf deploy mta_archives/shiftbook_1.0.0.mtar --retries 1
```

#### 4. Verificar Despliegue

```bash
cf apps
cf services
```

Verificar salud:

```bash
npm run health:check:prod
```

### Desinstalar Aplicación

```bash
npm run undeploy
```

Esto:
- Eliminará la aplicación
- Eliminará instancias de servicio
- Eliminará service keys

### Estructura de Aplicación Multi-Objetivo (MTA)

El `mta.yaml` define:

**Módulos:**
- `shiftbook-srv`: Módulo de aplicación Node.js
- `shiftbook-db-deployer`: Deployer de base de datos HDI

**Recursos:**
- `shiftbook-db`: Contenedor HDI de SAP HANA
- `shiftbook-auth`: Instancia de servicio XSUAA
- `shiftbook-destination`: Servicio Destination
- `shiftbook-config`: Servicio de configuración

### Despliegues Específicos por Entorno

ShiftBook puede desplegarse en múltiples espacios (dev, test, prod):

```bash
# Desarrollo
cf target -s dev
cf deploy mta_archives/shiftbook_1.0.0.mtar

# Pruebas
cf target -s test
cf deploy mta_archives/shiftbook_1.0.0.mtar

# Producción
cf target -s prod
cf deploy mta_archives/shiftbook_1.0.0.mtar
```

---

## Configuración

### Configuración CDS

La configuración se gestiona a través de `package.json` bajo la sección `cds`.

#### Configuración de Base de Datos

```json
{
  "cds": {
    "requires": {
      "db": {
        "[development]": {
          "kind": "sqlite",
          "credentials": { "url": "db/shiftbook-dev.db" }
        },
        "[production]": {
          "kind": "hana",
          "pool": {
            "min": 20,
            "max": 100
          }
        }
      }
    }
  }
}
```

#### Configuración de Autenticación

```json
{
  "cds": {
    "requires": {
      "auth": {
        "[development]": {
          "kind": "dummy",
          "users": {
            "admin": { "roles": ["admin", "operator"] }
          }
        },
        "[production]": {
          "kind": "xsuaa"
        }
      }
    }
  }
}
```

#### Configuración de Registro

```json
{
  "cds": {
    "log": {
      "levels": {
        "shiftbook": "info",
        "shiftbook.db": "debug",
        "shiftbook.perf": "info"
      },
      "format": "json"
    }
  }
}
```

#### Internacionalización

```json
{
  "cds": {
    "i18n": {
      "folders": ["_i18n"],
      "default_language": "en",
      "supported_languages": ["en", "de", "es", "fr", "it", "pt"]
    }
  }
}
```

### Configuración de Servicios

#### Servicio de Correo Electrónico

Configurar en variables de entorno o servicio destination:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=tu-email@gmail.com
MAIL_PASSWORD=tu-contraseña-de-aplicacion
MAIL_FROM=ShiftBook <noreply@tuempresa.com>
```

#### Integración con Microsoft Teams

Configurar URLs de webhook en la configuración de categorías a través de la API o UI de administración.

### Ajuste de Rendimiento

Configuración de pool de conexiones en `package.json`:

```json
{
  "cds": {
    "requires": {
      "db": {
        "[production]": {
          "pool": {
            "min": 20,
            "max": 100,
            "acquireTimeoutMillis": 5000,
            "idleTimeoutMillis": 180000
          }
        }
      }
    }
  }
}
```

---

## Seguridad

### Autenticación y Autorización

ShiftBook utiliza **SAP XSUAA** (Extended Services for User Account and Authentication) para control de acceso seguro.

#### Roles

| Rol | Permisos | Caso de Uso |
|-----|----------|-------------|
| **Operator** | Leer categorías, Crear/Leer registros | Trabajadores regulares de turnos |
| **Admin** | Acceso CRUD completo | Administradores del sistema |

#### Modelo de Autorización

Definido en `xs-security.json`:

```json
{
  "xsappname": "shiftbook-srv",
  "tenant-mode": "dedicated",
  "scopes": [
    { "name": "$XSAPPNAME.operator", "description": "Rol de operador" },
    { "name": "$XSAPPNAME.admin", "description": "Rol de administrador" }
  ],
  "role-templates": [
    { "name": "operator", "scope-references": ["$XSAPPNAME.operator"] },
    { "name": "admin", "scope-references": ["$XSAPPNAME.admin"] }
  ]
}
```

#### Autorización a Nivel de Servicio

Aplicada a través de anotaciones `@restrict` en `srv/shiftbook-service.cds`:

```cds
@restrict: [
  { grant: 'READ', to: 'operator' },
  { grant: ['*'], to: 'admin' }
]
entity ShiftBookLog as projection on db.ShiftBookLog;
```

### Características de Seguridad

1. **Registro de Auditoría**: Todas las operaciones registradas en la entidad `AuditLog`
2. **Monitoreo de Autenticación**: Seguimiento de eventos de autenticación en tiempo real
3. **Circuit Breaker**: Protección contra fallos en cascada
4. **Validación de Entrada**: Validación completa de reglas de negocio
5. **Prevención de Inyección SQL**: Consultas parametrizadas vía CDS
6. **Prevención de XSS**: Codificación y sanitización de salida
7. **Protección CSRF**: Protección CSRF basada en tokens

### Comunicación Segura

- **TLS/SSL**: Todo el tráfico de producción encriptado
- **Validación de Tokens**: Validación de tokens JWT en cada solicitud
- **Expiración de Tokens**: Validez de tokens configurable (predeterminado: 2 horas)
- **Tokens de Actualización**: Tokens de actualización de larga duración (predeterminado: 24 horas)

### Privacidad de Datos

- **Aislamiento de Tenants**: Aislamiento de datos multi-tenant vía campo `werks`
- **Pista de Auditoría**: Registros de auditoría inmutables para cumplimiento
- **Manejo de Datos Personales**: IDs de usuario rastreados para cumplimiento GDPR
- **Encriptación de Datos**: Encriptación en reposo en SAP HANA Cloud

---

## Gobernanza y Cumplimiento

### Gobernanza del Proyecto

ShiftBook sigue reglas de gobernanza estrictas definidas en `.claude-code/project-rules.md`. Requisitos clave de cumplimiento:

#### Estándares Tecnológicos

- **Solo Tecnologías Aprobadas**: Solo se permiten tecnologías listadas en las reglas del proyecto
- **Control de Versiones**: Las dependencias usan rangos caret (^); actualizaciones mayores requieren aprobación de gobernanza
- **Seguridad Primero**: Las actualizaciones de seguridad tienen prioridad sobre restricciones de versión

#### Estándares de Calidad de Código

- **Mínimo 70% de Cobertura de Pruebas**: Todos los cambios de código deben mantener o mejorar la cobertura de pruebas
- **TypeScript Requerido**: Toda la lógica de negocio debe implementarse en TypeScript
- **Seguridad de Tipos**: Evitar tipo `any`; usar interfaces TypeScript apropiadas
- **Documentación**: Comentarios JSDoc requeridos para todas las funciones públicas

#### Sincronización de Archivos

⚠️ **Requisito Crítico**: Al modificar implementaciones de servicio:
- Ambos `srv/ShiftBookService.ts` y `srv/shiftbook-service.ts` deben actualizarse
- La lógica de negocio debe ser idéntica en ambos archivos
- Ver `docs/CONTRIBUTING.md` para flujo de trabajo de sincronización detallado

#### Requisitos de Pruebas

- **Pruebas Unitarias**: No deben tener dependencias externas
- **Pruebas de Integración**: Deben usar base de datos de prueba (SQLite en memoria)
- **Pruebas E2E**: Deben cubrir flujos de trabajo críticos del negocio
- **CI/CD**: Todas las pruebas deben pasar antes del despliegue

#### Cumplimiento de Seguridad

- **Autenticación**: XSUAA en producción, mock/dummy en desarrollo
- **Autorización**: Control de acceso basado en roles aplicado a nivel de servicio
- **Registro de Auditoría**: Todas las operaciones críticas deben registrarse
- **Sin Credenciales en Código**: Todas las credenciales vía variables de entorno o servicios BTP

#### Estándares de Despliegue

- **Descriptor MTA**: Todo despliegue vía `mta.yaml`
- **Verificaciones de Salud**: Todos los servicios desplegados deben responder al endpoint `/health`
- **Aislamiento de Entornos**: Configuraciones separadas para dev, test y producción

### Validación de Cumplimiento

Antes de enviar cambios, asegúrese de:

- [ ] Todas las tecnologías y dependencias aprobadas utilizadas
- [ ] Compilación de TypeScript pasa sin errores
- [ ] Mínimo 70% de cobertura de pruebas mantenido
- [ ] Ambos archivos de implementación de servicio sincronizados (si aplica)
- [ ] Todas las pruebas pasan (unitarias, integración, E2E)
- [ ] Mejores prácticas de seguridad seguidas
- [ ] Documentación actualizada
- [ ] Sin credenciales o secretos en código

Para reglas de gobernanza detalladas y flujos de trabajo de aprobación, ver `.claude-code/project-rules.md`.

---

## Monitoreo de Salud

ShiftBook incluye endpoints completos de verificación de salud:

```bash
# Verificación de salud local
curl http://localhost:4004/health

# Información detallada de salud
curl http://localhost:4004/health/simple
```

Scripts de verificación de salud:

```bash
npm run health:check:local      # Desarrollo local
npm run health:check:dev        # Entorno de desarrollo
npm run health:check:prod       # Entorno de producción
```

---

## Soporte y Contribución

- **Problemas**: Reportar problemas vía el rastreador de problemas del repositorio
- **Documentación**: Ver carpeta `docs/` para documentación detallada
- **Contribución**: Ver `docs/CONTRIBUTING.md` para guías de contribución
- **Registro de Cambios**: Ver `docs/CHANGELOG.md` para historial de versiones

### ⚠️ Importante para Contribuidores

**Crítico: Archivos de Implementación Duplicados**

El servicio ShiftBook tiene **DOS archivos de implementación que deben mantenerse sincronizados**:
- `srv/ShiftBookService.ts` (S mayúscula)
- `srv/shiftbook-service.ts` (s minúscula)

Al realizar CUALQUIER cambio en los manejadores de servicio o lógica de negocio, **DEBE actualizar AMBOS archivos**. 
Consulte `docs/CONTRIBUTING.md` para directrices detalladas sobre este requisito y el flujo de trabajo adecuado.

---

## Licencia

Ver archivo [LICENSE](LICENSE) para detalles.

---

## Recursos Adicionales

- [SAP Cloud Application Programming Model](https://cap.cloud.sap/)
- [SAP Business Technology Platform](https://www.sap.com/products/business-technology-platform.html)
- [SAP HANA Cloud](https://www.sap.com/products/technology-platform/hana.html)
- [Guías de Diseño SAP Fiori](https://experience.sap.com/fiori-design/)
- [Documentación de Cloud Foundry](https://docs.cloudfoundry.org/)

---

**Versión**: 1.0.0  
**Última Actualización**: Octubre 2025  
**Mantenido por**: Syntax GBI - Equipo de Desarrollo SAP
