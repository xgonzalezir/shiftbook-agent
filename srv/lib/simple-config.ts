/**
 * Simple configuration helper using standard environment variables
 * Simplified configuration approach without user-provided service dependency
 */

// Type declaration for Node.js process
declare const process: {
  env: { [key: string]: string | undefined };
};

// Get a configuration value from environment variables
const get = (key: string, defaultValue: string = ""): string => {
  return getFromUserProvidedService(key, defaultValue);
};

// Get configuration from environment variables (fallback to VCAP_SERVICES if needed)
const getFromUserProvidedService = (
  key: string,
  defaultValue: string = ""
): string => {
  try {
    if (process.env.VCAP_SERVICES) {
      const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
      const userProvided = vcapServices["user-provided"];

      if (userProvided && userProvided.length > 0) {
        // Look for shiftbook-config service
        const configService = userProvided.find(
          (service: any) => service.name === "shiftbook-config"
        );

        if (
          configService &&
          configService.credentials &&
          configService.credentials[key]
        ) {
          return configService.credentials[key];
        }
      }
    }
  } catch (error) {
    console.warn(`Error reading from VCAP_SERVICES for key ${key}:`, error);
  }

  // Fallback to environment variable
  return process.env[key] || defaultValue;
};

// Email configuration
const getEmailConfig = async (): Promise<{
  destinationName: string;
  fromAddress: string;
  fromName: string;
  simulationMode: boolean;
}> => ({
  destinationName: process.env.EMAIL_DESTINATION_NAME || "shiftbook-email",
  fromAddress: process.env.EMAIL_FROM_ADDRESS || "noreply@company.com",
  fromName: process.env.EMAIL_FROM_NAME || "Shift Book System",
  simulationMode: (process.env.EMAIL_SIMULATION_MODE || "false") === "true",
});

// Export using ES6 modules
export const simpleConfig = {
  get,
  getEmailConfig,
  getFromUserProvidedService, // Export the new function
};

// Also export the functions directly for easier access
export { get, getEmailConfig, getFromUserProvidedService };
