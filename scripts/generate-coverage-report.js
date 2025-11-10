#!/usr/bin/env node

/**
 * Unit Test Coverage Report Generator
 * 
 * This script generates coverage reports for unit tests focusing on business logic:
 * - Unit Tests: Business logic modules (srv/lib/*.ts)
 * - Aligns with testing pyramid philosophy: coverage meaningful for unit tests only
 * - Integration/E2E tests use functional validation instead of coverage metrics
 * 
 * Usage: node scripts/generate-coverage-report.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COVERAGE_DIR = path.join(__dirname, '../coverage-reports');

// Ensure coverage reports directory exists
if (!fs.existsSync(COVERAGE_DIR)) {
    fs.mkdirSync(COVERAGE_DIR, { recursive: true });
}

console.log('🎯 Generating Unit Test Coverage Report...\n');

const reports = [
    {
        name: 'Unit Tests (Business Logic)',
        command: 'npm run test:coverage',
        outputDir: 'coverage',
        description: 'Coverage focused on business logic modules (srv/lib/*.ts) - meaningful for unit tests'
    }
];

const results = [];

for (const report of reports) {
    console.log(`\n📊 Running ${report.name}...`);
    console.log(`📝 ${report.description}`);
    console.log('─'.repeat(60));
    
    try {
        const output = execSync(report.command, { 
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        
        // Extract coverage summary from output
        const lines = output.split('\n');
        let coverageSummary = null;
        
        // Find coverage summary section
        const summaryStart = lines.findIndex(line => line.includes('All files'));
        if (summaryStart !== -1) {
            // Get the line with coverage percentages
            const summaryLine = lines[summaryStart];
            const match = summaryLine.match(/(\d+\.?\d*)/g);
            if (match && match.length >= 4) {
                coverageSummary = {
                    statements: parseFloat(match[0]),
                    branches: parseFloat(match[1]), 
                    functions: parseFloat(match[2]),
                    lines: parseFloat(match[3])
                };
            }
        }
        
        results.push({
            name: report.name,
            description: report.description,
            outputDir: report.outputDir,
            status: 'SUCCESS',
            coverage: coverageSummary
        });
        
        console.log(`✅ ${report.name} completed successfully`);
        if (coverageSummary) {
            console.log(`📈 Coverage: ${coverageSummary.statements}% statements, ${coverageSummary.branches}% branches, ${coverageSummary.functions}% functions, ${coverageSummary.lines}% lines`);
        }
        
    } catch (error) {
        console.log(`❌ ${report.name} failed`);
        console.error(error.stdout || error.message);
        
        results.push({
            name: report.name,
            description: report.description,
            outputDir: report.outputDir,
            status: 'FAILED',
            error: error.message
        });
    }
}

// Generate summary report
console.log('\n' + '='.repeat(80));
console.log('🎯 UNIT TEST COVERAGE REPORT SUMMARY');
console.log('='.repeat(80));

const timestamp = new Date().toISOString();
const summaryReport = {
    timestamp,
    reports: results,
    summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'SUCCESS').length,
        failed: results.filter(r => r.status === 'FAILED').length
    }
};

// Save summary to JSON file
const summaryPath = path.join(COVERAGE_DIR, 'coverage-summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summaryReport, null, 2));

// Display console summary
results.forEach(result => {
    console.log(`\n📊 ${result.name}`);
    console.log(`   ${result.description}`);
    console.log(`   Status: ${result.status === 'SUCCESS' ? '✅' : '❌'} ${result.status}`);
    
    if (result.coverage) {
        console.log(`   Coverage:`);
        console.log(`   • Statements: ${result.coverage.statements}%`);
        console.log(`   • Branches:   ${result.coverage.branches}%`);
        console.log(`   • Functions:  ${result.coverage.functions}%`);
        console.log(`   • Lines:      ${result.coverage.lines}%`);
    }
    
    if (result.error) {
        console.log(`   Error: ${result.error}`);
    }
    
    console.log(`   HTML Report: ${result.outputDir}/lcov-report/index.html`);
});

console.log(`\n📋 Summary Report saved to: ${summaryPath}`);
console.log('\n🎯 Unit Test Coverage Analysis Complete!');
console.log('📝 Note: Coverage is only generated for unit tests (business logic modules)');
console.log('📈 Integration/E2E tests use functional validation instead of coverage metrics');

// Return appropriate exit code
const hasFailures = results.some(r => r.status === 'FAILED');
process.exit(hasFailures ? 1 : 0);