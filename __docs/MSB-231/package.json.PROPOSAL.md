# 🎯 Propuesta de Mejora: Scripts NPM

## Problemas Actuales

1. **Nombres inconsistentes**: Mezcla de convenciones (`:` vs sin `:`, verbos en inglés)
2. **Falta de agrupación clara**: Scripts relacionados están dispersos
3. **Redundancia**: Algunos scripts hacen lo mismo con nombres diferentes
4. **Falta de prefijos consistentes**: Dificulta autocompletado y búsqueda
5. **Scripts de "información"**: `health:check` y `health:simple` solo muestran mensajes

---

## 📋 Propuesta de Estructura

### Convención de Nombres
```
<categoria>:<accion>[:<subtipo>]
```

**Categorías principales:**
- `dev:*` - Desarrollo local
- `build:*` - Compilación
- `test:*` - Testing
- `db:*` - Base de datos
- `deploy:*` - Deployment
- `health:*` - Health checks
- `perf:*` - Performance
- `clean:*` - Limpieza

---

## 🔄 Mapeo de Cambios

### 1️⃣ DESARROLLO (dev:*)

| Actual | Propuesto | Cambio |
|--------|-----------|--------|
| `start:local` | `dev:start` | ✅ Más claro |
| `watch` | `dev:watch` | ✅ Agrupa |
| `dev` | `dev:with-data` | ✅ Más descriptivo |
| `dev:test` | `dev:test-env` | ✅ Evita confusión con tests |
| `hybrid` | `dev:hybrid` | ✅ Agrupa |
| `prod` | `dev:prod-like` | ✅ Más claro (simula prod) |
| `setup:dev-data` | `dev:load-data` | ✅ Más intuitivo |

**Nuevo:**
```json
"dev:start": "cross-env NODE_ENV=development cds serve",
"dev:watch": "cds watch",
"dev:with-data": "npm run dev:load-data && npm run dev:watch",
"dev:test-env": "npm run dev:load-data && cross-env CDS_ENV=test cds watch",
"dev:hybrid": "cross-env CDS_ENV=hybrid cds run",
"dev:prod-like": "cross-env CDS_ENV=production cds serve",
"dev:load-data": "node scripts/setup-dev-data.js"
```

---

### 2️⃣ BUILD (build:*)

| Actual | Propuesto | Cambio |
|--------|-----------|--------|
| `build` | `build:prod` | ✅ Más específico |
| `build:dev` | `build:dev` | ✅ Mantener |
| `build:ts` | `build:typescript` | ✅ Más claro |
| `build:cf` | `build:cloudfoundry` | ✅ Más explícito |
| `build:mta` | `build:mtar` | ✅ Más preciso |
| `copy:extras` | `build:copy-assets` | ✅ Agrupa y clarifica |
| `copy:files` | `build:copy-minimal` | ✅ Más descriptivo |

**Nuevo:**
```json
"build:prod": "npm run clean:all && cds build --production && npm run build:typescript && npm run build:copy-assets && npm run clean:mock",
"build:dev": "npm run clean:all && npm run build:typescript && npm run build:copy-minimal",
"build:typescript": "tsc",
"build:cloudfoundry": "npm run build:prod && npm run clean:typescript",
"build:mtar": "npm run build:cloudfoundry && mbt build",
"build:copy-assets": "cp -r @cds-models gen/srv/ && cp package.json gen/srv/ && cp package-lock.json gen/srv/ && cp -r _i18n gen/srv/ && cp srv/*.js gen/srv/ && cp srv/*.cds gen/srv/ && cp -r srv/lib gen/srv/ && mkdir -p gen/srv/srv && cp gen/srv/shiftbook-service.* gen/srv/srv/ && cp -r gen/srv/lib gen/srv/srv/ && rsync -av --exclude='data/backup' --exclude='data/dev' db/ gen/db/ && cp db/package.json gen/db/ 2>/dev/null || true",
"build:copy-minimal": "cp package.json gen/srv/ && cp srv/server.js gen/srv/ 2>/dev/null || true"
```

