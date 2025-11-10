#!/bin/bash

# Test script for ShiftBook Work Centers functionality
# This script runs the specific work center tests and provides feedback

set -e

echo "🔧 Starting ShiftBook Work Centers Tests..."
echo "================================================"

# Set test environment
export NODE_ENV=test
export CDS_ENV=test
export EMAIL_SIMULATION_MODE=true

# Run the work center specific tests
echo "📋 Running Work Center Integration Tests..."
npx jest test/service/actions/shiftbook-workcenters.integration.test.ts --verbose

echo ""
echo "📋 Running Updated Action Tests (with work center validation)..."
npx jest test/service/actions/shiftbook-actions.integration.test.ts --testNamePattern="should create category with workcenters successfully" --verbose

echo ""
echo "✅ Work Center Tests Completed!"
echo ""
echo "📝 Test Summary:"
echo "- ShiftBookCategoryWC and ShiftBookLogWC table operations"
echo "- Work center inheritance from category to logs"
echo "- Flexible log filtering with include_dest_work_center parameter"
echo "- Category work center CRUD operations"
echo "- Database cleanup and foreign key relationships"
echo ""
echo "🎯 To run all tests: npm test"
echo "🎯 To run only work center tests: npx jest workcenters"
echo "🎯 To run in watch mode: npx jest --watch workcenters"