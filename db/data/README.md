# Database Data Configuration

## Overview
This directory contains database initialization data for the Shift Book CAP service.

## Directory Structure

```
db/data/
├── README.md          # This file
└── dev/              # Development-only sample data
    ├── *.csv         # Sample CSV files for local development
    └── ...
```

## Environment-Specific Data Loading

### Development Environment
- **Local SQLite**: Automatically loads CSV files from `dev/` directory
- **Sample Data**: Includes realistic test data for development and testing
- **Auto-Setup**: Run `npm run setup:dev-data` to copy dev data for local use

### Production Environment
- **HANA Cloud**: Only schema deployment, no initial data
- **Clean Start**: Production database starts empty
- **Data Exclusion**: CSV files are excluded via `.cdsignore`

## Usage

### Local Development
```bash
npm run dev              # Automatically sets up dev data and starts watch mode
npm run setup:dev-data   # Manually copy dev data to main data directory
```

### Production Deployment
```bash
npm run build           # Builds without including CSV files
npm run build:mta       # Creates MTA archive without development data
```

## File Naming Convention

CSV files follow the entity naming pattern:
- `syntax.gbi.sap.dme.plugins.shiftbook-{EntityName}.csv`

## Security Note

⚠️ **Important**: Development data files contain sample information only. Never include real production data in CSV files committed to version control.
- **Description**: Translations for categories in Spanish and German
- **Records**: 26 translations 
- **Key Fields**: category, lng, werks
- **Languages**: ES (Spanish), DE (German)

### 4. ShiftBookLog.csv
- **Description**: Sample shift book log entries
- **Records**: 15 log entries across different work centers
- **Key Fields**: guid, werks, category
- **Features**: Realistic production scenarios with various categories

## Data Relationships:

```
ShiftBookCategory (1) ---> (many) ShiftBookCategoryMail
ShiftBookCategory (1) ---> (many) ShiftBookCategoryLng  
ShiftBookCategory (1) ---> (many) ShiftBookLog
```

## Sample Data Overview:

### Categories:
1. Production Issues (email enabled)
2. Quality Control (email enabled) 
3. Maintenance Required
4. Safety Incident (email enabled)
5. Training Required
6. Equipment Malfunction (email enabled)
7. Process Improvement
8. Shift Handover (email enabled)
9. Supply Chain Issue (email enabled)
10. General Information

### Plants:
- **1000**: Main production facility
- **2000**: Secondary production facility

### Work Centers:
- WC_ASSEMBLY_01/02: Assembly lines
- WC_QUALITY_01: Quality control
- WC_PACKAGING: Packaging line
- WC_WELDING: Welding operations
- WC_TESTING: Testing station
- WC_MOLDING: Molding operations
- WC_INSPECTION: Inspection area
- WC_CUTTING: Cutting operations
- WC_GRINDING: Grinding station
- WC_HEAT_TREATMENT: Heat treatment
- WC_PAINTING: Paint booth
- WC_DRILLING: Drilling operations

## Usage:

These files are automatically loaded when the CAP service starts with `--with-mocks` flag or in development mode.

To reload mock data:
```bash
cds deploy --to sqlite --with-mocks
```

## Data Scenarios Covered:

✅ **Production Issues**: Machine failures, line stoppages
✅ **Quality Control**: Failed inspections, improvements  
✅ **Safety**: Incidents and safety protocols
✅ **Maintenance**: Preventive and corrective maintenance
✅ **Training**: Operator certification and training
✅ **Materials**: Supply chain and material shortages
✅ **Shift Management**: Handover notes and targets
✅ **Multilingual**: Spanish and German translations
✅ **Email Notifications**: Multiple recipients per category
