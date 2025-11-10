/**
 * Category ID Mapping Utility
 * 
 * Maps old integer category IDs used in test files to new UUID category IDs
 * from the CSV test data files. This maintains test functionality while
 * supporting the new UUID-based category identification system.
 */

// Production Issues categories (werks 1000 & 2000)
export const PRODUCTION_ISSUES_1000 = '7fdaa02e-ec7a-4c39-bb39-80f2a60034db';
export const PRODUCTION_ISSUES_2000 = '08177299-0aed-4ec4-8009-bcafe4edf293';

// Quality Control categories (werks 1000 & 2000) 
export const QUALITY_CONTROL_1000 = '268812a6-36c5-4495-9486-5872d2fb3ad3';
export const QUALITY_CONTROL_2000 = 'e06abc5f-ec16-4aa2-a349-d7c0c18ae8fc';

// Maintenance Required categories
export const MAINTENANCE_REQUIRED_1000 = '6151dd50-3039-4145-aff3-64948737b726';
export const MAINTENANCE_REQUIRED_2000 = 'cc748f91-bfe7-44ed-907a-e6c8ae5cdc09';

// Safety Incident categories
export const SAFETY_INCIDENT_1000 = 'ecf61e85-189f-4f78-b5d7-3d25076d3633';
export const SAFETY_INCIDENT_2000 = '5c8d5be9-2d80-4529-a9ea-afaa20aaa1ad';

// Training Required category
export const TRAINING_REQUIRED_1000 = '9dc752c1-bd60-4e23-b922-2ee77d6cb17a';

// Equipment Malfunction category
export const EQUIPMENT_MALFUNCTION_1000 = '66f8e40d-7e82-4bbf-9798-a3fcc50f79d4';

// Process Improvement category
export const PROCESS_IMPROVEMENT_1000 = '6f8bc22e-24f1-48e0-add3-4daee4472c35';

// Shift Handover category
export const SHIFT_HANDOVER_1000 = 'd9c694d1-fee3-49c4-9cd4-ca6e27f3ae85';

// Supply Chain Issue category
export const SUPPLY_CHAIN_ISSUE_1000 = 'bfe58faf-51f8-4837-8721-e7120d289736';

// General Information categories
export const GENERAL_INFORMATION_1000 = '64d82546-5ef9-404d-bef6-11167b31f66e';
export const GENERAL_INFORMATION_2000 = '0e56c9f1-a8ba-431a-82c7-43bc960e7e76';

/**
 * Legacy mapping function for integer-based category IDs.
 * Maps old integer IDs to corresponding UUID values based on typical test patterns.
 * 
 * @param categoryId - Old integer category ID
 * @param werks - Plant code (defaults to '1000')
 * @returns Corresponding UUID category ID
 */