---

### 3️⃣ TESTING (test:*)

| Actual | Propuesto | Cambio |
|--------|-----------|--------|
| `jest` | `test:all` | ✅ Más genérico |
| `jest:unit` | `test:unit` | ✅ Sin prefijo jest |
| `jest:coverage` | `test:coverage` | ✅ Sin prefijo jest |
| `jest:service` | `test:service` | ✅ Sin prefijo jest |
| `jest:workflow` | `test:workflow` | ✅ Sin prefijo jest |
| `jest:integration` | `test:integration` | ✅ Sin prefijo jest |
| `jest:e2e` | `test:e2e` | ✅ Sin prefijo jest |
| `jest:coverage:report` | `test:report` | ✅ Más corto |
| `jest:watch` | `test:watch` | ✅ Sin prefijo jest |
| `jest:ci` | `test:ci` | ✅ Sin prefijo jest |
| `jest:clean` | `clean:test-cache` | ✅ Agrupa con limpieza |
| `jest:debug` | `test:debug` | ✅ Sin prefijo jest |
| `test:connection-pool` | `perf:connection-pool` | ✅ Mueve a performance |
| `test:connection-pool:light` | `perf:connection-pool:light` | ✅ Mueve a performance |
| `test:connection-pool:heavy` | `perf:connection-pool:heavy` | ✅ Mueve a performance |
| `test:performance-monitoring` | `perf:monitoring` | ✅ Mueve a performance |
| `test:structured-logging` | `perf:logging` | ✅ Mueve a performance |

**Nuevo:**
```json
"test:all": "jest --runInBand",
"test:unit": "jest test/unit --runInBand",
"test:coverage": "jest test/unit --coverage --runInBand",
"test:service": "jest test/service --runInBand",
"test:workflow": "jest test/workflow --runInBand",
"test:integration": "jest test/integration --runInBand",
"test:e2e": "jest test/e2e --runInBand",
"test:report": "node scripts/generate-coverage-report.js",
"test:watch": "jest --watch",
"test:ci": "jest test/unit --ci --coverage --runInBand",
"test:debug": "echo 'Cleaning test environment...' && npm run clean:all && npm run clean:test-cache && echo 'Ready for testing!'"
```

---

### 4️⃣ BASE DE DATOS (db:*)

| Actual | Propuesto | Cambio |
|--------|-----------|--------|
| `db:deploy` | `db:deploy` | ✅ Mantener |
| `db:deploy:dev` | `db:deploy:dev` | ✅ Mantener |
| `db:deploy:test` | `db:deploy:test` | ✅ Mantener |
| `db:deploy:hybrid` | `db:deploy:hybrid` | ✅ Mantener |
| `db:deploy:prod` | `db:deploy:prod` | ✅ Mantener |

**Nuevo (sin cambios):**
```json
"db:deploy": "cds deploy",
"db:deploy:dev": "npm run dev:load-data && cross-env CDS_ENV=development cds deploy --to sqlite:db/shiftbook-dev.db",
"db:deploy:test": "cross-env CDS_ENV=test cds deploy --to sqlite::memory:",
"db:deploy:hybrid": "cross-env CDS_ENV=hybrid cds deploy --to hana",
"db:deploy:prod": "cross-env CDS_ENV=production cds deploy --to hana"
```

---

### 5️⃣ DEPLOYMENT (deploy:*)

| Actual | Propuesto | Cambio |
|--------|-----------|--------|
| `start` | `start` | ✅ Mantener (necesario para CF) |
| `deploy` | `deploy:cf` | ✅ Más específico |
| `undeploy` | `deploy:undeploy` | ✅ Agrupa |

