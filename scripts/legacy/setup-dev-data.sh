#!/bin/bash

# Development Data Setup Script
# This script loads sample data for local development only

echo "🔧 Setting up development data..."

# Copy development CSV files to main data directory for local deployment
if [ -d "db/data/dev" ]; then
    echo "📁 Copying development CSV files..."
    cp db/data/dev/*.csv db/data/ 2>/dev/null || true
fi

echo "✅ Development data setup complete!"
echo "Note: CSV files are excluded from production builds via .cdsignore"
