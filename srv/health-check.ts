/**
 * Health Check Service for CI/CD Pipeline
 * Provides health status endpoints for deployment verification
 *
 * Follows SAP CAP best practices:
 * - Single /health endpoint with comprehensive status
 * - /metrics endpoint for detailed Prometheus metrics
 * - Standard HTTP status codes and response format
 */

import { getDestination } from "@sap-cloud-sdk/connectivity";
import * as cds from "@sap/cds";
import { Request, Response } from "express";
import connectionPoolMonitor from "./lib/connection-pool-monitor";
import performanceMonitor from "./monitoring/performance-monitor";
import resourceCleanup from "./monitoring/resource-cleanup";

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database: boolean;
    services: boolean;
    memory: boolean;
    disk: boolean;
    connectionPool: boolean;
    performance: boolean;
    resourceCleanup: boolean;
    destination: boolean;
  };
  details: {
    database: string;
    services: string;
    memory: string;
    disk: string;
    connectionPool: string;
    performance: string;
    resourceCleanup: string;
    destination: string;
  };
  metrics?: {
    connectionPool?: any;
    performance?: any;
    resourceCleanup?: any;
    destination?: any;
  };
}

export class HealthCheckService {
  private startTime: number;
  private readonly version = "1.0.0";

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const rawChecks = await this.performHealthChecks();
    const overallStatus = this.determineOverallStatus(rawChecks);
    const metrics = await this.getDetailedMetrics();

    // Filter checks based on environment - exclude resourceCleanup for non-cloud environments
    const environment = process.env.CDS_ENV || "development";
    // Only consider cloud if explicitly production/hybrid, not just because VCAP_APPLICATION exists
    const isCloud = environment === "production" || environment === "hybrid";