export function getCategoryUUID(categoryId: number, werks: string = '1000'): string {
  // Map common test category integers to UUIDs based on typical usage patterns
  const mappings: Record<string, Record<number, string>> = {
    '1000': {
      1: PRODUCTION_ISSUES_1000,     // Most common test category
      2: QUALITY_CONTROL_1000,       // Second most common 
      3: MAINTENANCE_REQUIRED_1000,  // Third most common
      4: SAFETY_INCIDENT_1000,       // Safety testing
      5: TRAINING_REQUIRED_1000,     // Training scenarios
      6: EQUIPMENT_MALFUNCTION_1000, // Equipment issues
      7: PROCESS_IMPROVEMENT_1000,   // Process testing
      8: SHIFT_HANDOVER_1000,        // Shift scenarios
      9: SUPPLY_CHAIN_ISSUE_1000,    // Supply chain testing
      10: GENERAL_INFORMATION_1000,  // General testing
      // Special test values
      111: PRODUCTION_ISSUES_1000,   // Batch test value
      222: QUALITY_CONTROL_1000,     // Batch test value
      333: MAINTENANCE_REQUIRED_1000, // Batch test value
      777: SAFETY_INCIDENT_1000,     // Special test value
      888: TRAINING_REQUIRED_1000,   // Special test value
      999: EQUIPMENT_MALFUNCTION_1000, // Special test value
      9999: GENERAL_INFORMATION_1000  // Invalid category test
    },
    '2000': {
      1: PRODUCTION_ISSUES_2000,     // Most common test category
      2: QUALITY_CONTROL_2000,       // Second most common
      3: MAINTENANCE_REQUIRED_2000,  // Third most common
      4: SAFETY_INCIDENT_2000,       // Safety testing
      5: GENERAL_INFORMATION_2000,   // General testing
      // Map additional integers to available categories for plant 2000
      6: PRODUCTION_ISSUES_2000,
      7: QUALITY_CONTROL_2000,
      8: MAINTENANCE_REQUIRED_2000,
      9: SAFETY_INCIDENT_2000,
      10: GENERAL_INFORMATION_2000
    }
  };

  const categoryMapping = mappings[werks];
  if (categoryMapping && categoryMapping[categoryId]) {
    return categoryMapping[categoryId];
  }

  // Default fallback - use production issues for unknown categories
  return werks === '2000' ? PRODUCTION_ISSUES_2000 : PRODUCTION_ISSUES_1000;
}

/**
 * Get category UUID by description for more semantic test creation
 */
export function getCategoryByDescription(description: string, werks: string = '1000'): string {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('production')) {
    return werks === '2000' ? PRODUCTION_ISSUES_2000 : PRODUCTION_ISSUES_1000;
  } else if (lowerDesc.includes('quality')) {
    return werks === '2000' ? QUALITY_CONTROL_2000 : QUALITY_CONTROL_1000;
  } else if (lowerDesc.includes('maintenance')) {
    return werks === '2000' ? MAINTENANCE_REQUIRED_2000 : MAINTENANCE_REQUIRED_1000;
  } else if (lowerDesc.includes('safety')) {
    return werks === '2000' ? SAFETY_INCIDENT_2000 : SAFETY_INCIDENT_1000;
  } else if (lowerDesc.includes('training')) {
    return TRAINING_REQUIRED_1000; // Only available in werks 1000
  } else if (lowerDesc.includes('equipment')) {
    return EQUIPMENT_MALFUNCTION_1000; // Only available in werks 1000
  } else if (lowerDesc.includes('process')) {
    return PROCESS_IMPROVEMENT_1000; // Only available in werks 1000
  } else if (lowerDesc.includes('shift')) {
    return SHIFT_HANDOVER_1000; // Only available in werks 1000
  } else if (lowerDesc.includes('supply')) {
    return SUPPLY_CHAIN_ISSUE_1000; // Only available in werks 1000
  } else {
    return werks === '2000' ? GENERAL_INFORMATION_2000 : GENERAL_INFORMATION_1000;
  }
}

/**
 * Returns all available category UUIDs for a given werks
 */
export function getAllCategoryUUIDs(werks: string = '1000'): string[] {
  if (werks === '2000') {
    return [
      PRODUCTION_ISSUES_2000,
      QUALITY_CONTROL_2000, 
      MAINTENANCE_REQUIRED_2000,
      SAFETY_INCIDENT_2000,
      GENERAL_INFORMATION_2000
    ];
  } else {
    return [
      PRODUCTION_ISSUES_1000,
      QUALITY_CONTROL_1000,
      MAINTENANCE_REQUIRED_1000,
      SAFETY_INCIDENT_1000,
      TRAINING_REQUIRED_1000,
      EQUIPMENT_MALFUNCTION_1000,
      PROCESS_IMPROVEMENT_1000,
      SHIFT_HANDOVER_1000,
      SUPPLY_CHAIN_ISSUE_1000,
      GENERAL_INFORMATION_1000
    ];
  }
}