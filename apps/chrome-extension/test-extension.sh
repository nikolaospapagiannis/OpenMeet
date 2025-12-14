#!/bin/bash

echo "=== CHROME EXTENSION FINAL VALIDATION ==="
echo ""

# Check manifest
echo "1. Checking manifest.json..."
if node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))" 2>/dev/null; then
  echo "   ✅ Valid JSON"
  TYPE=$(node -e "const m=JSON.parse(require('fs').readFileSync('manifest.json','utf8'));console.log(m.background.type||'NOT SET')")
  echo "   ✅ type: $TYPE"
else
  echo "   ❌ INVALID JSON"
  exit 1
fi

# Check JavaScript files
echo ""
echo "2. Checking JavaScript syntax..."
for file in background.js popup.js utils/logger.js scripts/inject.js; do
  if node --check "$file" 2>/dev/null; then
    echo "   ✅ $file"
  else
    echo "   ❌ $file HAS ERRORS"
    node --check "$file"
    exit 1
  fi
done

# Check required files
echo ""
echo "3. Checking required files..."
MISSING=0
for file in manifest.json background.js popup.html popup.js \
            utils/logger.js styles/overlay.css scripts/inject.js \
            icons/icon-16.png icons/icon-32.png icons/icon-48.png icons/icon-128.png \
            content-scripts/google-meet.js content-scripts/zoom.js content-scripts/teams.js; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ MISSING: $file"
    MISSING=1
  fi
done

if [ $MISSING -eq 1 ]; then
  exit 1
fi

echo ""
echo "========================================="
echo "✅ ALL CHECKS PASSED"
echo "✅ EXTENSION IS READY TO LOAD IN CHROME"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Open chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked'"
echo "4. Select this folder: $(pwd)"
echo ""
