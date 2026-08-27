#!/bin/bash

################################################################################
# Quick E2E Test Script
#
# Generates a minimal TanStack Start + NestJS app from a test ERD, installs
# dependencies, runs the backend + frontend, then runs the Playwright suite.
# Use this for rapid iteration during development.
#
# Usage: ./scripts/tests/quick-test.sh
################################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_OUTPUT_DIR="$PROJECT_ROOT/test-output/quick-test"
LOG_DIR="$PROJECT_ROOT/test-results/quick-test"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()         { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
log_error()   { echo -e "${RED}[$(date +'%H:%M:%S')]${NC} $1"; }

cleanup() {
    log "Cleaning up..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    lsof -ti:4001 | xargs kill -9 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Setup
log "Setting up quick test..."
mkdir -p "$LOG_DIR"
mkdir -p "$PROJECT_ROOT/test-data"

# Create test ERD if missing
if [ ! -f "$PROJECT_ROOT/test-data/hospital-erd.mermaid" ]; then
    cat > "$PROJECT_ROOT/test-data/hospital-erd.mermaid" << 'EOF'
erDiagram
    PATIENT {
        string id PK
        string name
        string email UK
        created_at timestamp
    }
    DOCTOR {
        string id PK
        string name
        string email UK
        created_at timestamp
    }
    APPOINTMENT {
        string id PK
        string patient_id FK
        string doctor_id FK
        datetime scheduled_at
    }
    PATIENT ||--o{ APPOINTMENT : "has"
    DOCTOR ||--o{ APPOINTMENT : "conducts"
EOF
fi

# Build packages
log "Building generator..."
cd "$PROJECT_ROOT"
bun run build:core  > "$LOG_DIR/build-core.log"  2>&1
bun run build:generator > "$LOG_DIR/build-generator.log" 2>&1
log_success "Packages built"

# Generate app
log "Generating TanStack Start + NestJS test app..."
rm -rf "$TEST_OUTPUT_DIR"
bun --filter @appwithai/generator generate -- \
    -i "$PROJECT_ROOT/test-data/hospital-erd.mermaid" \
    -o "$TEST_OUTPUT_DIR" \
    -n "quick-test" \
    -s tanstackjs-nestjs \
    > "$LOG_DIR/generate.log" 2>&1 || {
    log_error "Generation failed"
    cat "$LOG_DIR/generate.log"
    exit 1
}
log_success "App generated"

# Backend setup
log "Setting up backend..."
cd "$TEST_OUTPUT_DIR/backend"
bun install > /dev/null 2>&1
[ -f .env.example ] && cp .env.example .env
bun run migrate > "$LOG_DIR/migrate.log" 2>&1 || true
bun run seed    > "$LOG_DIR/seed.log"    2>&1 || true
log_success "Backend ready"

# Start backend
log "Starting backend..."
bun run start:dev > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
sleep 10

# Start frontend
log "Starting frontend..."
cd "$TEST_OUTPUT_DIR/frontend"
bun install > /dev/null 2>&1
bun run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
sleep 15

log_success "Servers running (backend: $BACKEND_PID, frontend: $FRONTEND_PID)"

# Run E2E tests if playwright config exists
if [ -f playwright.config.ts ] || [ -f playwright.config.js ]; then
    log "Running Playwright tests..."
    FRONTEND_URL=http://localhost:3001 \
    bunx playwright test > "$LOG_DIR/e2e.log" 2>&1
    TEST_RESULT=$?
else
    log "No Playwright config found — running basic health check..."
    if curl -sf http://localhost:3001 > /dev/null; then
        log_success "Frontend health check passed"
        TEST_RESULT=0
    else
        log_error "Frontend health check failed"
        TEST_RESULT=1
    fi
fi

if [ $TEST_RESULT -eq 0 ]; then
    log_success "ALL TESTS PASSED"
else
    log_error "TESTS FAILED — see $LOG_DIR/e2e.log"
fi

exit $TEST_RESULT