**Nuevo:**
```json
"start": "cds serve csn.json",
"deploy:cf": "npm run build:mtar && cf deploy mta_archives/shiftbook_1.0.0.mtar --retries 1",
"deploy:undeploy": "cf undeploy shiftbook --delete-services --delete-service-keys"
```

---

### 6️⃣ HEALTH CHECKS (health:*)

| Actual | Propuesto | Cambio |
|--------|-----------|--------|
| `health:check` | ❌ ELIMINAR | Scripts informativos innecesarios |
| `health:simple` | ❌ ELIMINAR | Scripts informativos innecesarios |
| `health:check:local` | `health:local` | ✅ Más corto |
| `health:simple:local` | `health:local:simple` | ✅ Mantiene jerarquía |
| `health:check:dev` | `health:dev` | ✅ Más corto |
| `health:check:test` | `health:test` | ✅ Más corto |
| `health:check:prod` | `health:prod` | ✅ Más corto |

**Nuevo:**
```json
"health:local": "curl -f http://localhost:4004/health || echo '❌ Local health check failed'",
"health:local:simple": "curl -f http://localhost:4004/health/simple || echo '❌ Local simple health check failed'",
"health:dev": "curl -f ${HEALTH_CHECK_URL:-https://shiftbook-cap-dev.${CF_DOMAIN:-cfapps.eu10.hana.ondemand.com}/health} || echo '❌ Dev health check failed'",
"health:test": "curl -f ${HEALTH_CHECK_URL:-https://shiftbook-cap-test.${CF_DOMAIN:-cfapps.eu10.hana.ondemand.com}/health} || echo '❌ Test health check failed'",
"health:prod": "curl -f ${HEALTH_CHECK_URL:-https://shiftbook-cap.${CF_DOMAIN:-cfapps.eu10.hana.ondemand.com}/health} || echo '❌ Prod health check failed'"
```

---

### 7️⃣ PERFORMANCE (perf:*)

| Actual | Propuesto | Cambio |
|--------|-----------|--------|
| `test:connection-pool` | `perf:connection-pool` | ✅ Nueva categoría |
| `test:connection-pool:light` | `perf:connection-pool:light` | ✅ Nueva categoría |
| `test:connection-pool:heavy` | `perf:connection-pool:heavy` | ✅ Nueva categoría |
| `test:performance-monitoring` | `perf:monitoring` | ✅ Más corto |
| `test:structured-logging` | `perf:logging` | ✅ Más corto |

**Nuevo:**
```json
"perf:connection-pool": "node scripts/test-connection-pool.js",
"perf:connection-pool:light": "CONCURRENT_REQUESTS=10 TOTAL_REQUESTS=50 node scripts/test-connection-pool.js",
"perf:connection-pool:heavy": "CONCURRENT_REQUESTS=50 TOTAL_REQUESTS=200 node scripts/test-connection-pool.js",
"perf:monitoring": "node scripts/test-performance-monitoring.js",
"perf:logging": "node scripts/test-structured-logging.js"
```

---

### 8️⃣ LIMPIEZA (clean:*)

| Actual | Propuesto | Cambio |
|--------|-----------|--------|
| `clean` | `clean:all` | ✅ Más específico |
| `cleanup:mock` | `clean:mock` | ✅ Unifica naming |
| `cleanup:ts` | `clean:typescript` | ✅ Unifica naming |
| `jest:clean` | `clean:test-cache` | ✅ Agrupa |

**Nuevo:**
```json
"clean:all": "rm -rf gen/",
"clean:mock": "npm install glob rimraf --save-dev --silent && node cleanMock.js",
"clean:typescript": "npx rimraf gen/srv/srv/**/*.ts",
"clean:test-cache": "jest --clearCache"
```

---

## 📦 package.json PROPUESTO (Scripts Section)

