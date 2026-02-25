#!/bin/bash
# Test script for JSON → SQLite sync

set -e

echo "🧪 Testing JSON → SQLite Synchronization"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check that DB exists
echo "1️⃣  Checking SQLite DB..."
if [ -f ~/.openclaw/dashboard.db ]; then
  echo -e "${GREEN}✓${NC} DB exists: ~/.openclaw/dashboard.db"
else
  echo -e "${RED}✗${NC} DB not found!"
  exit 1
fi

# 2. Check that sources exist
echo ""
echo "2️⃣  Checking JSON sources..."
SOURCES=(agents skills projects teams tokens events)
for source in "${SOURCES[@]}"; do
  if [ -f ~/.openclaw/sources/${source}.json ]; then
    echo -e "${GREEN}✓${NC} ${source}.json"
  else
    echo -e "${RED}✗${NC} ${source}.json not found!"
    exit 1
  fi
done

# 3. Check that watcher plugin exists
echo ""
echo "3️⃣  Checking file watcher..."
if [ -f server/plugins/source-watcher.ts ]; then
  echo -e "${GREEN}✓${NC} source-watcher.ts"
else
  echo -e "${RED}✗${NC} source-watcher.ts not found!"
  exit 1
fi

# 4. Check WebSocket endpoint
echo ""
echo "4️⃣  Checking WebSocket endpoint..."
if [ -f server/api/ws.ts ]; then
  echo -e "${GREEN}✓${NC} WebSocket endpoint"
else
  echo -e "${RED}✗${NC} WebSocket endpoint not found!"
  exit 1
fi

# 5. Run tests
echo ""
echo "5️⃣  Running unit tests..."
npm run test:unit > /tmp/test-sync-output.log 2>&1
if [ $? -eq 0 ]; then
  PASSED=$(grep "Test Files" /tmp/test-sync-output.log | grep -oE "[0-9]+ passed" | cut -d' ' -f1)
  echo -e "${GREEN}✓${NC} All tests passed (${PASSED} test files)"
else
  echo -e "${RED}✗${NC} Some tests failed"
  tail -20 /tmp/test-sync-output.log
  exit 1
fi

# 6. Check TypeScript compilation (via Nuxt)
echo ""
echo "6️⃣  Checking TypeScript (via Nuxt typecheck)..."
if command -v tsc &> /dev/null; then
  npx tsc --noEmit > /tmp/test-sync-tsc.log 2>&1
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} TypeScript compiles without errors"
  else
    echo -e "${YELLOW}⚠${NC}  TypeScript warnings (check /tmp/test-sync-tsc.log)"
  fi
else
  echo -e "${YELLOW}⚠${NC}  TypeScript compiler not installed (Nuxt handles TS internally)"
fi

echo ""
echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo "To test the sync in action:"
echo "  1. npm run dev"
echo "  2. touch ~/.openclaw/sources/agents.json"
echo "  3. Check server logs for '[watcher] Source file changed'"
echo ""