    const checks = { ...rawChecks };
    if (!isCloud && "resourceCleanup" in checks) {
      delete (checks as any).resourceCleanup;
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: this.version,
      environment: environment,
      uptime: Date.now() - this.startTime,
      checks,
      details: await this.getHealthDetails(rawChecks),
      metrics,
    };
  }

  /**
   * Perform all health checks
   */
  private async performHealthChecks(): Promise<HealthStatus["checks"]> {
    return {
      database: await this.checkDatabase(),
      services: await this.checkServices(),
      memory: await this.checkMemory(),
      disk: await this.checkDisk(),
      connectionPool: await this.checkConnectionPool(),
      performance: await this.checkPerformance(),
      resourceCleanup: await this.checkResourceCleanup(),
      destination: await this.checkDestination(),
    };
  }

  /**
   * Get detailed metrics for all components
   */
  private async getDetailedMetrics(): Promise<HealthStatus["metrics"]> {
    const metrics: HealthStatus["metrics"] = {};

    try {
      // Connection pool metrics
      if (await this.checkConnectionPool()) {
        metrics.connectionPool = {
          metrics: connectionPoolMonitor.getMetrics(),
          health: connectionPoolMonitor.getPoolHealth(),
          recentEvents: connectionPoolMonitor.getEventHistory(10),
        };
      }
    } catch (error) {
      console.warn("Could not retrieve connection pool metrics:", error);
    }

    try {
      // Performance monitoring metrics
      if (await this.checkPerformance()) {
        const perfMonitor =
          (performanceMonitor as any).default || performanceMonitor;
        metrics.performance = {
          metrics: perfMonitor.getMetrics(),
          status: perfMonitor.getStatus(),
        };
      }
    } catch (error) {
      console.warn("Could not retrieve performance metrics:", error);
    }

    try {
      // Resource cleanup metrics
      if (await this.checkResourceCleanup()) {
        const cleanup = (resourceCleanup as any).default || resourceCleanup;
        metrics.resourceCleanup = {
          metrics: cleanup.getMetrics(),
          status: cleanup.getStatus(),
          tasks: cleanup.getTasks(),
        };
      }
    } catch (error) {
      console.warn("Could not retrieve resource cleanup metrics:", error);
    }

    return metrics;
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      const db = await cds.connect.to("db");

      // Try a HANA-specific query first (SELECT 1 FROM FAKE)
      try {
        // noinspection SqlDialectInspection,SqlNoDataSourceInspection
        await db.run("SELECT 1 FROM DUMMY");
        return true;
      } catch (hanaError) {
        // If HANA query fails, try generic SQLite query (SELECT 1)
        try {
          await db.run("SELECT 1");
          return true;
        } catch (sqliteError) {
          console.error(
            "Database health check failed - both HANA and SQLite queries failed:",
            {
              hana: hanaError.message,
              sqlite: sqliteError.message,
            }
          );
          return false;
        }
      }
    } catch (connectionError) {
      console.error("Database connection failed:", connectionError);
      return false;
    }
  }

  /**
   * Check connection pool health
   */
  private async checkConnectionPool(): Promise<boolean> {
    try {
      const poolHealth = connectionPoolMonitor.getPoolHealth();
      return poolHealth.status === "healthy" || poolHealth.status === "warning";
    } catch (error) {
      console.error("Connection pool health check failed:", error);
      return false;
    }
  }

  /**
   * Check service availability
   */
  private async checkServices(): Promise<boolean> {
    try {
      // For now, return true since the main application is running
      // The service availability is checked by the fact that the server is responding
      // In a production environment, we could add more sophisticated service checks
      return true;
    } catch (error) {
      console.error("Services health check failed:", error);
      return false;
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<boolean> {
    try {
      const memUsage = process.memoryUsage();
      // Use RSS (Resident Set Size) as the actual memory footprint
      const memoryUsageMB = memUsage.rss / 1024 / 1024;

      // For Cloud Foundry, assume memory limit is reasonable (default 1GB for standard apps)
      // In production, this could be read from VCAP_APPLICATION.limits.mem if needed
      const memoryLimitMB = process.env.VCAP_APPLICATION
        ? JSON.parse(process.env.VCAP_APPLICATION).limits?.mem || 1024
        : 512;

      const memoryUsagePercent = (memoryUsageMB / memoryLimitMB) * 100;

      // Log memory details for debugging
      console.log("Memory check details:", {
        rss: `${Math.round(memoryUsageMB)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        limit: `${memoryLimitMB}MB`,
        percentage: `${memoryUsagePercent.toFixed(1)}%`,
        isHealthy: memoryUsagePercent < 80,
      });

      // Consider unhealthy if memory usage is above 80% of available memory
      return memoryUsagePercent < 80;
    } catch (error) {
      console.error("Memory health check failed:", error);
      return false;
    }
  }

  /**
   * Check disk space (basic check)
   */
  private async checkDisk(): Promise<boolean> {
    try {
      // For Cloud Foundry, we'll assume disk is available
      // In a real implementation, you might want to check specific directories
      return true;
    } catch (error) {
      console.error("Disk health check failed:", error);
      return false;
    }
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(
    checks: HealthStatus["checks"]
  ): "healthy" | "unhealthy" | "degraded" {
    const environment = process.env.CDS_ENV || "development";
    // Only consider cloud if explicitly production/hybrid, not just because VCAP_APPLICATION exists
    const isCloud = environment === "production" || environment === "hybrid";

    // Filter checks based on environment - exclude resourceCleanup for non-cloud environments
    const relevantChecks = { ...checks };
    if (!isCloud && "resourceCleanup" in relevantChecks) {
      delete (relevantChecks as any).resourceCleanup;
    }

    const checkValues = Object.values(relevantChecks);
    const healthyChecks = checkValues.filter((check) => check === true).length;
    const totalChecks = checkValues.length;

    if (healthyChecks === totalChecks) {
      return "healthy";
    } else if (healthyChecks >= totalChecks * 0.7) {
      return "degraded";
    } else {
      return "unhealthy";
    }
  }

  /**
   * Get detailed health information
   */
  private async getHealthDetails(
    checks: HealthStatus["checks"]
  ): Promise<HealthStatus["details"]> {
    const memUsage = process.memoryUsage();

    let connectionPoolStatus = "Not available";
    if (checks.connectionPool) {
      try {
        const poolHealth = connectionPoolMonitor.getPoolHealth();
        connectionPoolStatus = `${poolHealth.status} - ${poolHealth.issues.length} issues`;
      } catch (error) {
        connectionPoolStatus = "Status check failed";
      }
    }

    return {
      database: checks.database
        ? "Connected and responsive"
        : "Connection failed",
      services: checks.services
        ? "All required services loaded"
        : "Service loading failed",
      memory: checks.memory
        ? `RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(
            memUsage.heapUsed / 1024 / 1024
          )}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
        : "Memory usage critical",
      disk: checks.disk ? "Disk space available" : "Disk space critical",
      connectionPool: checks.connectionPool
        ? connectionPoolStatus
        : "Connection pool unavailable",
      performance: checks.performance
        ? "Performance monitoring active"
        : "Performance monitoring failed",
      resourceCleanup: checks.resourceCleanup
        ? "Resource cleanup active"
        : "Resource cleanup failed",
      destination: checks.destination
        ? "Email destination accessible"
        : "Email destination not accessible",
    };
  }

  /**
   * Check performance monitoring
   */
  private async checkPerformance(): Promise<boolean> {
    try {
      const perfMonitor =
        (performanceMonitor as any).default || performanceMonitor;
      const status = perfMonitor.getStatus();
      return status.isMonitoring;
    } catch (error) {
      console.warn("Performance monitoring check failed:", error);
      return false;
    }
  }

  /**
   * Check resource cleanup
   */
  private async checkResourceCleanup(): Promise<boolean> {
    try {
      const cleanup = (resourceCleanup as any).default || resourceCleanup;
      const status = cleanup.getStatus();
      return status.isRunning;
    } catch (error) {
      console.warn("Resource cleanup check failed:", error);
      return false;
    }
  }

  /**
   * Check email destination configuration
   */
  private async checkDestination(): Promise<boolean> {
    try {
      // Use hardcoded destination name from MTA
      const destinationName = "shiftbook-email";

      console.log(`🔍 [HEALTH] Checking destination: ${destinationName}`);
      console.log(`🔍 [HEALTH] Using hardcoded destination name`);

      // Try to get the destination
      const destination = await getDestination({
        destinationName: destinationName,
      });

      if (destination) {
        console.log(
          `✅ [HEALTH] Destination '${destinationName}' is accessible`
        );
        console.log(
          `✅ [HEALTH] Destination URL: ${destination.url || "not set"}`
        );
        console.log(
          `✅ [HEALTH] Destination type: ${destination.type || "not set"}`
        );
        return true;
      } else {
        console.log(
          `⚠️ [HEALTH] Destination '${destinationName}' not found or not accessible`
        );
        return false;
      }
    } catch (error) {
      console.log(`❌ [HEALTH] Destination check failed: ${error.message}`);
      console.log(`❌ [HEALTH] Error details:`, error);
      return false;
    }
  }

  /**
   * Get simple health status for load balancers
   */
  async getSimpleHealth(): Promise<{ status: string; timestamp: string }> {
    const healthStatus = await this.getHealthStatus();
    return {
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
    };
  }

  /**
   * Get comprehensive Prometheus metrics
   */
  async getPrometheusMetrics(): Promise<string> {
    const metrics: string[] = [];

    // Add standard application metrics
    const uptime = Date.now() - this.startTime;
    metrics.push(
      "# HELP application_uptime_seconds Application uptime in seconds"
    );
    metrics.push("# TYPE application_uptime_seconds gauge");
    metrics.push(`application_uptime_seconds ${uptime / 1000}`);

    // Add memory metrics
    const memUsage = process.memoryUsage();
    metrics.push(
      "# HELP process_memory_heap_used_bytes Heap memory usage in bytes"
    );
    metrics.push("# TYPE process_memory_heap_used_bytes gauge");
    metrics.push(`process_memory_heap_used_bytes ${memUsage.heapUsed}`);

    metrics.push(
      "# HELP process_memory_heap_total_bytes Total heap memory in bytes"
    );
    metrics.push("# TYPE process_memory_heap_total_bytes gauge");
    metrics.push(`process_memory_heap_total_bytes ${memUsage.heapTotal}`);

    // Add performance metrics if available
    try {
      const perfMonitor =
        (performanceMonitor as any).default || performanceMonitor;
      const perfMetrics = perfMonitor.getPrometheusMetrics();
      if (perfMetrics) {
        metrics.push(perfMetrics);
      }
    } catch (error) {
      console.warn(
        "Could not retrieve performance metrics for Prometheus:",
        error
      );
    }

    // Add connection pool metrics if available
    try {
      const poolMetrics = connectionPoolMonitor.getMetrics();
      if (poolMetrics) {
        metrics.push(
          "# HELP connection_pool_active_connections Active database connections"
        );
        metrics.push("# TYPE connection_pool_active_connections gauge");
        metrics.push(
          `connection_pool_active_connections ${
            poolMetrics.activeConnections || 0
          }`
        );

        metrics.push(
          "# HELP connection_pool_idle_connections Idle database connections"
        );
        metrics.push("# TYPE connection_pool_idle_connections gauge");
        metrics.push(
          `connection_pool_idle_connections ${poolMetrics.idleConnections || 0}`
        );
      }
    } catch (error) {
      console.warn(
        "Could not retrieve connection pool metrics for Prometheus:",
        error
      );
    }

    return metrics.join("\n") + "\n";
  }
}

// Create singleton instance
const healthCheckService = new HealthCheckService();

// Export for use in other modules
export { healthCheckService };
export type { HealthStatus };

// Temporary email test function
async function testEmailFunction(req: Request, res: Response) {
  try {
    console.log("🔧 [EMAIL TEST] Starting email test...");

    // Import EmailService dynamically to avoid circular dependencies
    const { EmailService } = await import("./lib/email-service");
    const emailService = EmailService.getInstance();

    console.log("🔧 [EMAIL TEST] EmailService imported and instantiated");

    // Initialize the email service
    await emailService.initialize();
    console.log("🔧 [EMAIL TEST] EmailService initialized");

    // Get the email from request body or use default
    const requestBody = req.body || {};
    const testEmail = requestBody.email || "xavier.gonzalez@syntax.com";

    console.log(`🔧 [EMAIL TEST] Sending test email to: ${testEmail}`);

    // Send test email
    const result = await emailService.sendMail({
      to: testEmail,
      subject: `ShiftBook Health Test - ${new Date().toISOString()}`,
      html: `
        <h2>🎉 ShiftBook Health Endpoint Email Test SUCCESS!</h2>
        <p>This email was sent from the health check endpoint for validation purposes.</p>
        <h3>Test Details:</h3>
        <ul>
          <li><strong>Method:</strong> Health Endpoint POST /health/email-test</li>
          <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          <li><strong>Environment:</strong> ${process.env.NODE_ENV}</li>
          <li><strong>Destination:</strong> ${
            process.env.EMAIL_DESTINATION_NAME || "shiftbook-email"
          }</li>
          <li><strong>Application Status:</strong> ${
            (
              await healthCheckService.getHealthStatus()
            ).status
          }</li>
        </ul>
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px; border-radius: 5px; margin: 20px 0;">
          <strong>✅ SUCCESS:</strong> Email service is working correctly through the health endpoint!
        </div>
        <p>Best regards,<br><strong>ShiftBook Health Test System</strong></p>
      `,
      text: `
ShiftBook Health Endpoint Email Test SUCCESS!

This email was sent from the health check endpoint for validation purposes.

Test Details:
- Method: Health Endpoint POST /health/email-test
- Timestamp: ${new Date().toISOString()}
- Environment: ${process.env.NODE_ENV}
- Destination: ${process.env.EMAIL_DESTINATION_NAME || "shiftbook-email"}

SUCCESS: Email service is working correctly through the health endpoint!

Best regards,
ShiftBook Health Test System
      `,
    });

    console.log("🔧 [EMAIL TEST] Email sent successfully:", result);

    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
      timestamp: new Date().toISOString(),
      recipient: testEmail,
      result: result,
      environment: process.env.NODE_ENV,
      destination: process.env.EMAIL_DESTINATION_NAME || "shiftbook-email",
    });
  } catch (error) {
    console.error("🔧 [EMAIL TEST] Email test failed:", error);

    res.status(500).json({
      success: false,
      message: "Email test failed",
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}

// Express middleware for health check endpoints
export function healthCheckMiddleware(
  req: Request,
  res: Response,
  next: Function
) {
  const path = req.path;

  // Health check endpoints should be public and not require authentication
  if (path === "/health") {
    healthCheckService
      .getHealthStatus()
      .then((status) => {
        const statusCode =
          status.status === "healthy"
            ? 200
            : status.status === "degraded"
            ? 200
            : 503;
        res.status(statusCode).json(status);
      })
      .catch((error) => {
        console.error("Health check error:", error);
        res.status(503).json({
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          error: "Health check failed",
        });
      });
  } else if (path === "/health/email-test" && req.method === "POST") {
    // Temporary email test endpoint for validation
    console.log("🔧 [EMAIL TEST] Received email test request");
    testEmailFunction(req, res);
  } else if (path === "/health/simple") {
    healthCheckService
      .getSimpleHealth()
      .then((status) => {
        // Load balancers should accept both healthy and degraded as OK
        const statusCode =
          status.status === "healthy" || status.status === "degraded"
            ? 200
            : 503;
        res.status(statusCode).json(status);
      })
      .catch((error) => {
        console.error("Simple health check error:", error);
        res.status(503).json({
          status: "unhealthy",
          timestamp: new Date().toISOString(),
        });
      });
  } else if (path === "/metrics") {
    // Prometheus metrics endpoint
    healthCheckService
      .getPrometheusMetrics()
      .then((metrics) => {
        res.set("Content-Type", "text/plain");
        res.status(200).send(metrics);
      })
      .catch((error) => {
        console.error("Metrics endpoint error:", error);
        res.status(503).send("# Metrics collection failed\n");
      });
  } else {
    // Not a health endpoint - pass through to next middleware
    next();
  }
}
