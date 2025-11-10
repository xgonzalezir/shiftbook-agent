const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Log management utility for ShiftBookSrv
class LogManager {
  constructor() {
    this.appName = 'ShiftBookSrv';
    this.logTypes = {
      recent: 'Recent logs (last ~1000 lines)',
      stream: 'Real-time log streaming',
      filtered: 'Filtered logs by pattern'
    };
  }

  async getRecentLogs(lines = 100) {
    try {
      console.log(`📋 Fetching recent logs (last ${lines} lines)...`);
      const { stdout, stderr } = await execAsync(`cf logs ${this.appName} --recent | tail -${lines}`);
      
      if (stderr) {
        console.error('❌ Error fetching logs:', stderr);
        return null;
      }
      
      return stdout;
    } catch (error) {
      console.error('❌ Failed to fetch logs:', error.message);
      return null;
    }
  }

  async getFilteredLogs(pattern, lines = 50) {
    try {
      console.log(`🔍 Filtering logs with pattern: ${pattern}`);
      const { stdout, stderr } = await execAsync(
        `cf logs ${this.appName} --recent | grep -E "${pattern}" | tail -${lines}`
      );
      
      if (stderr && !stdout) {
        console.log('ℹ️ No logs matching pattern found');
        return null;
      }
      
      return stdout;
    } catch (error) {
      console.error('❌ Failed to filter logs:', error.message);
      return null;
    }
  }

  async getAuthenticationLogs(lines = 20) {
    console.log('🔐 Fetching authentication-related logs...');
    return await this.getFilteredLogs('(🔐|✅|❌|JWT|XSUAA|auth|scope)', lines);
  }

  async getErrorLogs(lines = 30) {
    console.log('⚠️ Fetching error and warning logs...');
    return await this.getFilteredLogs('(ERROR|WARN|error|warning|❌|🚨)', lines);
  }

  async getPerformanceLogs(lines = 20) {
    console.log('📊 Fetching performance-related logs...');
    return await this.getFilteredLogs('(performance|timing|slow|latency|⏱️|📈)', lines);
  }

  async getBusinessLogs(lines = 25) {
    console.log('💼 Fetching business logic logs...');
    return await this.getFilteredLogs('(shiftbook|category|log|entry|mail|translation)', lines);
  }

