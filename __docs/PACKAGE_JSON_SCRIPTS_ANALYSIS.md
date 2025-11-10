# 📊 Análisis de Scripts NPM - ShiftBook

## Resumen Ejecutivo

**Total de scripts**: 53
**Estado general**: ⚠️ **Necesita limpieza y organización**

### Problemas Identificados
1. ❌ **1 script roto**: `test:debug` referencia script inexistente `clean:compiled`
2. ⚠️ **Duplicaciones**: `dev` y `dev:sqlite` son idénticos
3. ⚠️ **Scripts innecesarios**: `health:check` y `health:simple` solo muestran mensajes
4. 🔄 **Complejidad excesiva**: `copy:extras` es muy largo y frágil

---

## Análisis por Categorías

### 🚀 1. Scripts de Inicio/Desarrollo (8 scripts)

| Script | Estado | Utilidad | Comentarios |
|--------|--------|----------|-------------|
| `start` | ✅ ÚTIL | Alta | **Recién arreglado** - Ahora fuerza NODE_ENV=development |
| `watch` | ✅ ÚTIL | Alta | Hot-reload con CDS, esencial para desarrollo |
| `dev` | ✅ ÚTIL | Alta | Setup datos + watch, ideal para desarrollo |
| `dev:sqlite` | ⚠️ DUPLICADO | Media | **Duplicado exacto de `dev`** - Puede eliminarse |
| `dev:test` | ✅ ÚTIL | Media | Para desarrollo en modo test |
| `hybrid` | ✅ ÚTIL | Media | Testing con XSUAA en local |
| `prod` | ⚠️ CUIDADO | Baja | Para simular producción local (poco uso real) |
| `setup:dev-data` | ✅ ÚTIL | Alta | Inicializa datos de desarrollo |

**Recomendaciones**:
- ✂️ Eliminar `dev:sqlite` (duplicado de `dev`)
- 📝 Documentar diferencia entre `dev`, `dev:test` y `hybrid`
- ⚠️ Renombrar `prod` a `prod:local` para evitar confusiones

---

### 🏗️ 2. Scripts de Build (9 scripts)

| Script | Estado | Utilidad | Comentarios |
|--------|--------|----------|-------------|
| `build` | ✅ ÚTIL | Alta | Build completo para producción |
| `build:dev` | ✅ ÚTIL | Alta | Build rápido para desarrollo |
| `build:cf` | ✅ ÚTIL | Alta | Build para Cloud Foundry |
| `build:mta` | ✅ ÚTIL | Alta | Build + MTA package |
| `build:ts` | ✅ ÚTIL | Alta | Compilación TypeScript |
| `prebuild` | ✅ ÚTIL | Alta | Hook pre-build, limpia mocks |
| `prebuild:cf` | ✅ ÚTIL | Media | Hook pre-build CF |
| `prebuild:mta` | ✅ ÚTIL | Media | Hook pre-build MTA |
| `clean` | ✅ ÚTIL | Alta | Limpia carpeta gen/ |

**Estado**: ✅ Buenos, bien organizados

---

### 🧹 3. Scripts de Limpieza (3 scripts)

| Script | Estado | Utilidad | Comentarios |
|--------|--------|----------|-------------|
| `cleanup:mock` | ✅ ÚTIL | Alta | Limpia datos mock de producción |
| `cleanup:ts` | ✅ ÚTIL | Media | Elimina archivos .ts de gen/ |
| `clean` | ✅ ÚTIL | Alta | (Ya listado arriba) |

**Estado**: ✅ Buenos

---

### 📦 4. Scripts de Copia (2 scripts)

| Script | Estado | Utilidad | Comentarios |
|--------|--------|----------|-------------|
| `copy:extras` | ⚠️ FRÁGIL | Alta | **Muy largo y complejo** - 10+ operaciones en una línea |
| `copy:files` | ✅ OK | Media | Copia básica para dev |

**Problemas con `copy:extras`**:
```bash
# Actual: Una línea monstruosa de 400+ caracteres
"copy:extras": "cp -r @cds-models gen/srv/ && cp package.json gen/srv/ && ..."

# Recomendación: Convertir a script bash separado
scripts/copy-build-artifacts.sh
```

**Recomendación**: 
- 🔧 Crear `scripts/copy-build-artifacts.sh` con comentarios
- 🧪 Hacer el script más mantenible y testeable

---