```json
{
  "scripts": {
    "// === MAIN HELP ===": "",
    "help": "echo '\n📚 AVAILABLE SCRIPT CATEGORIES\n' && echo '  dev:help     - Development scripts' && echo '  build:help   - Build scripts' && echo '  test:help    - Testing scripts' && echo '  db:help      - Database scripts' && echo '  deploy:help  - Deployment scripts' && echo '  health:help  - Health check scripts' && echo '  perf:help    - Performance scripts' && echo '  clean:help   - Cleanup scripts' && echo '\n💡 TIP: Use help:all to see all commands at once' && echo '\n📖 Full documentation: package.json.md\n'",
    "help:all": "npm run deploy:help && npm run dev:help && npm run build:help && npm run test:help && npm run db:help && npm run health:help && npm run perf:help && npm run clean:help",
    
    "// === DEPLOYMENT ===": "",
    "deploy:help": "echo '\n🚢 DEPLOYMENT SCRIPTS\n' && echo '  start             - Start production server (uses csn.json)' && echo '  deploy:cf         - Full build + deploy to Cloud Foundry' && echo '  deploy:undeploy   - Remove app from Cloud Foundry (⚠️  deletes services!)' && echo '\n⚠️  CAUTION: deploy:undeploy will delete all services and data!' && echo '\n📖 See package.json.md for detailed documentation\n'",
    "start": "cds serve csn.json",
    "deploy:cf": "npm run build:mtar && cf deploy mta_archives/shiftbook_1.0.0.mtar --retries 1",
    "deploy:undeploy": "cf undeploy shiftbook --delete-services --delete-service-keys",
    
    "// === DEVELOPMENT ===": "",
    "dev:help": "echo '\n🚀 DEVELOPMENT SCRIPTS\n' && echo '  dev:start        - Start local dev server (SQLite + dummy auth)' && echo '  dev:watch        - Watch mode with hot-reload' && echo '  dev:with-data    - Start with test data preloaded' && echo '  dev:test-env     - Start with test environment config' && echo '  dev:hybrid       - Start with HANA + XSUAA (hybrid mode)' && echo '  dev:prod-like    - Simulate production locally' && echo '  dev:load-data    - Load development test data' && echo '\n📖 See package.json.md for detailed documentation\n'",
    "dev:start": "cross-env NODE_ENV=development cds serve",
    "dev:watch": "cds watch",
    "dev:with-data": "npm run dev:load-data && npm run dev:watch",
    "dev:test-env": "npm run dev:load-data && cross-env CDS_ENV=test cds watch",
    "dev:hybrid": "cross-env CDS_ENV=hybrid cds run",
    "dev:prod-like": "cross-env CDS_ENV=production cds serve",
    "dev:load-data": "node scripts/setup-dev-data.js",
    
    "// === BUILD ===": "",
    "build:help": "echo '\n🏗️  BUILD SCRIPTS\n' && echo '  build:prod           - Full production build (clean + CDS + TypeScript + assets)' && echo '  build:dev            - Development build (TypeScript only)' && echo '  build:typescript     - Compile TypeScript to JavaScript' && echo '  build:cf             - Build for Cloud Foundry deployment' && echo '  build:mtar           - Build + generate .mtar archive' && echo '  build:copy-assets    - Copy all production assets to gen/' && echo '  build:copy-minimal   - Copy minimal files for dev build' && echo '\n📖 See package.json.md for detailed documentation\n'",
    "prebuild": "npm run clean:mock",
    "build:prod": "npm run clean:all && cds build --production && npm run build:typescript && npm run build:copy-assets && npm run clean:mock",
    "build:dev": "npm run clean:all && npm run build:typescript && npm run build:copy-minimal",
    "build:typescript": "tsc",
    "build:copy-assets": "cp -r @cds-models gen/srv/ && cp package.json gen/srv/ && cp package-lock.json gen/srv/ && cp -r _i18n gen/srv/ && cp srv/*.js gen/srv/ && cp srv/*.cds gen/srv/ && cp -r srv/lib gen/srv/ && mkdir -p gen/srv/srv && cp gen/srv/shiftbook-service.* gen/srv/srv/ && cp -r gen/srv/lib gen/srv/srv/ && rsync -av --exclude='data/backup' --exclude='data/dev' db/ gen/db/ && cp db/package.json gen/db/ 2>/dev/null || true",
    "build:copy-minimal": "cp package.json gen/srv/ && cp srv/server.js gen/srv/ 2>/dev/null || true",
    "prebuild:cf": "npm run clean:mock",
    "build:cf": "npm run build:prod && npm run clean:typescript",
    "prebuild:mtar": "npm run clean:mock",
    "build:mtar": "npm run build:cf && mbt build",
    
    "// === TESTING ===": "",
    "test:help": "echo '\n🧪 TESTING SCRIPTS\n' && echo '  test:all         - Run all tests sequentially' && echo '  test:unit        - Run unit tests only' && echo '  test:coverage    - Run unit tests with coverage report' && echo '  test:service     - Run service layer tests' && echo '  test:workflow    - Run workflow tests' && echo '  test:integration - Run integration tests' && echo '  test:e2e         - Run end-to-end tests' && echo '  test:report      - Generate custom coverage report' && echo '  test:watch       - Watch mode for tests' && echo '  test:ci          - CI/CD optimized test run' && echo '  test:debug       - Clean environment for test debugging' && echo '\n📖 See package.json.md for detailed documentation\n'",
    "test:all": "jest --runInBand",
    "test:unit": "jest test/unit --runInBand",
    "test:coverage": "jest test/unit --coverage --runInBand",
    "test:service": "jest test/service --runInBand",
    "test:workflow": "jest test/workflow --runInBand",
    "test:integration": "jest test/integration --runInBand",
    "test:e2e": "jest test/e2e --runInBand",
    "test:report": "node scripts/generate-coverage-report.js",
    "test:watch": "jest --watch",
    "test:ci": "jest test/unit --ci --coverage --runInBand",
    "test:debug": "echo 'Cleaning test environment...' && npm run clean:all && npm run clean:test-cache && echo 'Ready for testing!'",
    
    "// === DATABASE ===": "",
    "db:help": "echo '\n🗄️  DATABASE SCRIPTS\n' && echo '  db:deploy         - Deploy database using current environment config' && echo '  db:deploy:dev     - Deploy SQLite database with test data' && echo '  db:deploy:test    - Deploy in-memory SQLite for testing' && echo '  db:deploy:hybrid  - Deploy to HANA (hybrid mode)' && echo '  db:deploy:prod    - Deploy to HANA (production mode)' && echo '\n📖 See package.json.md for detailed documentation\n'",
    "db:deploy": "cds deploy",
    "db:deploy:dev": "npm run dev:load-data && cross-env CDS_ENV=development cds deploy --to sqlite:db/shiftbook-dev.db",
    "db:deploy:test": "cross-env CDS_ENV=test cds deploy --to sqlite::memory:",
    "db:deploy:hybrid": "cross-env CDS_ENV=hybrid cds deploy --to hana",
    "db:deploy:prod": "cross-env CDS_ENV=production cds deploy --to hana",
    
    "// === HEALTH CHECKS ===": "",
    "health:help": "echo '\n🏥 HEALTH CHECK SCRIPTS\n' && echo '  health:local        - Check health of local server (detailed)' && echo '  health:local:simple - Check health of local server (simple status)' && echo '  health:dev          - Check health of dev environment in BTP' && echo '  health:test         - Check health of test environment in BTP' && echo '  health:prod         - Check health of prod environment in BTP' && echo '\n💡 Use HEALTH_CHECK_URL and CF_DOMAIN env vars to customize URLs' && echo '\n📖 See package.json.md for detailed documentation\n'",
    "health:local": "curl -f http://localhost:4004/health || echo '❌ Local health check failed'",
    "health:local:simple": "curl -f http://localhost:4004/health/simple || echo '❌ Local simple health check failed'",
    "health:dev": "curl -f ${HEALTH_CHECK_URL:-https://shiftbook-cap-dev.${CF_DOMAIN:-cfapps.eu10.hana.ondemand.com}/health} || echo '❌ Dev health check failed'",
    "health:test": "curl -f ${HEALTH_CHECK_URL:-https://shiftbook-cap-test.${CF_DOMAIN:-cfapps.eu10.hana.ondemand.com}/health} || echo '❌ Test health check failed'",
    "health:prod": "curl -f ${HEALTH_CHECK_URL:-https://shiftbook-cap.${CF_DOMAIN:-cfapps.eu10.hana.ondemand.com}/health} || echo '❌ Prod health check failed'",
    
    "// === PERFORMANCE ===": "",
    "perf:help": "echo '\n⚡ PERFORMANCE SCRIPTS\n' && echo '  perf:connection-pool        - Test connection pool with default settings' && echo '  perf:connection-pool:light  - Light stress test (10 concurrent, 50 total)' && echo '  perf:connection-pool:heavy  - Heavy stress test (50 concurrent, 200 total)' && echo '  perf:monitoring             - Test performance monitoring system' && echo '  perf:logging                - Test structured logging system' && echo '\n📖 See package.json.md for detailed documentation\n'",
    "perf:connection-pool": "node scripts/test-connection-pool.js",
    "perf:connection-pool:light": "CONCURRENT_REQUESTS=10 TOTAL_REQUESTS=50 node scripts/test-connection-pool.js",
    "perf:connection-pool:heavy": "CONCURRENT_REQUESTS=50 TOTAL_REQUESTS=200 node scripts/test-connection-pool.js",
    "perf:monitoring": "node scripts/test-performance-monitoring.js",
    "perf:logging": "node scripts/test-structured-logging.js",
    
    "// === CLEANUP ===": "",
    "clean:help": "echo '\n🧹 CLEANUP SCRIPTS\n' && echo '  clean:all         - Remove gen/ folder completely' && echo '  clean:mock        - Remove mock data files' && echo '  clean:typescript  - Remove TypeScript files from gen/' && echo '  clean:test-cache  - Clear Jest test cache' && echo '\n📖 See package.json.md for detailed documentation\n'",
    "clean:all": "rm -rf gen/",
    "clean:mock": "npm install glob rimraf --save-dev --silent && node cleanMock.js",
    "clean:typescript": "npx rimraf gen/srv/srv/**/*.ts",
    "clean:test-cache": "jest --clearCache"
  }
}
```

