#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up development data...');

const devDataDir = path.join('db', 'data', 'dev');
const targetDataDir = path.join('db', 'data');

if (fs.existsSync(devDataDir)) {
  console.log('📁 Copying development CSV files...');
  
  try {
    const files = fs.readdirSync(devDataDir);
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    
    csvFiles.forEach(file => {
      const srcPath = path.join(devDataDir, file);
      const destPath = path.join(targetDataDir, file);
      fs.copyFileSync(srcPath, destPath);
    });
  } catch (error) {
    // Silently ignore errors (equivalent to 2>/dev/null || true)
  }
}

console.log('✅ Development data setup complete!');
console.log('Note: CSV files are excluded from production builds via .cdsignore');