### 🗄️ 5. Scripts de Base de Datos (5 scripts)

| Script | Estado | Utilidad | Comentarios |
|--------|--------|----------|-------------|
| `db:deploy` | ✅ ÚTIL | Alta | Deploy genérico |
| `db:deploy:dev` | ✅ ÚTIL | Alta | Deploy a SQLite local |
| `db:deploy:test` | ✅ ÚTIL | Alta | Deploy a SQLite en memoria |
| `db:deploy:hybrid` | ✅ ÚTIL | Media | Deploy a HANA (hybrid) |
| `db:deploy:prod` | ✅ ÚTIL | Media | Deploy a HANA (production) |

**Estado**: ✅ Excelentes, bien organizados por entorno

---

### 🚢 6. Scripts de Deployment (2 scripts)

| Script | Estado | Utilidad | Comentarios |
|--------|--------|----------|-------------|
| `deploy` | ✅ ÚTIL | Alta | Build MTA + Deploy a CF |
| `undeploy` | ✅ ÚTIL | Alta | Limpieza completa de CF |

**Estado**: ✅ Buenos

---

### 🧪 7. Scripts de Testing (15 scripts)

| Script | Estado | Utilidad | Comentarios |
|--------|--------|----------|-------------|
| `test` | ✅ ÚTIL | Alta | Test general (jest --runInBand) |
| `test:all` | ⚠️ DUPLICADO | Baja | **Idéntico a `test`** |
| `test:unit` | ✅ ÚTIL | Alta | Tests unitarios |
| `test:service` | ✅ ÚTIL | Alta | Tests de servicios |
| `test:workflow` | ✅ ÚTIL | Alta | Tests de workflows |
| `test:integration` | ✅ ÚTIL | Alta | Tests de integración |
| `test:e2e` | ✅ ÚTIL | Alta | Tests end-to-end |
| `test:coverage` | ✅ ÚTIL | Alta | Coverage de tests unitarios |
| `test:coverage:report` | ✅ ÚTIL | Media | Genera reportes de coverage |
| `test:watch` | ✅ ÚTIL | Alta | Watch mode para desarrollo |
| `test:ci` | ✅ ÚTIL | Alta | Para CI/CD pipelines |
| `test:clean` | ✅ ÚTIL | Media | Limpia cache de Jest |
| `test:debug` | ❌ ROTO | Baja | **Referencia script inexistente** `clean:compiled` |
| `test:connection-pool` | ✅ ÚTIL | Media | Test específico de pool de conexiones |
| `test:connection-pool:light` | ✅ ÚTIL | Baja | Variant light del test pool |
| `test:connection-pool:heavy` | ✅ ÚTIL | Baja | Variant heavy del test pool |

**Problemas**:
1. ❌ `test:debug` está roto - referencia `clean:compiled` que no existe
2. ⚠️ `test:all` es duplicado de `test`

**Recomendaciones**:
- 🔧 Arreglar `test:debug` (crear `clean:compiled` o cambiar lógica)
- ✂️ Eliminar `test:all` (duplicado)

---

### 🏥 8. Scripts de Health Check (7 scripts)

| Script | Estado | Utilidad | Comentarios |
|--------|--------|----------|-------------|
| `health:check` | ❌ INÚTIL | Nula | **Solo muestra un mensaje de ayuda** |
| `health:simple` | ❌ INÚTIL | Nula | **Solo muestra un mensaje de ayuda** |
| `health:check:local` | ✅ ÚTIL | Alta | Verifica /health en local |
| `health:simple:local` | ✅ ÚTIL | Media | Verifica /health/simple en local |
| `health:check:dev` | ✅ ÚTIL | Alta | Verifica /health en dev CF |
| `health:check:test` | ✅ ÚTIL | Alta | Verifica /health en test CF |
| `health:check:prod` | ✅ ÚTIL | Alta | Verifica /health en prod CF |

**Problemas**:
```bash
# Scripts inútiles:
"health:check": "echo 'Use health:check:local for localhost...'"
"health:simple": "echo 'Use health:simple:local for localhost...'"
```

**Recomendaciones**:
- ✂️ Eliminar `health:check` y `health:simple` (solo muestran ayuda)
- 💡 O convertirlos en scripts inteligentes que detecten el entorno

---

### 🔬 9. Scripts de Performance/Testing Específicos (3 scripts)

