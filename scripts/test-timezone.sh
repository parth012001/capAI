#!/bin/bash

# ===================================================================
# TIMEZONE TESTING SCRIPT
# Runs comprehensive tests to verify timezone implementation
# ===================================================================

echo "🧪 ================================================"
echo "🧪  TIMEZONE IMPLEMENTATION TEST RUNNER"
echo "🧪 ================================================"
echo ""

# Check if TypeScript is compiled
echo "📦 Step 1: Compiling TypeScript..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed"
    echo "Please fix TypeScript errors before running tests"
    exit 1
fi
echo "✅ TypeScript compilation successful"
echo ""

# Run unit tests
echo "🧪 Step 2: Running Unit Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx tsx tests/timezone-test-suite.ts
UNIT_TEST_RESULT=$?
echo ""

# Run integration tests
echo "🧪 Step 3: Running Integration Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx tsx tests/timezone-integration-test.ts
INTEGRATION_TEST_RESULT=$?
echo ""

# Summary
echo "📊 ================================================"
echo "📊  FINAL TEST SUMMARY"
echo "📊 ================================================"
echo ""

if [ $UNIT_TEST_RESULT -eq 0 ] && [ $INTEGRATION_TEST_RESULT -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED! 🚀"
    echo ""
    echo "✅ Unit Tests: PASSED"
    echo "✅ Integration Tests: PASSED"
    echo ""
    echo "Your timezone implementation is production-ready!"
    echo ""
    echo "Next steps:"
    echo "  1. Review manual test guide: tests/MANUAL_TEST_GUIDE.md"
    echo "  2. Test with real Google account if desired"
    echo "  3. Deploy to Railway: git push origin main"
    echo ""
    exit 0
else
    echo "❌ SOME TESTS FAILED"
    echo ""
    if [ $UNIT_TEST_RESULT -ne 0 ]; then
        echo "❌ Unit Tests: FAILED"
    else
        echo "✅ Unit Tests: PASSED"
    fi

    if [ $INTEGRATION_TEST_RESULT -ne 0 ]; then
        echo "❌ Integration Tests: FAILED"
    else
        echo "✅ Integration Tests: PASSED"
    fi
    echo ""
    echo "Please review the failures above before deploying."
    echo ""
    exit 1
fi