---

## 🎯 Beneficios de la Propuesta

### 1. **Autocompletado Mejorado**
```bash
npm run dev:<TAB>    # Muestra todas las opciones de desarrollo
npm run test:<TAB>   # Muestra todas las opciones de testing
npm run build:<TAB>  # Muestra todas las opciones de build
```

### 2. **Jerarquía Clara**
- Prefijos consistentes por categoría
- Orden lógico: deployment → development → build → test → db → health → perf → clean

### 3. **Nombres Descriptivos**
- `dev:with-data` vs `dev` → Más claro
- `dev:test-env` vs `dev:test` → Evita confusión
- `test:all` vs `jest` → Más genérico
- `deploy:cf` vs `deploy` → Más específico

### 4. **Menor Redundancia**
- Elimina scripts informativos (`health:check`, `health:simple`)
- Unifica naming (`cleanup:*` → `clean:*`)
- Agrupa mejor (performance separado de testing)

### 5. **Mejor Experiencia de Desarrollo**
```bash
# Antes
npm run watch              # ¿Qué hace?
npm run dev               # ¿Con o sin datos?
npm run jest              # ¿Todos los tests?
npm run health:check      # Solo muestra mensaje

# Después
npm run dev:watch         # Claro: desarrollo con watch
npm run dev:with-data     # Claro: desarrollo con datos
npm run test:all          # Claro: todos los tests
npm run health:local      # Claro: verifica localhost
```