| Script | Estado | Utilidad | Comentarios |
|--------|--------|----------|-------------|
| `test:performance-monitoring` | ✅ ÚTIL | Media | Test de monitoreo |
| `test:structured-logging` | ✅ ÚTIL | Media | Test de logging estructurado |
| `test:connection-pool:*` | ✅ ÚTIL | Media | Ya listados en testing |

**Estado**: ✅ Buenos scripts específicos

---

## 📋 Resumen de Acciones Recomendadas

### 🔴 Críticas (Arreglar YA)

1. **❌ Script Roto**: `test:debug`
   ```bash
   # Actual (ROTO):
   "test:debug": "... npm run clean:compiled ..."
   
   # Opción 1: Crear el script faltante
   "clean:compiled": "rm -rf gen/"
   
   # Opción 2: Corregir la referencia
   "test:debug": "npm run clean && npm run test:clean && ..."
   ```

### 🟡 Importantes (Hacer Pronto)

2. **✂️ Eliminar Duplicados**:
   - `dev:sqlite` (duplicado de `dev`)
   - `test:all` (duplicado de `test`)

3. **✂️ Eliminar Scripts Inútiles**:
   - `health:check` (solo muestra ayuda)
   - `health:simple` (solo muestra ayuda)

4. **🔧 Refactorizar `copy:extras`**:
   ```bash
   # Crear scripts/copy-build-artifacts.sh
   # Hacer el proceso más mantenible
   ```

### 🟢 Mejoras Opcionales

5. **📝 Mejorar Nombres**:
   - `prod` → `prod:local` (para evitar confusión)
   - `test:all` → eliminar (es igual a `test`)

6. **📚 Documentar Diferencias**:
   - ¿Cuándo usar `dev` vs `dev:test` vs `hybrid`?
   - Crear un README de scripts

---

## 📊 Estadísticas Finales

| Categoría | Total | Útiles | Duplicados | Rotos | Inútiles |
|-----------|-------|--------|------------|-------|----------|
| Inicio/Dev | 8 | 6 | 1 | 0 | 1 |
| Build | 9 | 9 | 0 | 0 | 0 |
| Limpieza | 3 | 3 | 0 | 0 | 0 |
| Copia | 2 | 2 | 0 | 0 | 0 |
| Database | 5 | 5 | 0 | 0 | 0 |
| Deployment | 2 | 2 | 0 | 0 | 0 |
| Testing | 15 | 12 | 1 | 1 | 0 |
| Health | 7 | 5 | 0 | 0 | 2 |
| Performance | 3 | 3 | 0 | 0 | 0 |
| **TOTAL** | **53** | **47** | **2** | **1** | **3** |

### Puntuación General: 7/10

**Fortalezas**:
- ✅ Buena organización por categorías
- ✅ Nombres descriptivos y consistentes
- ✅ Cobertura completa de escenarios (dev/test/prod)
- ✅ Scripts de testing bien estructurados

**Debilidades**:
- ❌ 1 script roto (`test:debug`)
- ❌ 3 scripts innecesarios
- ⚠️ 1 script muy complejo y frágil (`copy:extras`)
- ⚠️ 2 duplicados

---

## 🎯 Plan de Acción Recomendado

### Fase 1: Arreglar Rotos (15 min)
```bash
# Arreglar test:debug
# Opción simple: eliminar referencia a clean:compiled
```

### Fase 2: Limpiar Duplicados (10 min)
```bash
# Eliminar dev:sqlite y test:all
```

### Fase 3: Eliminar Inútiles (5 min)
```bash
# Eliminar health:check y health:simple
```

### Fase 4: Refactorizar copy:extras (30 min)
```bash
# Crear scripts/copy-build-artifacts.sh
# Actualizar script para usar el nuevo archivo
```

### Fase 5: Documentar (15 min)
```bash
# Crear SCRIPTS_README.md explicando uso de cada script
```

**Tiempo total estimado**: ~75 minutos

---

## 🔍 Comandos para Validar

```bash
# Verificar que todos los scripts referenciados existen
npm run test:debug  # Debe fallar actualmente

# Verificar duplicados
diff <(npm run dev 2>&1) <(npm run dev:sqlite 2>&1)

# Verificar scripts de health
npm run health:check  # Solo muestra mensaje
```

---

**Fecha de análisis**: 2025-10-27
**Versión analizada**: shiftbook-srv@1.0.0
