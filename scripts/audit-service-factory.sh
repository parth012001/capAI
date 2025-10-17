#!/bin/bash

# ServiceFactory Usage Audit Script
# Checks all authenticated routes for proper ServiceFactory usage
# Purpose: Prevent race conditions and user data leakage

echo "🔍 Auditing ServiceFactory usage in authenticated routes..."
echo ""

ISSUES_FOUND=0

# Find all routes with authMiddleware.authenticate
grep -n "authMiddleware\.authenticate" src/index.ts | cut -d: -f1 | while read lineNum; do
  # Get the next 20 lines after the route definition
  nextLines=$(sed -n "${lineNum},$((lineNum+20))p" src/index.ts)

  # Extract the route path for reporting
  routePath=$(echo "$nextLines" | head -1 | grep -o "'/[^']*'")

  # Check if ServiceFactory is used in those lines
  if ! echo "$nextLines" | grep -q "ServiceFactory.createFromRequest"; then
    # Skip routes that don't use stateful services (gmail, calendar, response)
    if echo "$nextLines" | grep -qE "GmailService|CalendarService|ResponseService|MeetingPipeline"; then
      echo "⚠️  Line $lineNum: Route $routePath missing ServiceFactory"
      echo "   Uses stateful services but doesn't create isolated container"
      echo ""
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
  fi
done

echo ""
echo "============================================"
if [ $ISSUES_FOUND -eq 0 ]; then
  echo "✅ Audit Complete: No issues found"
  echo "   All routes properly use ServiceFactory"
else
  echo "⚠️  Audit Complete: $ISSUES_FOUND potential issues found"
  echo "   Review routes above and add ServiceFactory usage"
  echo ""
  echo "Fix pattern:"
  echo "  const services = ServiceFactory.createFromRequest(req);"
  echo "  const gmail = await services.getGmailService();"
fi
echo "============================================"

exit $ISSUES_FOUND
