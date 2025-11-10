# Service Analysis: DMC → BTP HANA Migration

## Current Situation

### ✅ Entities in HANA BTP (Implemented)
- **ShiftBookCategory**: Shift category management
- **ShiftBookCategoryMail**: Email configuration per category  
- **ShiftBookCategoryLng**: i18n translations per category
- **ShiftBookLog**: Event and message logging

### 🔄 Required Hybrid Functionalities

#### 1. **Category Management** (100% HANA BTP) ✅
```typescript
// Complete CRUD operations in HANA
- createCategoryWithDetails()
- updateCategoryWithDetails() 
- deleteCategoryCascade()
- advancedCategorySearch()
```

#### 2. **Logging System** (HANA BTP + DMC Data)
```typescript
// Logs are stored in HANA, but need DMC data:
- werks, shoporder, stepid, split, workcenter
// These fields come from current DMC context
```

#### 3. **Email Integration** (BTP Destinations) ✅
```typescript
// Configuration via BTP Destination Service
- getEmailConfig() // BTP Destinations
- sendEmail() // BTP + HANA configuration
```

## Recommended Architecture

### Data Layer
```
┌─────────────────┐     ┌─────────────────┐
│   HANA BTP      │     │      DMC        │
│                 │     │                 │
│ • Categories    │◄────┤ • Shop Orders   │
│ • Translations  │     │ • Work Centers  │
│ • Email Config  │     │ • Steps         │
│ • Logs          │     │ • Splits        │
└─────────────────┘     └─────────────────┘
```

### Data Flow
1. **User creates log from DMC Plugin**
2. **Plugin sends**: `{ werks, shoporder, stepid, workcenter }` (from DMC context)
3. **CAP Service**: 
   - Validates category in HANA
   - Creates log in HANA  
   - If `sendmail=1` → sends email via BTP

## Current Implementation vs Required

### ✅ Already Implemented
- [x] Complete CRUD for categories in HANA
- [x] Email system with BTP Destinations
- [x] Business validations
- [x] i18n and translations
- [x] Automatic logs with email

### 🔧 Required Adjustments

#### 1. **DMC Validation Service**
```typescript
// New method to validate DMC data
action validateDMCContext(werks: String, shoporder: String, 
                         stepid: String, workcenter: String) 
  returns DMCValidationResult;
```

#### 2. **Data Enrichment**
```typescript
// Enrich logs with DMC data
this.before("CREATE", "ShiftBookLog", async (req) => {
  // Validate that werks/shoporder/stepid exist in DMC
  // Optional: get workcenter description
});
```

#### 3. **Plugin Integration Points**
```typescript
// Specific methods for DMC plugin
action createLogFromDMC(dmcContext: DMCContext, 
                       category: Integer, 
                       subject: String, 
                       message: String) 
  returns ShiftBookLogResult;
```

## DMC Reference Data

### Fields coming from DMC Plugin:
- `werks` (Plant): From manufacturing context
- `shoporder` (Order): Current production order  
- `stepid` (Step): Current routing step
- `split` (Split): Order division
- `workcenter` (Center): Current work center
- `user_id` (User): User logged in DMC

### Required DMC Validations:
1. **Plant exists**: Verify that `werks` is valid
2. **Shop Order active**: Verify that `shoporder` is active
3. **Step valid**: Verify that `stepid` belongs to the order
4. **Work Center**: Verify that `workcenter` is valid for the step

## Next Steps

1. **Create DMC validation service**
2. **Implement data enrichment**  
3. **Optimize methods for plugin**
4. **Testing with real DMC data**
