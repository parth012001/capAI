#!/bin/bash

# ===================================================================
# Apply Timezone Migration to Neon Production Database
# ===================================================================

echo "🌍 ================================================"
echo "🌍  TIMEZONE MIGRATION - NEON PRODUCTION DATABASE"
echo "🌍 ================================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo ""
    echo "To run this script, first set your Neon database connection string:"
    echo "export DATABASE_URL='postgresql://user:pass@host/dbname?sslmode=require'"
    echo ""
    exit 1
fi

echo "📊 Database connection string found"
echo "🔗 Connecting to Neon database..."
echo ""

# Apply the timezone migration
echo "🚀 Applying timezone support migration..."
echo ""

psql "$DATABASE_URL" -f scripts/database/add_timezone_support.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ================================================"
    echo "✅  TIMEZONE MIGRATION COMPLETED SUCCESSFULLY!"
    echo "✅ ================================================"
    echo ""
    echo "📊 Migration Summary:"
    echo "  ✓ Added timezone column to user_gmail_tokens"
    echo "  ✓ Added timezone columns to calendar_events and meeting_requests"
    echo "  ✓ Created timezone_change_log audit table"
    echo "  ✓ Created performance indexes"
    echo "  ✓ Added timezone validation constraints"
    echo ""
    echo "🚀 Next Steps:"
    echo "  1. Deploy updated code to Railway"
    echo "  2. Test with users in different timezones"
    echo "  3. Monitor timezone_change_log table for audit"
    echo ""
else
    echo ""
    echo "❌ ================================================"
    echo "❌  TIMEZONE MIGRATION FAILED"
    echo "❌ ================================================"
    echo ""
    echo "Please check the error messages above and try again."
    echo ""
    exit 1
fi
