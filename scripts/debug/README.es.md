# Scripts de Depuración

Scripts de utilidad para depuración y prueba de funcionalidades específicas durante el desarrollo.

## Scripts Disponibles

### 📧 debug-email-creation.js
Prueba la funcionalidad de creación de emails llamando a la acción `createCategoryWithDetails`.

```bash
node scripts/debug/debug-email-creation.js
```

**Propósito:** Verificar que las notificaciones por email se están creando correctamente cuando se crean categorías.

**Qué hace:**
- Envía una petición de prueba para crear una categoría con destinatarios de email
- Valida que los emails se generan correctamente
- Útil para depurar problemas de envío de emails

---

### 🔑 debug-token.js
Decodifica tokens JWT para entender el mapeo de scopes y autenticación.

```bash
node scripts/debug/debug-token.js
```

**Propósito:** Depurar problemas con tokens OAuth2 y entender la asignación de scopes.

**Qué hace:**
- Obtiene un token OAuth2 del servicio de autenticación
- Decodifica y muestra el payload del token JWT
- Muestra scopes, información de usuario y expiración del token
- Útil para depurar problemas de autorización

---

## Cuándo Usar Estos Scripts

- 🐛 **Depuración local** de funcionalidades específicas
- 🧪 **Probar** funcionalidad sin ejecutar suites de test completas
- 🔍 **Investigar** problemas con emails o autenticación
- 📊 **Entender** la estructura de tokens y scopes

## Requisitos

- Aplicación ejecutándose localmente (para debug-email-creation.js)
- Credenciales válidas configuradas en el script
- Dependencias instaladas: `npm install`

## Notas

⚠️ Estos scripts contienen **credenciales hardcodeadas** para entornos de desarrollo. Nunca uses credenciales de producción en estos scripts.

🔒 No commitear cambios que expongan credenciales sensibles al control de versiones.