---

## 📊 Tabla Comparativa

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Categorías** | Implícitas | Explícitas con prefijos |
| **Consistencia** | Media | Alta |
| **Autocompletado** | Limitado | Excelente |
| **Claridad** | Buena | Excelente |
| **Scripts totales** | 50+ | 47 (eliminados 3, ordenados) |
| **Jerarquía** | Plana | Clara con secciones |

---

## 🚀 Plan de Migración

### Fase 1: Preparación (sin breaking changes)
1. Agregar nuevos nombres como alias
2. Mantener nombres antiguos
3. Documentar en README

```json
{
  "scripts": {
    "dev:start": "cross-env NODE_ENV=development cds serve",
    "start:local": "npm run dev:start",  // Alias temporal
    
    "test:all": "jest --runInBand",
    "jest": "npm run test:all",  // Alias temporal
  }
}
```

### Fase 2: Deprecación (1-2 semanas)
1. Agregar mensajes de deprecación
2. Notificar al equipo
3. Actualizar CI/CD con nuevos nombres

```json
{
  "scripts": {
    "start:local": "echo '⚠️  DEPRECATED: Use dev:start instead' && npm run dev:start",
    "jest": "echo '⚠️  DEPRECATED: Use test:all instead' && npm run test:all"
  }
}
```

