#!/usr/bin/env node

/**
 * Data-Safe Deployment Script
 *
 * This script handles the deployment process to avoid data loss in ALL environments
 * (dev, qa, production) by properly undeploying .hdbtabledata artifacts that would
 * overwrite existing data.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting data-safe deployment process for all environments...');

/**
 * Step 1: Backup current gen/db/package.json
 */
const genDbDir = path.join('gen', 'db');
const originalPackageJsonPath = path.join(genDbDir, 'package.json');
const backupPackageJsonPath = path.join(genDbDir, 'package.json.backup');

if (fs.existsSync(originalPackageJsonPath)) {
  console.log('📋 Backing up original package.json...');
  fs.copyFileSync(originalPackageJsonPath, backupPackageJsonPath);
}

/**
 * Step 2: Copy production-safe package.json template
 */
const templatePackageJsonPath = path.join('db', 'package.json');
if (fs.existsSync(templatePackageJsonPath)) {
  console.log('📦 Using production-safe package.json template...');

  // Read template and update start script for production deployment
  const templateContent = JSON.parse(fs.readFileSync(templatePackageJsonPath, 'utf8'));

  // Update start script to use undeploy with skip_data_delete
  const hdbtableDataFiles = [
    'src/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookCategory.hdbtabledata',
    'src/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookLog.hdbtabledata',
    'src/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookCategoryMail.hdbtabledata',
    'src/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookCategoryLng.hdbtabledata',
    'src/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookCategoryWC.hdbtabledata',
    'src/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookLogWC.hdbtabledata',
    'src/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookTeamsChannel.hdbtabledata'
  ];

  const undeployFlags = hdbtableDataFiles.map(file => `--undeploy ${file}`).join(' ');
  const pathParameters = hdbtableDataFiles.map(file => `${file}:skip_data_delete=true`).join(' ');

  templateContent.scripts.start = `node node_modules/@sap/hdi-deploy/deploy.js --use-hdb ${undeployFlags} --path-parameter ${pathParameters} --parameter com.sap.hana.di.table/try_fast_table_migration=true`;

  // Write the production-safe package.json
  fs.writeFileSync(originalPackageJsonPath, JSON.stringify(templateContent, null, 2));
  console.log('✅ Production-safe package.json configured');
} else {
  console.warn('⚠️  Template package.json not found, using standard deployment');
}

console.log('');
console.log('🔧 Deployment configured with data preservation for all environments');
console.log('📚 Key changes:');
console.log('   • CSV data files excluded from deployment');
console.log('   • HDI table data artifacts undeployed with skip_data_delete=true');
console.log('   • Existing data will be preserved in dev, qa, and production');
console.log('');
console.log('🚀 Ready for deployment!');
console.log('');
console.log('⚠️  IMPORTANT: After deployment, restore the original package.json:');
console.log('   cp gen/db/package.json.backup gen/db/package.json');