# Cloud Foundry Diagnostic Utilities

This directory contains diagnostic utilities specifically for troubleshooting SAP Cloud Foundry deployments.

## ⚠️ Important

**These utilities are NOT used in production code.** They are kept for manual debugging and troubleshooting when needed.

## Purpose

CDS v9 automatically handles service discovery and loading, making these diagnostics unnecessary in normal operation. However, they can be useful when:

- Services fail to load in Cloud Foundry but work locally
- You need to verify service files are present in CF deployment
- Debugging `cf push` issues where services are not found
- Investigating file system structure in CF runtime

## Available Functions

### `getDiagnosticInfo()`

Scans the srv directory and returns information about service files.

**Returns:**
```typescript
{
  serviceFiles: string[];      // Files matching 'shiftbook-service'
  totalFiles: number;          // Total files in directory
  hasShiftbookService: boolean; // Whether service files exist
}
```

### `logDiagnostics()`

Quick console logging of service files for troubleshooting.

### `isCloudFoundryEnvironment()`

Checks if running in Cloud Foundry (via `VCAP_APPLICATION`).

## Usage Examples

### 1. SSH into Cloud Foundry and Run Diagnostics

```bash
# SSH into your CF instance
cf ssh shiftbook-srv

# Start Node REPL
node

# Load and run diagnostics
const { logDiagnostics, getDiagnosticInfo } = require('./srv/loaders/cloudfoundry-diagnostics');
logDiagnostics();
```

### 2. Temporary Debugging in Code

Add temporarily to `srv/server.ts` for debugging:

```typescript
// Only for debugging - remove after troubleshooting
import { logDiagnostics } from './loaders/cloudfoundry-diagnostics';

if (process.env.VCAP_APPLICATION) {
  console.log('🔍 Running CF diagnostics...');
  logDiagnostics();
}
```

**Remember to remove this code after debugging!**

### 3. Get Detailed Information

```typescript
import { getDiagnosticInfo } from './loaders/cloudfoundry-diagnostics';

const info = getDiagnosticInfo();
if (info && !info.hasShiftbookService) {
  console.error('❌ Service files not found in CF deployment!');
  console.log('Files present:', info.totalFiles);
}
```

## Common Troubleshooting Scenarios

### Scenario 1: Service Not Loading in CF

**Symptoms:**
- App starts but no services are available
- 404 errors on service endpoints
- "Service not found" errors in logs

**Diagnosis:**
1. SSH into CF: `cf ssh shiftbook-srv`
2. Run diagnostics to check if files exist
3. Verify file names and extensions match expected patterns

### Scenario 2: Build Output Issues

**Symptoms:**
- Service files not present after `cf push`
- Different file structure than local

**Diagnosis:**
1. Check `mta.yaml` build parameters
2. Verify `package.json` build scripts
3. Use diagnostics to see actual file structure in CF

### Scenario 3: Path Configuration Issues

**Symptoms:**
- CDS looking in wrong directory
- Service files exist but not found

**Diagnosis:**
1. Check CDS folder configuration in logs
2. Use diagnostics to verify actual paths
3. Check environment variables (`CDS_FOLDERS_SRV`)

## Why Not in Production?

These utilities are intentionally separated and not used in production because:

1. **CDS v9 handles it better**: The framework provides excellent error messages and automatic discovery
2. **Performance**: File system inspection adds unnecessary overhead
3. **Not needed**: Services load automatically in 99.9% of cases
4. **Debugging only**: Only useful for specific edge cases and troubleshooting

## Maintenance

- These utilities require minimal maintenance
- Update file patterns if service naming changes
- Keep in sync with CDS folder structure changes
- Remove if not used after 6 months of stable CF deployments

## Related Documentation

- [CDS Folder Configuration](../cds-folders-config.ts) - Main configuration logic
- [SAP CAP Documentation](https://cap.cloud.sap/docs/) - Official CAP docs
- [Cloud Foundry CLI](https://docs.cloudfoundry.org/cf-cli/) - CF commands

---

**Last Updated**: October 28, 2025  
**Status**: Maintenance mode - only for debugging
