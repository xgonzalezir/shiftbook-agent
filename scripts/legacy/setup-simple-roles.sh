#!/bin/bash

# Setup Simple Role Collections for Cross-Subaccount User Propagation
# Maps to existing role templates: ShiftOperator, ShiftSupervisor, ShiftBookAdmin

set -e

# Configuration
SUBACCOUNT_ID="38cfaa51-b35d-4b26-b543-f3c9abde9ef7"
SPACE_NAME="dev"
ORG_NAME="manu-dev-org"
XSAPPNAME="shiftbook-cap-manu-dev-org-dev"

echo "🚀 Setting up simple role collections for user propagation..."
echo "Subaccount: $SUBACCOUNT_ID"
echo "Using existing role templates: ShiftOperator, ShiftSupervisor, ShiftBookAdmin"

# Ensure we're logged into BTP CLI
echo "📋 Checking BTP CLI login..."
btp get accounts/global-account > /dev/null 2>&1 || {
    echo "❌ Please login to BTP CLI first:"
    echo "   btp login"
    exit 1
}

# Ensure we're in the correct CF space
echo "📋 Checking CF CLI target..."
cf target -o $ORG_NAME -s $SPACE_NAME

echo ""
echo "👥 Creating Role Collections for DMC Users..."

# ShiftBook Operators (read + write)
echo "Creating role collection: ShiftBook_Operators"
btp create security/role-collection "ShiftBook_Operators" \
    --subaccount $SUBACCOUNT_ID \
    --description "ShiftBook Operators - Read and Write access" || echo "Role collection may already exist"

# ShiftBook Supervisors (read + write + email)
echo "Creating role collection: ShiftBook_Supervisors"
btp create security/role-collection "ShiftBook_Supervisors" \
    --subaccount $SUBACCOUNT_ID \
    --description "ShiftBook Supervisors - Enhanced permissions with email" || echo "Role collection may already exist"

# ShiftBook Administrators (full access)
echo "Creating role collection: ShiftBook_Administrators"
btp create security/role-collection "ShiftBook_Administrators" \
    --subaccount $SUBACCOUNT_ID \
    --description "ShiftBook Administrators - Full access" || echo "Role collection may already exist"

echo ""
echo "✅ Role collections created successfully!"
echo ""
echo "⚠️  MANUAL STEPS REQUIRED in BTP Cockpit:"
echo "   Go to: Security → Role Collections"
echo ""
echo "   ShiftBook_Operators:"
echo "   - Add Role Template: ShiftOperator"
echo "   - Application: $XSAPPNAME"
echo ""
echo "   ShiftBook_Supervisors:"
echo "   - Add Role Template: ShiftSupervisor"
echo "   - Application: $XSAPPNAME"
echo ""
echo "   ShiftBook_Administrators:"
echo "   - Add Role Template: ShiftBookAdmin"
echo "   - Application: $XSAPPNAME"
echo ""
echo "📝 Role Mapping:"
echo "   DMC Role               → ShiftBook Role Collection"
echo "   DMC Plant Operator    → ShiftBook_Operators"
echo "   DMC Shift Supervisor  → ShiftBook_Supervisors"
echo "   DMC Plant Manager     → ShiftBook_Administrators"
echo ""
echo "🎯 Plant/WorkCenter granularity handled by DMC roles in DMC subaccount"

# List current role collections
echo ""
echo "📋 Current role collections:"
btp list security/role-collection --subaccount $SUBACCOUNT_ID | grep "ShiftBook" || echo "No ShiftBook role collections created yet"

echo ""
echo "🎯 Next: Set up trust configuration with DMC subaccount"