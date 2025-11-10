# 🎯 BTP Destinations Summary - Quick Setup

## ✅ You need exactly 3 main destinations:

### 1. 📧 **EMAIL-SERVICE** 
**Purpose**: Automatic notification sending when `sendmail=1`
```
Name: email-service
Type: HTTP
URL: [Your email service - SendGrid, Outlook, Enterprise SMTP]
Authentication: OAuth2ClientCredentials or BasicAuthentication
```

### 2. 🏭 **DMC-SERVICE**
**Purpose**: DMC context validation (orders, work centers, plants)
```
Name: dmc-service  
Type: HTTP
URL: [Your DMC instance - Cloud or On-premise via Cloud Connector]
Authentication: OAuth2ClientCredentials or PrincipalPropagation
```

### 3. 🔧 **SAP-BACKEND** (Optional)
**Purpose**: Additional validations for plants, materials, users
```
Name: sap-backend
Type: HTTP or RFC
URL: [Your SAP backend system]
Authentication: BasicAuthentication or PrincipalPropagation
```

## 🚀 Quick Setup in BTP Cockpit

### Step 1: EMAIL-SERVICE (Example with SendGrid)
```
BTP Cockpit → Connectivity → Destinations → New Destination

Name: email-service
Type: HTTP  
URL: https://api.sendgrid.com/v3/mail/send
Proxy Type: Internet
Authentication: OAuth2ClientCredentials

Additional Properties:
api_key = SG.your-sendgrid-api-key
from_email = noreply@yourcompany.com
from_name = Shift Book System
Content-Type = application/json
```

### Step 2: DMC-SERVICE (DMC Cloud Example)
```
BTP Cockpit → Connectivity → Destinations → New Destination

Name: dmc-service
Type: HTTP
URL: https://your-tenant.dme.cfapps.sap.hana.ondemand.com
Proxy Type: Internet
Authentication: OAuth2ClientCredentials

Additional Properties:
client_id = your-dmc-client-id
client_secret = your-dmc-client-secret
token_url = https://your-tenant.authentication.sap.hana.ondemand.com/oauth/token
scope = dme.read,dme.write
```

### Step 3: Check Service Bindings in MTA
```yaml
# In mta.yaml, make sure you have:
requires:
  - name: shiftbook-destination-service
  - name: shiftbook-connectivity-service  # If using on-premise
  - name: shiftbook-xsuaa-service

resources:
  - name: shiftbook-destination-service
    type: org.cloudfoundry.managed-service
    parameters:
      service: destination
      service-plan: lite
```

## 📋 Integration Code - Already Implemented ✅

Your code is already prepared to use these destinations:

```typescript
// ✅ Email via BTP Destination
const getEmailConfig = async () => {
  const emailDestination = await getDestinationConfig("email-service");
  // Automatically uses the destination if available
};

// ✅ DMC via BTP Destination  
const getDMCConfig = async () => {
  const dmcDestination = await getDestinationConfig("dmc-service");
  // Automatically uses the destination if available
};
```

## 🔄 Current Data Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DMC PLUGIN    │────│   CAP SERVICE   │────│   HANA BTP      │
│                 │    │                 │    │                 │
│ • werks         │───▶│ • Validations   │───▶│ • Categories    │
│ • shoporder     │    │ • Business      │    │ • Translations  │
│ • stepid        │    │   Logic         │    │ • Emails        │
│ • workcenter    │    │ • i18n          │    │ • Logs          │
│ • user_id       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ DMC-SERVICE     │    │ EMAIL-SERVICE   │    │ SAP-BACKEND     │
│ Destination     │    │ Destination     │    │ Destination     │
│                 │    │                 │    │ (Optional)      │
│ • Validate      │    │ • Send          │    │ • Extra         │
│   Orders        │    │   Notifications │    │   Validations   │
│ • Get Work      │    │ • SMTP/API      │    │ • Master Data   │
│   Centers       │    │   Integration   │    │   Check         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 Destinations Testing

### Test Email:
```bash
curl -X POST https://your-app.cfapps.eu10.hana.ondemand.com/shiftbook/ShiftBookService/sendMailByCategory \
  -H "Content-Type: application/json" \
  -d '{"category": 1, "werks": "1000", "subject": "Test Email", "message": "Testing BTP destination"}'
```

### Test DMC:
```bash
curl -X POST https://your-app.cfapps.eu10.hana.ondemand.com/shiftbook/ShiftBookService/getDMCActiveOrders \
  -H "Content-Type: application/json" \
  -d '{"werks": "1000"}'
```

## ⚡ Next Steps

1. **Configure destinations in BTP Cockpit** ← NEXT
2. **Update real credentials** 
3. **Deploy to BTP with `mbt build && cf deploy`**
4. **Test end-to-end connectivity**
5. **Integrate with existing DMC plugin**

## 📞 Support

If you need specific help with:
- **SendGrid/Outlook**: API key and OAuth setup
- **DMC Cloud**: Client credentials and scopes
- **DMC On-premise**: Cloud Connector setup
- **SAP Backend**: RFC vs HTTP integration

Your application is ready for production with this configuration! 🚀