### Fase 3: Eliminación (después de 2 semanas)
1. Remover aliases antiguos
2. Actualizar toda la documentación
3. Comunicar al equipo

---

## 🔧 Scripts de Ayuda por Categoría

Cada categoría incluirá un script `*:help` que muestra información útil de los comandos disponibles:

### `dev:help`
```bash
npm run dev:help
```

**Output:**
```
🚀 DEVELOPMENT SCRIPTS

  dev:start        - Start local dev server (SQLite + dummy auth)
  dev:watch        - Watch mode with hot-reload
  dev:with-data    - Start with test data preloaded
  dev:test-env     - Start with test environment config
  dev:hybrid       - Start with HANA + XSUAA (hybrid mode)
  dev:prod-like    - Simulate production locally
  dev:load-data    - Load development test data

📖 See package.json.md for detailed documentation
```

### `build:help`
```bash
npm run build:help
```

**Output:**
```
🏗️  BUILD SCRIPTS

  build:prod           - Full production build (clean + CDS + TypeScript + assets)
  build:dev            - Development build (TypeScript only)
  build:typescript     - Compile TypeScript to JavaScript
  build:cloudfoundry   - Build for Cloud Foundry deployment
  build:mtar           - Build + generate .mtar archive
  build:copy-assets    - Copy all production assets to gen/
  build:copy-minimal   - Copy minimal files for dev build

📖 See package.json.md for detailed documentation
```

### `test:help`
```bash
npm run test:help
```

**Output:**
```
🧪 TESTING SCRIPTS

  test:all         - Run all tests sequentially
  test:unit        - Run unit tests only
  test:coverage    - Run unit tests with coverage report
  test:service     - Run service layer tests
  test:workflow    - Run workflow tests
  test:integration - Run integration tests
  test:e2e         - Run end-to-end tests
  test:report      - Generate custom coverage report
  test:watch       - Watch mode for tests
  test:ci          - CI/CD optimized test run
  test:debug       - Clean environment for test debugging

📖 See package.json.md for detailed documentation
```

### `db:help`
```bash
npm run db:help
```

**Output:**
```
🗄️  DATABASE SCRIPTS

  db:deploy         - Deploy database using current environment config
  db:deploy:dev     - Deploy SQLite database with test data
  db:deploy:test    - Deploy in-memory SQLite for testing
  db:deploy:hybrid  - Deploy to HANA (hybrid mode)
  db:deploy:prod    - Deploy to HANA (production mode)

📖 See package.json.md for detailed documentation
```

