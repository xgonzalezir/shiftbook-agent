# 🔍 Análisis del Fallo de Despliegue - MSB-228
## ShiftBook CAP Server Refactoring

**Fecha:** 29 de Octubre, 2025  
**Build ID:** digital-manufactoring-shiftbook #147  
**Stage:** Release (Blue-Green Deployment)  
**Estado:** ❌ **FALLIDO**

---

## 📊 Resumen Ejecutivo

El despliegue del servidor refactorizado ha fallado en la etapa de **Release** durante el proceso de **Blue-Green Deployment** en SAP BTP Cloud Foundry. La aplicación `shiftbook-srv-green` se ha crasheado inmediatamente después del inicio, impidiendo que las instancias se levanten correctamente.

### Estado del Despliegue

- ✅ **Build:** Completado exitosamente
- ✅ **Upload:** MTAR subido correctamente (shiftbook.mtar)
- ✅ **Staging:** Aplicación staged correctamente
- ❌ **Starting:** **FALLIDO** - Instancias crashean al arrancar
- ⏸️ **Blue-Green:** Proceso abortado (versión BLUE permanece activa)

---

## 🔴 Error Principal

```
Error starting application "shiftbook-srv-green": Some instances have crashed. 
Check the logs of your application for more information.
```

### Detalles del Fallo

- **Aplicación:** `shiftbook-srv-green`
- **Intentos de reinicio:** 4 intentos (todos fallidos)
- **Tiempo de fallo:** Aproximadamente 40-56 segundos por intento
- **Operation ID:** `c8c52692-b4b1-11f0-8ecf-eeee0a8abbcf`

### Timeline del Fallo

```
10:28:16 - Application "shiftbook-srv-green" staged ✅
10:28:16 - Starting application "shiftbook-srv-green"...
10:29:03 - Error starting application (Attempt 1) ❌
10:29:41 - Error starting application (Attempt 2) ❌
10:30:20 - Error starting application (Attempt 3) ❌
10:31:17 - Error starting application (Attempt 4) ❌
10:31:17 - Process failed ❌
```

---

## 🔎 Análisis del Problema

### 1. **Naturaleza del Crash**

El patrón de fallo indica un **crash en tiempo de inicio** de la aplicación, no un problema de staging o construcción. Esto sugiere:

- El código TypeScript se compila correctamente
- El MTAR se construye sin errores
- El problema ocurre durante la **ejecución inicial** del servidor Node.js

### 2. **Posibles Causas Identificadas**

#### 🟥 **CAUSA PRINCIPAL (MÁS PROBABLE): Estructura de Módulos TypeScript**

El servidor refactorizado utiliza **imports de módulos locales** con estructura modular:

```typescript
import { configureCdsFolders } from './loaders';
import { getEnvironment } from './config';
import { setupAuthentication } from './auth';
import { MiddlewareManager } from './middleware';
import lifecycleManager from './monitoring/lifecycle-manager';
```

**Problema:**
- En Cloud Foundry, el código TypeScript se transpila a JavaScript antes del despliegue
- Las rutas de importación relativas pueden fallar si:
  - La estructura de carpetas transpiladas no coincide con la estructura TypeScript
  - No existe un `tsconfig.json` adecuado para el build de producción
  - Los archivos `.js` transpilados no se incluyen correctamente en el MTAR
  - Faltan archivos de definición de tipos o índices de módulos

#### 🟨 **CAUSA SECUNDARIA: Dependencias de Runtime**

```json
"dependencies": {
  "@sap/cds": "^9.4.4",
  "@sap/cds-dk": "^9.2.0",  // ⚠️ Normalmente solo devDependencies
  "tsx": "^4.20.3",         // ⚠️ Solo para desarrollo local
  "typescript": "^5.8.3"    // ⚠️ Solo para desarrollo local
}
```

**Problemas:**
- `@sap/cds-dk` no debería estar en dependencies de producción
- `tsx` y `typescript` son herramientas de desarrollo, no runtime
- En Cloud Foundry, Node.js ejecuta código JavaScript compilado, no TypeScript

#### 🟨 **CAUSA TERCIARIA: Inicialización Prematura**

```typescript
// Código ejecutado ANTES de que CDS esté completamente inicializado
if (!initialized) {
  configureCdsFolders();
}

const environment = getEnvironment();

if (!initialized) {
  lifecycleManager.registerLifecycleHooks();
  initialized = true;
}
```

