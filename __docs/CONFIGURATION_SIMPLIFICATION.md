# Configuration Simplification - User-Provided Service Removal

## Overview

The Shift Book application has been simplified to remove the dependency on the `shiftbook-config` user-provided service. Configuration is now handled directly through environment variables, reducing complexity and potential configuration conflicts.

## Changes Made

### MTA Configuration (`mta.yaml`)
- Removed `shiftbook-config` from the `requires` section
- Removed the `shiftbook-config` resource definition
- The application now only requires:
  - `shiftbook-db` (HANA database)
  - `shiftbook-auth` (XSUAA authentication)
  - `shiftbook-destination` (Destination service)

### Email Service (`srv/lib/email-service.ts`)
- Hardcoded destination name to `"shiftbook-email"`
- Removed dependency on configuration service for destination lookup

### Configuration Helper (`srv/lib/simple-config.ts`)
- Updated `getEmailConfig()` to read directly from environment variables
- Removed user-provided service lookup logic
- Maintained backward compatibility with async interface

### Service Handler (`srv/shiftbook-service.ts`)
- Updated comments to reflect simplified configuration approach
- `testAction` now uses hardcoded `"shiftbook-email"` destination

## Environment Variables

The following environment variables control email configuration:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `EMAIL_DESTINATION_NAME` | `shiftbook-email` | BTP destination name for email service |
| `EMAIL_FROM_ADDRESS` | `noreply@company.com` | Email sender address |
| `EMAIL_FROM_NAME` | `Shift Book System` | Email sender display name |
| `EMAIL_SIMULATION_MODE` | `false` | Enable email simulation mode for testing |

## Migration Steps

### For Existing Deployments

1. **Remove the old service** (if it exists):
   ```bash
   cf unbind-service shiftbook-srv shiftbook-config
   cf delete-service shiftbook-config
   ```

2. **Set environment variables** (optional, defaults will be used):
   ```bash
   cf set-env shiftbook-srv EMAIL_DESTINATION_NAME shiftbook-email
   cf set-env shiftbook-srv EMAIL_FROM_ADDRESS noreply@company.com
   cf set-env shiftbook-srv EMAIL_FROM_NAME "Shift Book System"
   cf set-env shiftbook-srv EMAIL_SIMULATION_MODE false
   ```

3. **Redeploy the application**:
   ```bash
   cf push
   ```

### For New Deployments

No additional configuration is required. The application will use the default values and find the `shiftbook-email` destination automatically.

## Benefits

- **Simplified deployment**: No need to create and manage user-provided services
- **Reduced complexity**: Fewer moving parts in the configuration chain
- **Better reliability**: Eliminates potential mismatches between service configurations
- **Easier maintenance**: Configuration is centralized in environment variables

## Testing

After deployment, test the email functionality by:

1. Calling the `testAction` endpoint to verify destination connectivity
2. Creating a log entry to trigger automatic email notifications
3. Checking application logs for any configuration-related errors

## Rollback

If issues arise, the old user-provided service approach can be restored by:

1. Recreating the `shiftbook-config` service
2. Updating the MTA to include the service binding
3. Reverting the code changes in `simple-config.ts` and `email-service.ts`

## Files Changed

- `mta.yaml` - Removed service dependencies
- `srv/lib/email-service.ts` - Hardcoded destination name
- `srv/lib/simple-config.ts` - Simplified configuration logic
- `srv/shiftbook-service.ts` - Updated comments and test logic
- `scripts/legacy/manage-config-service.sh` - Marked as deprecated

## Related Documentation

- [Email Destination Setup](EMAIL_DESTINATION_SETUP.md)
- [Deployment Guide](DEPLOYMENT_SUCCESS.md)
- [Environment Configuration](ENVIRONMENT_CONFIGURATION.md)