### `deploy:help`
```bash
npm run deploy:help
```

**Output:**
```
🚢 DEPLOYMENT SCRIPTS

  start             - Start production server (uses csn.json)
  deploy:cf         - Full build + deploy to Cloud Foundry
  deploy:undeploy   - Remove app from Cloud Foundry (⚠️  deletes services!)

⚠️  CAUTION: deploy:undeploy will delete all services and data!

📖 See package.json.md for detailed documentation
```

### `health:help`
```bash
npm run health:help
```

**Output:**
```
🏥 HEALTH CHECK SCRIPTS

  health:local        - Check health of local server (detailed)
  health:local:simple - Check health of local server (simple status)
  health:dev          - Check health of dev environment in BTP
  health:test         - Check health of test environment in BTP
  health:prod         - Check health of prod environment in BTP

💡 Use HEALTH_CHECK_URL and CF_DOMAIN env vars to customize URLs

📖 See package.json.md for detailed documentation
```

### `perf:help`
```bash
npm run perf:help
```

**Output:**
```
⚡ PERFORMANCE SCRIPTS

  perf:connection-pool        - Test connection pool with default settings
  perf:connection-pool:light  - Light stress test (10 concurrent, 50 total)
  perf:connection-pool:heavy  - Heavy stress test (50 concurrent, 200 total)
  perf:monitoring             - Test performance monitoring system
  perf:logging                - Test structured logging system

📖 See package.json.md for detailed documentation
```

### `clean:help`
```bash
npm run clean:help
```

**Output:**
```
🧹 CLEANUP SCRIPTS

  clean:all         - Remove gen/ folder completely
  clean:mock        - Remove mock data files
  clean:typescript  - Remove TypeScript files from gen/
  clean:test-cache  - Clear Jest test cache

📖 See package.json.md for detailed documentation
```

---

## 🔧 Scripts de Ayuda Adicionales (Opcional)

```json
{
  "scripts": {
    "// === QUICK START ===": "",
    "init": "npm install && npm run db:deploy:dev && echo '✅ Ready! Run: npm run dev:watch'",
    "reset": "npm run clean:all && npm run clean:test-cache && npm install && npm run db:deploy:dev",
    
    "// === SHORTCUTS ===": "",
    "d": "npm run dev:watch",
    "t": "npm run test:unit",
    "b": "npm run build:prod",
    
    "// === HELP ===": "",
    "help": "echo '\n📚 AVAILABLE SCRIPT CATEGORIES\n' && echo '  dev:help     - Development scripts' && echo '  build:help   - Build scripts' && echo '  test:help    - Testing scripts' && echo '  db:help      - Database scripts' && echo '  deploy:help  - Deployment scripts' && echo '  health:help  - Health check scripts' && echo '  perf:help    - Performance scripts' && echo '  clean:help   - Cleanup scripts' && echo '\n📖 Full documentation: package.json.md\n'"
  }
}
```

---

## ✅ Recomendación Final

**Implementar la propuesta en Fase 1** (con aliases temporales) para:
- ✅ Mantener compatibilidad con scripts existentes
- ✅ Permitir migración gradual
- ✅ Mejorar experiencia de desarrollo inmediatamente
- ✅ Facilitar onboarding de nuevos desarrolladores

**Timeline sugerido:**
- **Semana 1**: Implementar Fase 1 (aliases)
- **Semana 2-3**: Equipo usa nuevos nombres
- **Semana 4**: Eliminar aliases (Fase 3)

---

## 📝 Checklist de Implementación

- [ ] Crear backup de `package.json`
- [ ] Implementar nuevos nombres + aliases
- [ ] Actualizar documentación (README, package.json.md)
- [ ] Probar todos los scripts nuevos
- [ ] Actualizar scripts de CI/CD
- [ ] Notificar al equipo
- [ ] Establecer fecha de eliminación de aliases
- [ ] Remover aliases después del período de gracia