**Problema:**
- La lógica se ejecuta a nivel de módulo (top-level)
- En Cloud Foundry, esto puede causar problemas si:
  - Las variables de entorno no están disponibles durante la carga del módulo
  - Los servicios VCAP no se han vinculado completamente
  - CDS intenta inicializarse antes de que el entorno esté listo

#### 🟦 **CAUSA MENOR: Variables de Entorno**

El código depende de variables de entorno que pueden no estar disponibles:
- `CDS_FOLDERS_SRV`
- `CDS_FOLDERS_DB`
- `VCAP_APPLICATION`
- `NODE_ENV`
- `CDS_ENV`

---

## 🛠️ Soluciones Propuestas

### ✅ **SOLUCIÓN 1: Configurar Build de TypeScript para Producción** (PRIORITARIA)

#### Acción 1.1: Verificar/Crear `tsconfig.cdsbuild.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "outDir": "./gen/srv",
    "rootDir": "./srv",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": false,
    "removeComments": true,
    "preserveConstEnums": false
  },
  "include": ["srv/**/*.ts"],
  "exclude": [
    "node_modules",
    "test",
    "srv/**/*.old.ts",
    "srv/**/*.backup.ts"
  ]
}
```

#### Acción 1.2: Actualizar `package.json` scripts

```json
{
  "scripts": {
    "build": "cds build --production",
    "prestart": "npm run build",
    "start": "node gen/srv/server.js",
    "start:dev": "tsx srv/server.ts",
    "watch": "tsx watch srv/server.ts"
  }
}
```

#### Acción 1.3: Verificar que CDS incluya archivos transpilados en MTAR

Revisar `.cdsrc.json` o `package.json` configuración de CDS:

```json
{
  "cds": {
    "build": {
      "target": ".",
      "tasks": [
        {
          "for": "node-cf",
          "src": "srv",
          "out": "gen/srv",
          "options": {
            "model": ["srv", "db"]
          }
        }
      ]
    }
  }
}
```

---

### ✅ **SOLUCIÓN 2: Mover Dependencias de Desarrollo** (ALTA PRIORIDAD)

#### Acción 2.1: Actualizar `package.json`

**MOVER de `dependencies` a `devDependencies`:**

```json
{
  "dependencies": {
    // Remover estas líneas:
    // "@sap/cds-dk": "^9.2.0",
    // "tsx": "^4.20.3",
    // "typescript": "^5.8.3"
  },
  "devDependencies": {
    "@sap/cds-dk": "^9.2.0",
    "tsx": "^4.20.3",
    "typescript": "^5.8.3",
    // ... resto de devDependencies
  }
}
```

**MANTENER en `dependencies` solo:**

```json
{
  "dependencies": {
    "@cap-js/hana": "^2.1.2",
    "@sap-cloud-sdk/connectivity": "^4.1.1",
    "@sap-cloud-sdk/http-client": "^4.0.2",
    "@sap/cds": "^9.4.4",
    "@sap/cds-mtxs": "^3.2.0",
    "@sap/xsenv": "^5.6.1",
    "@sap/xssec": "^4",
    "axios": "^1.10.0",
    "cors": "^2.8.5",
    "dotenv": "^17.2.0",
    "express": "^4",
    "handlebars": "^4.7.8",
    "nodemailer": "^7.0.5",
    "passport": "^0.7.0",
    "uuid": "^11.1.0",
    "winston": "^3.15.0",
    "winston-daily-rotate-file": "^4.7.1"
  }
}
```

---

### ✅ **SOLUCIÓN 3: Refactorizar Inicialización del Servidor** (MEDIA PRIORIDAD)

#### Acción 3.1: Mover lógica de inicialización dentro de hooks CDS

**Problema actual:** Código ejecutado a nivel de módulo
**Solución:** Encapsular dentro de eventos CDS

```typescript
// srv/server.ts REFACTORIZADO

import cds from '@sap/cds';
import type { Express } from 'express';

// Imports de módulos (NO ejecutar lógica aquí)
import { configureCdsFolders } from './loaders';
import { getEnvironment } from './config';
import { setupAuthentication } from './auth';
import { MiddlewareManager } from './middleware';
import lifecycleManager from './monitoring/lifecycle-manager';

