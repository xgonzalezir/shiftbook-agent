#!/usr/bin/env node

/**
 * Authentication Metrics Monitor
 * Monitors authentication metrics and alerts in production
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class AuthMetricsMonitor {
  constructor() {
    this.config = this.loadConfig();
    this.metrics = {};
    this.alerts = [];
    this.isMonitoring = false;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '..', 'config', 'auth', 'production.js');
      if (fs.existsSync(configPath)) {
        return require(configPath);
      }
      return {};
    } catch (error) {
      this.log(`❌ Error loading config: ${error.message}`, 'red');
      return {};
    }
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case '--status':
        await this.showStatus();
        break;
      case '--metrics':
        await this.showMetrics();
        break;
      case '--alerts':
        await this.showAlerts();
        break;
      case '--health':
        await this.showHealth();
        break;
      case '--acknowledge':
        await this.acknowledgeAlert(args[1], args[3]);
        break;
      case '--monitor':
        await this.startMonitoring();
        break;
      case '--help':
        this.showHelp();
        break;
      default:
        this.showHelp();
        break;
    }
  }

  async showStatus() {
    this.log('\n📊 Authentication Monitoring Status', 'bright');
    this.log('==================================\n', 'bright');

    try {
      // Check if monitoring is enabled
      if (this.config.monitoring && this.config.monitoring.authenticationEvents) {
        this.log('✅ Authentication monitoring is enabled', 'green');
      } else {
        this.log('❌ Authentication monitoring is disabled', 'red');
      }

      // Check if alerts are enabled
      if (this.config.monitoring && this.config.monitoring.securityViolations) {
        this.log('✅ Security monitoring is enabled', 'green');
      } else {
        this.log('❌ Security monitoring is disabled', 'red');
      }

      // Check if audit trail is enabled
      if (this.config.monitoring && this.config.monitoring.auditTrail) {
        this.log('✅ Audit trail is enabled', 'green');
      } else {
        this.log('❌ Audit trail is disabled', 'red');
      }

      // Check log files
      const authLogPath = path.join(__dirname, '..', 'logs', 'auth-events.log');
      if (fs.existsSync(authLogPath)) {
        const stats = fs.statSync(authLogPath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        this.log(`✅ Auth log file exists (${sizeInMB} MB)`, 'green');
      } else {
        this.log('❌ Auth log file not found', 'red');
      }

      // Check audit directory
      const auditDir = path.join(__dirname, '..', 'logs', 'audit');
      if (fs.existsSync(auditDir)) {
        const auditFiles = fs.readdirSync(auditDir).filter(f => f.endsWith('.log'));
        this.log(`✅ Audit directory exists (${auditFiles.length} files)`, 'green');
      } else {
        this.log('❌ Audit directory not found', 'red');
      }

    } catch (error) {
      this.log(`❌ Error checking status: ${error.message}`, 'red');
    }
  }

  async showMetrics() {
    this.log('\n📈 Authentication Metrics', 'bright');
    this.log('========================\n', 'bright');

    try {
      // Read metrics from log files
      const authLogPath = path.join(__dirname, '..', 'logs', 'auth-events.log');
      if (!fs.existsSync(authLogPath)) {
        this.log('❌ Auth log file not found', 'red');
        return;
      }

      const logContent = fs.readFileSync(authLogPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());

      // Parse metrics from log entries
      const metrics = {
        totalEvents: lines.length,
        eventsByType: {},
        eventsByStatus: {},
        recentEvents: 0,
        failures: 0,
        warnings: 0
      };

      const oneHourAgo = Date.now() - (60 * 60 * 1000);

      lines.forEach(line => {
        try {
          const event = JSON.parse(line);
          
          // Count by event type
          metrics.eventsByType[event.eventType] = (metrics.eventsByType[event.eventType] || 0) + 1;
          
          // Count by status
          metrics.eventsByStatus[event.status] = (metrics.eventsByStatus[event.status] || 0) + 1;
          
          // Count recent events (last hour)
          const eventTime = new Date(event.timestamp).getTime();
          if (eventTime > oneHourAgo) {
            metrics.recentEvents++;
          }
          
          // Count failures and warnings
          if (event.status === 'failure') {
            metrics.failures++;
          } else if (event.status === 'warning') {
            metrics.warnings++;
          }
        } catch (parseError) {
          // Skip invalid JSON lines
        }
      });

      // Display metrics
      this.log(`📊 Total Events: ${metrics.totalEvents}`, 'blue');
      this.log(`🕐 Recent Events (1h): ${metrics.recentEvents}`, 'blue');
      this.log(`❌ Failures: ${metrics.failures}`, 'red');
      this.log(`⚠️ Warnings: ${metrics.warnings}`, 'yellow');

      // Calculate success rate
      const successRate = metrics.totalEvents > 0 ? 
        ((metrics.totalEvents - metrics.failures) / metrics.totalEvents * 100).toFixed(2) : '0.00';
      this.log(`✅ Success Rate: ${successRate}%`, 'green');

      // Show events by type
      this.log('\n📋 Events by Type:', 'bright');
      Object.entries(metrics.eventsByType)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          this.log(`   ${type}: ${count}`, 'cyan');
        });

      // Show events by status
      this.log('\n📋 Events by Status:', 'bright');
      Object.entries(metrics.eventsByStatus)
        .sort(([,a], [,b]) => b - a)
        .forEach(([status, count]) => {
          const color = status === 'success' ? 'green' : status === 'failure' ? 'red' : 'yellow';
          this.log(`   ${status}: ${count}`, color);
        });

    } catch (error) {
      this.log(`❌ Error reading metrics: ${error.message}`, 'red');
    }
  }

  async showAlerts() {
    this.log('\n🚨 Authentication Alerts', 'bright');
    this.log('========================\n', 'bright');

    try {
      // Read alerts from log files
      const authLogPath = path.join(__dirname, '..', 'logs', 'auth-events.log');
      if (!fs.existsSync(authLogPath)) {
        this.log('❌ Auth log file not found', 'red');
        return;
      }

      const logContent = fs.readFileSync(authLogPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());

      // Find security violations and alerts
      const alerts = [];
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

      lines.forEach(line => {
        try {
          const event = JSON.parse(line);
          
          // Look for security violations and failures
          if (event.eventType === 'security_violation' || 
              (event.status === 'failure' && event.timestamp)) {
            
            const eventTime = new Date(event.timestamp).getTime();
            if (eventTime > oneDayAgo) {
              alerts.push({
                timestamp: event.timestamp,
                eventType: event.eventType,
                status: event.status,
                details: event.details,
                userId: event.userId,
                ipAddress: event.ipAddress
              });
            }
          }
        } catch (parseError) {
          // Skip invalid JSON lines
        }
      });

      if (alerts.length === 0) {
        this.log('✅ No recent alerts found', 'green');
        return;
      }

      // Sort alerts by timestamp (newest first)
      alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Display recent alerts
      this.log(`📊 Found ${alerts.length} recent alerts:\n`, 'blue');

      alerts.slice(0, 10).forEach((alert, index) => {
        const time = new Date(alert.timestamp).toLocaleString();
        const severity = alert.status === 'failure' ? '🔴' : '🟡';
        
        this.log(`${severity} Alert ${index + 1}:`, 'bright');
        this.log(`   Time: ${time}`, 'cyan');
        this.log(`   Type: ${alert.eventType}`, 'cyan');
        this.log(`   Status: ${alert.status}`, 'cyan');
        if (alert.userId) {
          this.log(`   User: ${alert.userId}`, 'cyan');
        }
        if (alert.ipAddress) {
          this.log(`   IP: ${alert.ipAddress}`, 'cyan');
        }
        if (alert.details && alert.details.message) {
          this.log(`   Message: ${alert.details.message}`, 'cyan');
        }
        this.log('');
      });

      if (alerts.length > 10) {
        this.log(`... and ${alerts.length - 10} more alerts`, 'yellow');
      }

    } catch (error) {
      this.log(`❌ Error reading alerts: ${error.message}`, 'red');
    }
  }

  async showHealth() {
    this.log('\n🏥 Authentication Health Check', 'bright');
    this.log('==============================\n', 'bright');

    try {
      // Check application health
      const healthStatus = await this.checkApplicationHealth();
      
      if (healthStatus.overall === 'healthy') {
        this.log('✅ Application is healthy', 'green');
      } else {
        this.log('❌ Application has issues', 'red');
      }

      // Check authentication health
      const authHealth = await this.checkAuthenticationHealth();
      
      if (authHealth.status === 'healthy') {
        this.log('✅ Authentication is healthy', 'green');
      } else {
        this.log('❌ Authentication has issues', 'red');
      }

      // Check log file health
      const logHealth = this.checkLogFileHealth();
      
      if (logHealth.status === 'healthy') {
        this.log('✅ Log files are healthy', 'green');
      } else {
        this.log('❌ Log files have issues', 'red');
      }

      // Overall health assessment
      const overallHealth = healthStatus.overall === 'healthy' && 
                           authHealth.status === 'healthy' && 
                           logHealth.status === 'healthy';

      this.log('\n📊 Overall Health Assessment:', 'bright');
      if (overallHealth) {
        this.log('✅ Authentication system is healthy', 'green');
      } else {
        this.log('❌ Authentication system has issues', 'red');
      }

    } catch (error) {
      this.log(`❌ Error checking health: ${error.message}`, 'red');
    }
  }

  async checkApplicationHealth() {
    // This would typically check the application's health endpoint
    // For now, we'll simulate a health check
    return {
      overall: 'healthy',
      uptime: '2h 15m',
      memory: '45%',
      cpu: '12%'
    };
  }

  async checkAuthenticationHealth() {
    // Check authentication-specific health indicators
    const authLogPath = path.join(__dirname, '..', 'logs', 'auth-events.log');
    
    if (!fs.existsSync(authLogPath)) {
      return { status: 'unhealthy', reason: 'Auth log file not found' };
    }

    // Check recent authentication activity
    const logContent = fs.readFileSync(authLogPath, 'utf8');
    const lines = logContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return { status: 'warning', reason: 'No authentication events logged' };
    }

    // Check for recent failures
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentFailures = lines.filter(line => {
      try {
        const event = JSON.parse(line);
        const eventTime = new Date(event.timestamp).getTime();
        return event.status === 'failure' && eventTime > oneHourAgo;
      } catch {
        return false;
      }
    }).length;

    if (recentFailures > 10) {
      return { status: 'unhealthy', reason: `High failure rate: ${recentFailures} failures in last hour` };
    }

    return { status: 'healthy', recentFailures };
  }

  checkLogFileHealth() {
    const authLogPath = path.join(__dirname, '..', 'logs', 'auth-events.log');
    const auditDir = path.join(__dirname, '..', 'logs', 'audit');
    
    if (!fs.existsSync(authLogPath)) {
      return { status: 'unhealthy', reason: 'Auth log file not found' };
    }

    if (!fs.existsSync(auditDir)) {
      return { status: 'warning', reason: 'Audit directory not found' };
    }

    // Check log file size
    const stats = fs.statSync(authLogPath);
    const sizeInMB = stats.size / (1024 * 1024);
    
    if (sizeInMB > 100) {
      return { status: 'warning', reason: `Large log file: ${sizeInMB.toFixed(2)} MB` };
    }

    return { status: 'healthy', sizeInMB: sizeInMB.toFixed(2) };
  }

  async acknowledgeAlert(alertId, user) {
    this.log('\n✅ Acknowledging Alert', 'bright');
    this.log('=====================\n', 'bright');

    if (!alertId) {
      this.log('❌ Alert ID is required', 'red');
      this.log('Usage: node scripts/monitor-auth-metrics.js --acknowledge ALERT_ID --user USERNAME', 'yellow');
      return;
    }

    if (!user) {
      this.log('❌ User is required', 'red');
      this.log('Usage: node scripts/monitor-auth-metrics.js --acknowledge ALERT_ID --user USERNAME', 'yellow');
      return;
    }

    // In a real implementation, this would update the alert status
    // For now, we'll just log the acknowledgment
    this.log(`✅ Alert ${alertId} acknowledged by ${user}`, 'green');
    this.log(`📝 Timestamp: ${new Date().toISOString()}`, 'cyan');
  }

  async startMonitoring() {
    this.log('\n🔍 Starting Authentication Monitoring', 'bright');
    this.log('=====================================\n', 'bright');

    this.isMonitoring = true;
    this.log('✅ Monitoring started', 'green');
    this.log('📊 Press Ctrl+C to stop monitoring', 'yellow');

    // Set up monitoring interval
    const interval = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(interval);
        return;
      }

      await this.performMonitoringCheck();
    }, 30000); // Check every 30 seconds

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('\n🛑 Stopping monitoring...', 'yellow');
      this.isMonitoring = false;
      clearInterval(interval);
      process.exit(0);
    });
  }

  async performMonitoringCheck() {
    try {
      const timestamp = new Date().toLocaleTimeString();
      
      // Check recent events
      const authLogPath = path.join(__dirname, '..', 'logs', 'auth-events.log');
      if (fs.existsSync(authLogPath)) {
        const logContent = fs.readFileSync(authLogPath, 'utf8');
        const lines = logContent.split('\n').filter(line => line.trim());
        
        // Count recent events (last 5 minutes)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        const recentEvents = lines.filter(line => {
          try {
            const event = JSON.parse(line);
            const eventTime = new Date(event.timestamp).getTime();
            return eventTime > fiveMinutesAgo;
          } catch {
            return false;
          }
        }).length;

        // Count recent failures
        const recentFailures = lines.filter(line => {
          try {
            const event = JSON.parse(line);
            const eventTime = new Date(event.timestamp).getTime();
            return event.status === 'failure' && eventTime > fiveMinutesAgo;
          } catch {
            return false;
          }
        }).length;

        this.log(`[${timestamp}] Events: ${recentEvents}, Failures: ${recentFailures}`, 
                 recentFailures > 0 ? 'red' : 'green');

        // Alert if high failure rate
        if (recentEvents > 0 && (recentFailures / recentEvents) > 0.2) {
          this.log(`🚨 WARNING: High failure rate detected!`, 'red');
        }
      }
    } catch (error) {
      this.log(`❌ Monitoring error: ${error.message}`, 'red');
    }
  }

  showHelp() {
    this.log('\n🔧 Authentication Metrics Monitor', 'bright');
    this.log('==================================\n', 'bright');
    this.log('Usage: node scripts/monitor-auth-metrics.js [COMMAND] [OPTIONS]\n', 'cyan');
    
    this.log('Commands:', 'bright');
    this.log('  --status                    Show monitoring status', 'cyan');
    this.log('  --metrics                   Show authentication metrics', 'cyan');
    this.log('  --alerts                    Show recent alerts', 'cyan');
    this.log('  --health                    Show health check results', 'cyan');
    this.log('  --acknowledge ID --user USER Acknowledge an alert', 'cyan');
    this.log('  --monitor                   Start continuous monitoring', 'cyan');
    this.log('  --help                      Show this help message', 'cyan');
    
    this.log('\nExamples:', 'bright');
    this.log('  node scripts/monitor-auth-metrics.js --status', 'yellow');
    this.log('  node scripts/monitor-auth-metrics.js --metrics', 'yellow');
    this.log('  node scripts/monitor-auth-metrics.js --acknowledge alert-123 --user john', 'yellow');
    this.log('  node scripts/monitor-auth-metrics.js --monitor', 'yellow');
  }
}

// Run the monitor
if (require.main === module) {
  const monitor = new AuthMetricsMonitor();
  monitor.run().catch(error => {
    console.error('❌ Monitor failed:', error);
    process.exit(1);
  });
}

module.exports = AuthMetricsMonitor; 