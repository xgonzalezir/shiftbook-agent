const fs = require("fs");
const rimraf = require("rimraf");
const glob = require("glob");
const path = require("path");

console.log("🧹 Starting cleanup of deployment-problematic files...");

// Clean directories that can cause HDI deployment issues
const problematicDirs = [
  "gen/db/data/backup",
  "gen/db/data/dev", // Dev CSV files that could cause HDI issues if copied
  "db/data/backup", // Only if it gets recreated accidentally
];

let cleaned = false;
let hasErrors = false;

problematicDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    try {
      console.log(`🗂️  Removing problematic directory: ${dir}`);
      rimraf.sync(dir);
      console.log(`   ✅ Removed: ${dir}`);
      cleaned = true;
    } catch (error) {
      console.error(`   ❌ ERROR removing ${dir}:`, error.message);
      hasErrors = true;
    }
  }
});

// Clean any auto-generated .hdbtabledata files that could cause deployment issues
const hdbtableDataFiles = glob.sync("gen/db/src/gen/data/**/*.hdbtabledata");
if (hdbtableDataFiles.length > 0) {
  console.log(
    `🗑️  Found ${hdbtableDataFiles.length} .hdbtabledata files to clean`
  );
  hdbtableDataFiles.forEach((file) => {
    try {
      rimraf.sync(file);
      console.log(`   ✅ Removed: ${file}`);
      cleaned = true;
    } catch (error) {
      console.error(`   ❌ ERROR removing ${file}:`, error.message);
      hasErrors = true;
    }
  });
}

// Also clean the data directory if it's empty
const dataDir = "gen/db/src/gen/data";
if (fs.existsSync(dataDir)) {
  try {
    const files = fs.readdirSync(dataDir);
    if (files.length === 0) {
      rimraf.sync(dataDir);
      console.log(`🗂️  Removed empty data directory: ${dataDir}`);
      cleaned = true;
    }
  } catch (error) {
    console.error(`   ❌ ERROR checking data directory:`, error.message);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error("❌ CLEANUP FAILED: Critical errors occurred during cleanup!");
  process.exit(1);
}

if (!cleaned) {
  console.log("✅ No problematic deployment files found - project is clean!");
} else {
  console.log("✨ Cleanup completed successfully!");
}