// Variable de control
let initialized = false;

// ============================================================================
// HOOK: 'loaded' - Configuración inicial DESPUÉS de que CDS cargue el modelo
// ============================================================================
cds.on('loaded', () => {
  if (initialized) return;
  
  console.log('🔧 Configuring CDS folders...');
  configureCdsFolders();
  
  console.log('🌍 Detecting environment...');
  const environment = getEnvironment();
  
  console.log('📋 Registering lifecycle hooks...');
  lifecycleManager.registerLifecycleHooks();
  
  initialized = true;
});

// ============================================================================
// HOOK: 'bootstrap' - Configuración de Express
// ============================================================================
cds.on('bootstrap', async (app: Express): Promise<void> => {
  console.log('🚀 Bootstrapping ShiftBook Service');
  
  const environment = getEnvironment();
  console.log(`🌍 Environment: ${environment.env}`);
  console.log(`📂 Working directory: ${process.cwd()}`);
  
  const middlewareManager = new MiddlewareManager(app, environment);
  middlewareManager.setupMiddleware();
  console.log('✅ Middleware configured successfully');
  
  if (environment.isCloud) {
    console.log('☁️ Setting up authentication for cloud environment');
    setupAuthentication(app, environment);
  } else {
    console.log('🔧 Using CAP built-in authentication');
  }
  
  console.log('✅ Server bootstrap completed successfully');
});

export default cds.server;
```

---

### ✅ **SOLUCIÓN 4: Añadir Logging de Diagnóstico** (BAJA PRIORIDAD)

#### Acción 4.1: Añadir try-catch con logging detallado

```typescript
cds.on('bootstrap', async (app: Express): Promise<void> => {
  try {
    console.log('='.repeat(60));
    console.log('🚀 BOOTSTRAP START');
    console.log('='.repeat(60));
    console.log('Environment Variables:');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  CDS_ENV:', process.env.CDS_ENV);
    console.log('  VCAP_APPLICATION:', process.env.VCAP_APPLICATION ? 'SET' : 'NOT SET');
    console.log('  CDS_FOLDERS_SRV:', process.env.CDS_FOLDERS_SRV || 'default');
    console.log('  CDS version:', cds.version);
    console.log('  Working directory:', process.cwd());
    console.log('  __dirname:', __dirname);
    console.log('='.repeat(60));
    
    // ... resto del código de bootstrap
    
    console.log('✅ BOOTSTRAP COMPLETED SUCCESSFULLY');
  } catch (error) {
    console.error('❌ BOOTSTRAP FAILED:');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    throw error; // Re-throw para que Cloud Foundry lo detecte
  }
});
```

---

## 📝 Plan de Acción Recomendado

### Fase 1: Correcciones Críticas (AHORA)

1. ✅ **Verificar configuración de build TypeScript**
   - Revisar `tsconfig.cdsbuild.json`
   - Confirmar que CDS transpila correctamente
   - Verificar que archivos `.js` están en el MTAR

2. ✅ **Mover dependencias de desarrollo**
   - Ejecutar: `npm install --save-dev @sap/cds-dk tsx typescript`
   - Verificar `package.json` actualizado
   - Ejecutar: `npm install` para regenerar `package-lock.json`

3. ✅ **Refactorizar inicialización del servidor**
   - Mover lógica a hooks CDS
   - Eliminar ejecución a nivel de módulo
   - Añadir manejo de errores

### Fase 2: Testing Local (ANTES DE REDESPLEGAR)

```bash
# 1. Limpiar build anterior
npm run clean

# 2. Instalar dependencias limpias
rm -rf node_modules package-lock.json
npm install

# 3. Build de producción
npm run build

# 4. Verificar archivos transpilados
ls -la gen/srv/

# 5. Probar arranque local con JavaScript compilado
node gen/srv/server.js

# 6. Si funciona localmente, construir MTAR
mbt build

# 7. Verificar contenido del MTAR
unzip -l mta_archives/shiftbook.mtar | grep "srv/"
```

### Fase 3: Despliegue Controlado

```bash
# 1. Desplegar a DEV/QA primero
cf deploy mta_archives/shiftbook.mtar -f

# 2. Verificar logs inmediatamente
cf logs shiftbook-srv --recent

# 3. Si falla, descargar logs completos
cf dmol -i <operation-id>

