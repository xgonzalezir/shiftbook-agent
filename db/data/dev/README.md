# Development CSV Data

This directory contains CSV files for development and reference purposes.

## 📁 Contents

- **ShiftBookCategory.csv**: Category master data
- **ShiftBookCategoryLng.csv**: Category language texts
- **ShiftBookCategoryMail.csv**: Category email configurations  
- **ShiftBookCategoryWC.csv**: Category work center assignments
- **ShiftBookLog.csv**: Sample log entries
- **ShiftBookLogWC.csv**: Log work center data
- **ShiftBookTeamsChannel.csv**: Teams channel configurations

## 🚫 Deployment Exclusion

These files are **automatically excluded** from production deployments to prevent HDI issues.

- ✅ **Available for development**: Files can be used for local testing
- ✅ **Safe from deployment**: Excluded via `--exclude='data/dev'` in build process
- ✅ **Automatically cleaned**: Removed by cleanup scripts if accidentally copied

## 📝 Usage

Use these files for:
- Local development data seeding
- Reference for data structure
- Manual testing scenarios
- Data validation examples

## ⚠️ Important Notes

- Do **NOT** move these files to `db/data/` root (would cause deployment issues)
- Keep them in this `dev` subdirectory for safety
- They are preserved here for historical reference and development use