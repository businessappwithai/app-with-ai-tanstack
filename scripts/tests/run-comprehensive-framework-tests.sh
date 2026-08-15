#!/bin/bash

################################################################################
# Comprehensive Framework E2E Test Runner
#
# Tests the tanstackjs-nestjs stack against Playwright E2E suites.
#
# Usage:
#   ./scripts/tests/run-comprehensive-framework-tests.sh            # all
#   ./scripts/tests/run-comprehensive-framework-tests.sh --skip-build
#   ./scripts/tests/run-comprehensive-framework-tests.sh --keep-output
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration — script lives at scripts/tests/, so two levels up is project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="$PROJECT_ROOT/tests/test-results"
REPORT_FILE="$REPORT_DIR/comprehensive-test-report-$TIMESTAMP.md"

# Results tracking
declare -a TEST_RESULTS=()
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Parse command line arguments
SKIP_BUILD=false
KEEP_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)  SKIP_BUILD=true;   shift ;;
        --keep-output) KEEP_OUTPUT=true;  shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Create results directory
mkdir -p "$REPORT_DIR"

# Initialize report
echo "# Comprehensive E2E Test Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Date:** $(date)" >> "$REPORT_FILE"
echo "**Test Run ID:** $TIMESTAMP" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Build core packages
echo "=========================================="
echo "Building Packages"
echo "=========================================="
echo ""

if [ "$SKIP_BUILD" = false ]; then
    echo -e "${BLUE}[INFO]${NC} Building core and generator..."
    cd "$PROJECT_ROOT"
    bun run build:core > /tmp/build-core.log 2>&1 || {
        echo -e "${RED}[ERROR]${NC} Core build failed"
        cat /tmp/build-core.log
        exit 1
    }
    bun run build:generator > /tmp/build-generator.log 2>&1 || {
        echo -e "${RED}[ERROR]${NC} Generator build failed"
        cat /tmp/build-generator.log
        exit 1
    }
    echo -e "${GREEN}[SUCCESS]${NC} Packages built"
fi

# Run Playwright E2E tests
echo ""
echo "=========================================="
echo "Running E2E Tests"
echo "=========================================="
echo ""

cd "$PROJECT_ROOT"

E2E_SUITES=("tests/e2e")

for SUITE_DIR in "${E2E_SUITES[@]}"; do
    if [ ! -d "$PROJECT_ROOT/$SUITE_DIR" ]; then
        echo -e "${YELLOW}[WARNING]${NC} Test directory not found: $SUITE_DIR — skipping"
        continue
    fi

    TEST_NAME="$(basename "$SUITE_DIR")"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "${BLUE}[INFO]${NC} Running suite: $TEST_NAME"

    if bunx playwright test "$PROJECT_ROOT/$SUITE_DIR" --reporter=line > "/tmp/test-$TEST_NAME.log" 2>&1; then
        echo -e "${GREEN}[SUCCESS]${NC} $TEST_NAME passed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS+=("PASSED: $TEST_NAME")
        echo "- **$TEST_NAME**: PASSED" >> "$REPORT_FILE"
    else
        echo -e "${RED}[ERROR]${NC} $TEST_NAME failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("FAILED: $TEST_NAME")
        echo "- **$TEST_NAME**: FAILED" >> "$REPORT_FILE"
        if [ "$KEEP_OUTPUT" = false ]; then
            cat "/tmp/test-$TEST_NAME.log"
        fi
    fi
done

# Print Summary
echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "Total: $TOTAL_TESTS  Passed: $PASSED_TESTS  Failed: $FAILED_TESTS"
echo ""

for result in "${TEST_RESULTS[@]}"; do
    echo "  $result"
done

# Finalize report
{
    echo ""
    echo "## Summary"
    echo ""
    echo "- **Total:** $TOTAL_TESTS"
    echo "- **Passed:** $PASSED_TESTS"
    echo "- **Failed:** $FAILED_TESTS"
} >> "$REPORT_FILE"

echo ""
echo -e "${GREEN}[INFO]${NC} Report: $REPORT_FILE"

if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
fi
