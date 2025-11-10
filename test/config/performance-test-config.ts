/**
 * Performance Test Configuration
 *
 * Controls dataset sizes and thresholds based on environment
 */

export interface PerformanceTestConfig {
  datasets: {
    small: { logs: number; workcenters: number; categories: number };
    medium: { logs: number; workcenters: number; categories: number };
    large: { logs: number; workcenters: number; categories: number };
  };
  thresholds: {
    [key: string]: number;
  };
  batchSize: number;
  timeout: number;
}

// Test scale configurations
const TEST_SCALES = {
  // Fast tests for CI/CD pipelines
  fast: {
    datasets: {
      small: { logs: 500, workcenters: 20, categories: 2 },
      medium: { logs: 2000, workcenters: 30, categories: 3 },
      large: { logs: 3000, workcenters: 50, categories: 5 }
    },
    thresholds: {
      ORIGIN_FILTER_LARGE: 1000,
      DESTINATION_FILTER_LARGE: 2000,
      COMBINED_FILTER_LARGE: 3000
    },
    batchSize: 500,
    timeout: 180000 // 3 minutes
  },

  // Comprehensive tests for performance validation
  comprehensive: {
    datasets: {
      small: { logs: 1000, workcenters: 25, categories: 3 },
      medium: { logs: 10000, workcenters: 100, categories: 10 },
      large: { logs: 25000, workcenters: 200, categories: 20 }
    },
    thresholds: {
      ORIGIN_FILTER_LARGE: 2000,
      DESTINATION_FILTER_LARGE: 4000,
      COMBINED_FILTER_LARGE: 6000
    },
    batchSize: 1000,
    timeout: 600000 // 10 minutes
  },

  // Production-scale tests for stress testing
  stress: {
    datasets: {
      small: { logs: 5000, workcenters: 50, categories: 5 },
      medium: { logs: 50000, workcenters: 500, categories: 50 },
      large: { logs: 100000, workcenters: 1000, categories: 100 }
    },
    thresholds: {
      ORIGIN_FILTER_LARGE: 5000,
      DESTINATION_FILTER_LARGE: 10000,
      COMBINED_FILTER_LARGE: 15000
    },
    batchSize: 2000,
    timeout: 1800000 // 30 minutes
  }
};

// Determine test scale from environment
function getTestScale(): keyof typeof TEST_SCALES {
  const scale = process.env.PERFORMANCE_TEST_SCALE?.toLowerCase();

  if (scale === 'comprehensive') return 'comprehensive';
  if (scale === 'stress') return 'stress';

  // Default to fast for CI/CD environments
  if (process.env.CI === 'true' || process.env.NODE_ENV === 'test') {
    return 'fast';
  }

  return 'fast';
}

export const PERFORMANCE_CONFIG: PerformanceTestConfig = TEST_SCALES[getTestScale()];

// Also export as CommonJS for broader compatibility
module.exports = { PERFORMANCE_CONFIG };

console.log(`📊 Performance tests using ${getTestScale().toUpperCase()} scale configuration`);
console.log(`📈 Large dataset: ${PERFORMANCE_CONFIG.datasets.large.logs} logs, ${PERFORMANCE_CONFIG.datasets.large.workcenters} workcenters`);
console.log(`⏱️ Timeout: ${PERFORMANCE_CONFIG.timeout / 1000}s, Batch size: ${PERFORMANCE_CONFIG.batchSize}`);