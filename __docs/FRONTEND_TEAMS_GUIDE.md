# Guía para el Frontend: Envío de Notificaciones Teams

## 🎯 **¿Qué debe hacer el Frontend para enviar una notificación Teams?**

### **RESPUESTA SIMPLE: ¡NADA DIFERENTE!** 

El frontend **NO necesita hacer nada especial** para Teams. Solo debe crear el `ShiftBookLog` normalmente, y el sistema automáticamente decidirá si enviar por EMAIL o TEAMS basado en la configuración de la categoría.

---

## 📋 **Flujo Automático del Sistema**

### **1. Frontend crea un log (igual que siempre):**
```javascript
// POST /ShiftBookLog
const logData = {
  werks: "1000",
  workcenter: "WC_ASSEMBLY_01", 
  user_id: "john.smith@company.com",
  category: "7fdaa02e-ec7a-4c39-bb39-80f2a60034db", // UUID de la categoría
  subject: "Production line stopped",
  message: "Machine M-001 has mechanical failure. Waiting for maintenance team.",
  shoporder: "SO2024001001",
  stepid: "0010", 
  split: "001"
  // log_dt se pone automáticamente si no se especifica
};
```

### **2. Sistema decide automáticamente:**
```typescript
// El backend automáticamente:
// 1. Busca la categoría por ID y werks
// 2. Lee el campo notification_type de la categoría
// 3. Si es "EMAIL" → Envía email
// 4. Si es "TEAMS" → Envía Teams webhook  
// 5. Si no existe el campo → Default a EMAIL (backward compatibility)
```

---

## 🔧 **Configuración de Categorías (Admin)**

Para que una categoría envíe Teams en lugar de email, el **administrador** debe configurar:

### **Opción 1: API de Categorías**
```javascript
// PUT /ShiftBookCategory(ID='categoria-uuid',werks='1000')
{
  "notification_type": "TEAMS"  // ← Cambiar de EMAIL a TEAMS
}
```

### **Opción 2: UI de Administración**
- El frontend de administración debe permitir seleccionar entre EMAIL/TEAMS
- Campo dropdown con opciones: `["EMAIL", "TEAMS"]`

---

## 📊 **Estructura de Datos Necesaria**

### **ShiftBookCategory (configuración):**
```json
{
  "ID": "7fdaa02e-ec7a-4c39-bb39-80f2a60034db",
  "werks": "1000",
  "sendmail": 1,
  "notification_type": "TEAMS",  // ← Campo clave
  "teamsChannel": {              // ← Asociación automática
    "name": "Production Alerts",
    "webhookURL": "https://teams-webhook-url...",
    "active": true
  }
}
```

### **ShiftBookTeamsChannel (configuración Teams):**
```json
{
  "category_id": "7fdaa02e-ec7a-4c39-bb39-80f2a60034db",
  "werks": "1000", 
  "name": "Production Alerts Teams",
  "webhookURL": "https://mysyntax.webhook.office.com/webhookb2/...",
  "description": "Canal para alertas de producción",
  "active": true
}
```

---

## 🚀 **APIs que Puede Necesitar el Frontend**

### **1. Para Consultar Tipos de Notificación:**
```javascript
// GET /ShiftBookCategory?$select=ID,werks,notification_type,teamsChannel
// Respuesta:
[
  {
    "ID": "uuid1", 
    "werks": "1000",
    "notification_type": "EMAIL"
  },
  {
    "ID": "uuid2",
    "werks": "1000", 
    "notification_type": "TEAMS",
    "teamsChannel": {
      "name": "Production Alerts",
      "active": true
    }
  }
]
```

### **2. Para Configurar Teams (Admin UI):**
```javascript
// POST /ShiftBookTeamsChannel
{
  "category_id": "uuid-categoria",
  "werks": "1000",
  "name": "Mi Canal Teams",
  "webhookURL": "https://webhook-url...",
  "description": "Descripción del canal",
  "active": true
}

// Después actualizar categoría:
// PUT /ShiftBookCategory(ID='uuid',werks='1000')
{
  "notification_type": "TEAMS"
}
```

---

## 💡 **UI Considerations para el Frontend**

### **1. Indicador Visual en Logs:**
```javascript
// Mostrar en la lista de logs si se envió por EMAIL o TEAMS
const getNotificationIcon = (category) => {
  return category.notification_type === 'TEAMS' ? '📢' : '📧';
};
```

### **2. Configuración de Categorías (Admin):**
```html
<!-- Selector de tipo de notificación -->
<select name="notification_type">
  <option value="EMAIL">📧 Email</option>
  <option value="TEAMS">📢 Microsoft Teams</option>
</select>

<!-- Solo mostrar configuración Teams si es TEAMS -->
<div v-if="category.notification_type === 'TEAMS'">
  <input type="text" placeholder="Nombre del canal Teams" />
  <input type="url" placeholder="Webhook URL de Teams" />
</div>
```

### **3. Validación en Frontend:**
```javascript
// Validar que si es TEAMS, tiene canal configurado
const validateCategory = (category) => {
  if (category.notification_type === 'TEAMS') {
    if (!category.teamsChannel || !category.teamsChannel.webhookURL) {
      throw new Error('Teams channel configuration required');
    }
  }
  if (category.notification_type === 'EMAIL') {
    if (!category.mails || category.mails.length === 0) {
      throw new Error('Email recipients required');
    }
  }
};
```

---

## 🎯 **Resumen para Desarrolladores Frontend**

| Aspecto | Acción Requerida |
|---------|------------------|
| **Crear Log** | ✅ Ningún cambio - usar API normal |
| **Mostrar Logs** | 🔧 Opcional: mostrar icono EMAIL/TEAMS |
| **Admin UI** | 🔧 Agregar selector notification_type |
| **Config Teams** | 🔧 Opcional: UI para configurar webhooks |
| **Validación** | 🔧 Validar config según tipo seleccionado |

### **Lo Más Importante:**
```javascript
// ❌ NO HACER - El frontend NO decide el tipo
fetch('/ShiftBookLog', {
  method: 'POST',
  body: JSON.stringify({
    // ... datos del log
    notification_type: 'TEAMS'  // ← WRONG! No hacer esto
  })
});

// ✅ HACER - El frontend solo crea el log
fetch('/ShiftBookLog', {
  method: 'POST', 
  body: JSON.stringify({
    werks: "1000",
    category: "uuid-categoria",  // ← El sistema usa esto para determinar EMAIL/TEAMS
    subject: "...",
    message: "..."
  })
});
```

**El sistema automáticamente decide EMAIL vs TEAMS basado en la configuración de la `category`, no en el log individual.**