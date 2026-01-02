#!/bin/bash

# OWASP ZAP Security Scan Script
# Runs baseline security scan against the running application

TARGET_URL="${1:-http://localhost:8000}"
REPORT_DIR="./security/reports"

mkdir -p $REPORT_DIR

echo "🔒 Starting OWASP ZAP security scan..."
echo "🎯 Target: $TARGET_URL"
echo ""

# Run ZAP baseline scan
docker run --rm \
  --network=host \
  -v $(pwd)/security:/zap/wrk/:rw \
  zaproxy/zap-stable zap-baseline.py \
  -t $TARGET_URL \
  -r $REPORT_DIR/zap-report.html \
  -J $REPORT_DIR/zap-report.json \
  -w $REPORT_DIR/zap-report.md \
  -a

SCAN_EXIT_CODE=$?

echo ""
if [ $SCAN_EXIT_CODE -eq 0 ]; then
  echo "✅ ZAP scan completed successfully"
  echo "📄 Reports generated in: $REPORT_DIR"
elif [ $SCAN_EXIT_CODE -eq 1 ]; then
  echo "⚠️  ZAP scan completed with warnings"
  echo "📄 Reports generated in: $REPORT_DIR"
else
  echo "❌ ZAP scan failed with exit code: $SCAN_EXIT_CODE"
fi

echo ""
echo "📊 View the HTML report:"
echo "   $REPORT_DIR/zap-report.html"