  formatLogOutput(logs, title) {
    if (!logs) {
      console.log(`📭 No ${title.toLowerCase()} found\n`);
      return;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ${title.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);
    console.log(logs);
    console.log(`${'='.repeat(60)}\n`);
  }

  async generateLogReport() {
    console.log('📊 GENERATING COMPREHENSIVE LOG REPORT');
    console.log('=' .repeat(70));

    // Get different types of logs
    const authLogs = await this.getAuthenticationLogs();
    const errorLogs = await this.getErrorLogs();
    const perfLogs = await this.getPerformanceLogs();
    const businessLogs = await this.getBusinessLogs();

    // Format and display results
    this.formatLogOutput(authLogs, 'Authentication Logs');
    this.formatLogOutput(errorLogs, 'Error & Warning Logs'); 
    this.formatLogOutput(perfLogs, 'Performance Logs');
    this.formatLogOutput(businessLogs, 'Business Logic Logs');

    // Show log access methods
    console.log('🔧 LOG ACCESS METHODS:');
    console.log('=' .repeat(40));
    console.log('1. CF CLI Commands:');
    console.log('   cf logs ShiftBookSrv --recent');
    console.log('   cf logs ShiftBookSrv (real-time)');
    console.log('   cf logs ShiftBookSrv --recent | grep "pattern"');
    console.log('');
    console.log('2. SAP BTP Logging Service Dashboard:');
    console.log('   https://logs.cf.us10-001.hana.ondemand.com');
    console.log('');
    console.log('3. Application Insights:');
    console.log('   - Authentication: grep -E "(🔐|✅|❌|JWT|auth)"');
    console.log('   - Errors: grep -E "(ERROR|WARN|❌)"'); 
    console.log('   - Performance: grep -E "(performance|timing)"');
    console.log('   - Business: grep -E "(shiftbook|category|log)"');
    console.log('=' .repeat(40));
  }

  async showLogCommands() {
    console.log('\n🛠️ USEFUL LOG COMMANDS:');
    console.log('=' .repeat(50));
    
    const commands = [
      {
        name: 'Recent Logs',
        command: `cf logs ${this.appName} --recent`,
        description: 'Get recent application logs'
      },
      {
        name: 'Real-time Stream',
        command: `cf logs ${this.appName}`,
        description: 'Stream logs in real-time'
      },
      {
        name: 'Authentication Logs',
        command: `cf logs ${this.appName} --recent | grep -E "(🔐|JWT|auth)"`,
        description: 'Filter authentication-related logs'
      },
      {
        name: 'Error Logs',
        command: `cf logs ${this.appName} --recent | grep -E "(ERROR|WARN)"`,
        description: 'Show only errors and warnings'
      },
      {
        name: 'Business Logs',
        command: `cf logs ${this.appName} --recent | grep "shiftbook"`,
        description: 'Show business logic logs'
      },
      {
        name: 'HTTP Requests',
        command: `cf logs ${this.appName} --recent | grep -E "(GET|POST|PUT|DELETE)"`,
        description: 'Show HTTP request logs'
      },
      {
        name: 'Performance Logs',
        command: `cf logs ${this.appName} --recent | grep -E "(ms|timing|performance)"`,
        description: 'Show performance-related logs'
      }
    ];

    commands.forEach((cmd, index) => {
      console.log(`${index + 1}. ${cmd.name}:`);
      console.log(`   📋 ${cmd.description}`);
      console.log(`   💻 ${cmd.command}`);
      console.log('');
    });
  }

  async checkLogService() {
    try {
      console.log('🔍 Checking logging service status...');
      const { stdout } = await execAsync(`cf service shiftbook-logging`);
      console.log('\n📊 LOGGING SERVICE STATUS:');
      console.log('=' .repeat(40));
      console.log(stdout);
    } catch (error) {
      console.error('❌ Failed to check logging service:', error.message);
    }
  }
}

// CLI interface
async function main() {
  const logManager = new LogManager();
  const command = process.argv[2] || 'report';

  console.log('🚀 SHIFTBOOK LOG MANAGEMENT TOOL');
  console.log('=' .repeat(40));

  switch (command) {
    case 'report':
      await logManager.generateLogReport();
      break;
    
    case 'auth':
      const authLogs = await logManager.getAuthenticationLogs();
      logManager.formatLogOutput(authLogs, 'Authentication Logs');
      break;
    
    case 'errors':
      const errorLogs = await logManager.getErrorLogs();
      logManager.formatLogOutput(errorLogs, 'Error & Warning Logs');
      break;
    
    case 'performance':
      const perfLogs = await logManager.getPerformanceLogs();
      logManager.formatLogOutput(perfLogs, 'Performance Logs');
      break;
    
    case 'business':
      const businessLogs = await logManager.getBusinessLogs();
      logManager.formatLogOutput(businessLogs, 'Business Logic Logs');
      break;
    
    case 'recent':
      const recentLogs = await logManager.getRecentLogs(50);
      logManager.formatLogOutput(recentLogs, 'Recent Logs');
      break;
    
    case 'service':
      await logManager.checkLogService();
      break;
    
    case 'commands':
      await logManager.showLogCommands();
      break;
    
    case 'help':
      console.log('📚 AVAILABLE COMMANDS:');
      console.log('  node scripts/log-management.js [command]');
      console.log('');
      console.log('Commands:');
      console.log('  report      - Generate comprehensive log report (default)');
      console.log('  auth        - Show authentication logs');
      console.log('  errors      - Show error and warning logs');
      console.log('  performance - Show performance logs');
      console.log('  business    - Show business logic logs');
      console.log('  recent      - Show recent logs');
      console.log('  service     - Check logging service status');
      console.log('  commands    - Show useful CF CLI commands');
      console.log('  help        - Show this help message');
      break;
    
    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log('Use "help" to see available commands');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = LogManager;