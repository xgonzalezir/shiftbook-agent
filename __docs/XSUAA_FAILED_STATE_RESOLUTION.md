# 🚨 ACCIÓN REQUERIDA: Servicio XSUAA en Estado Fallido

## 📋 Problema Identificado

**Fecha:** 27 agosto 2025  
**Error:** El servicio `shiftbook-auth` está en estado **"create failed"**  
**Impact:** El deployment CI/CD falla porque no puede actualizar un servicio corrupto  

### Log de Error
```
Service "shiftbook-auth" is in state "create failed" and may not be operational.
Actions like update of credentials and binding may fail! 
Consider recreating it by specifying the --delete-services option.
```

## 🛠️ Solución Requerida

### Opción 1: Eliminar Servicio Manualmente (Recomendado)
```bash
# En Cloud Foundry CLI
cf target -o manu-dev-org -s dev
cf services | grep shiftbook-auth
cf delete-service shiftbook-auth
```

### Opción 2: Configurar Pipeline con --delete-services
Modificar la configuración del pipeline SAP BTP CI/CD para incluir el flag `--delete-services` en el comando de deployment:

```bash
# En lugar de:
cf bg-deploy shiftbook.mtar -f --version-rule ALL --no-confirm

# Usar:
cf bg-deploy shiftbook.mtar -f --version-rule ALL --no-confirm --delete-services
```

## 📊 Estado Actual de Servicios

| Servicio | Estado | Acción Requerida |
|----------|--------|------------------|
| `shiftbook-db` | ✅ Funcionando | Ninguna |
| `shiftbook-auth` | ❌ create failed | **Eliminar y recrear** |
| `shiftbook-destination` | ✅ Funcionando | Ninguna |
| `shiftbook-logging` | ✅ Funcionando | Ninguna |

## 🎯 Pasos de Resolución

1. **Eliminar el servicio corrupto:**
   ```bash
   cf delete-service shiftbook-auth
   ```

2. **Verificar eliminación:**
   ```bash
   cf services | grep shiftbook-auth
   # Debería no devolver resultados
   ```

3. **Ejecutar nuevo deployment:**
   - El CI/CD creará automáticamente el servicio limpio
   - No se requieren cambios en el código

## ⚠️ Impacto de la Solución

- **Tiempo de Downtime:** ~5-10 minutos durante recreación del servicio
- **Usuarios Afectados:** Se perderán configuraciones de usuarios existentes en XSUAA
- **Mitigación:** Reconfigurar usuarios después del deployment exitoso

## 🔄 Verificación Post-Solución

Después de la eliminación del servicio, el próximo deployment debería mostrar:
```
Creating service "shiftbook-auth"...
Service "shiftbook-auth" created successfully.
```

En lugar del error actual:
```
Updating service "shiftbook-auth"...
Service operation failed: CF-ServiceInstanceNotFound
```

## 📞 Contacto

Para ejecutar esta solución se requiere:
- Acceso administrativo a Cloud Foundry space `dev`
- Permisos para eliminar servicios
- Coordinación con el equipo para minimizar impacto

**Estado:** 🔥 **CRÍTICO** - Blocking deployment pipeline