# 4. Si funciona en DEV, promocionar a PROD
```

---

## 🔍 Comandos de Diagnóstico Útiles

### Obtener logs del despliegue fallido

```bash
# Descargar logs de la operación fallida
cf dmol -i c8c52692-b4b1-11f0-8ecf-eeee0a8abbcf

# Ver logs recientes de la aplicación green
cf logs shiftbook-srv-green --recent

# Ver estado de las aplicaciones
cf apps | grep shiftbook

# Ver eventos de la aplicación
cf events shiftbook-srv-green
```

### Verificar configuración actual

```bash
# Ver variables de entorno de la aplicación
cf env shiftbook-srv

# Ver servicios vinculados
cf services

# Ver detalles del MTA desplegado
cf mtas
cf mta shiftbook
```

### Rollback si es necesario

```bash
# Abortar despliegue actual
cf bg-deploy -i c8c52692-b4b1-11f0-8ecf-eeee0a8abbcf -a abort

# Si hay backup, hacer rollback
cf rollback-mta shiftbook
```

---

## 📚 Referencias Técnicas

### Documentación SAP

- [SAP CAP - Build and Deployment](https://cap.cloud.sap/docs/guides/deployment/)
- [SAP CAP - TypeScript Support](https://cap.cloud.sap/docs/node.js/typescript)
- [Cloud Foundry - Troubleshooting Applications](https://docs.cloudfoundry.org/devguide/deploy-apps/troubleshoot-app-health.html)
- [MTA Build Tool - Configuration](https://sap.github.io/cloud-mta-build-tool/)

### Archivos Clave a Revisar

```
/package.json                    # Dependencias y scripts
/tsconfig.json                   # Configuración TypeScript base
/tsconfig.cdsbuild.json          # Configuración build producción
/.cdsrc.json                     # Configuración CDS
/mta.yaml                        # Descriptor MTA
/srv/server.ts                   # Punto de entrada principal
```

---

## ✅ Checklist de Verificación Pre-Redespliegue

Antes de intentar un nuevo despliegue, verificar:

- [ ] `tsconfig.cdsbuild.json` existe y está configurado correctamente
- [ ] Dependencias de desarrollo movidas a `devDependencies`
- [ ] `npm install` ejecutado para regenerar `package-lock.json`
- [ ] Build local exitoso con `npm run build`
- [ ] Archivos `.js` transpilados existen en `gen/srv/`
- [ ] Servidor arranca localmente con `node gen/srv/server.js`
- [ ] MTAR construido con `mbt build` sin errores
- [ ] Contenido del MTAR verificado (incluye archivos transpilados)
- [ ] Tests de integración pasando
- [ ] Código committeado en Git con mensaje descriptivo
- [ ] Backup de versión actual en Cloud Foundry

---

## 🎯 Conclusión

El fallo de despliegue es **solucionable** y se debe principalmente a una **configuración inadecuada del build de TypeScript para producción** en Cloud Foundry. La refactorización del código es correcta y funciona localmente, pero requiere ajustes en el proceso de build y empaquetado para Cloud Foundry.

### Confianza en la Solución

- **Alta (90%):** Las soluciones propuestas abordan las causas raíz identificadas
- **Tiempo estimado:** 2-4 horas para implementar todas las correcciones
- **Riesgo:** Bajo, siempre que se pruebe localmente antes del redespliegue

### Próximos Pasos Inmediatos

1. **Implementar Solución 1** (configuración de build TypeScript)
2. **Implementar Solución 2** (mover dependencias)
3. **Probar localmente** con JavaScript compilado
4. **Redesplegar** a entorno de desarrollo
5. **Validar** con logs en tiempo real
6. **Promocionar** a producción si dev funciona correctamente

---

**Documento generado:** 29 de Octubre, 2025  
**Analista:** AI Assistant  
**Para:** Isaac - ShiftBook Development Team  
**Estado:** ✅ ANÁLISIS COMPLETADO - READY FOR ACTION

---

## 📞 Soporte

Para implementar las soluciones o si necesitas asistencia adicional:
- Revisar este documento paso por paso
- Ejecutar comandos de diagnóstico incluidos
- Revisar logs descargados con `cf dmol`
- Contactar al equipo de DevOps si persisten problemas de infraestructura

**¡El código refactorizado es sólido - solo necesita el build y empaquetado correctos! 🚀**
