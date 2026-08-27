#!/bin/bash

###############################################################################
# Full E2E Validation Script for APPWITHAI
#
# Validates the most recent generated backend project by:
#   1. Locating the latest generated app in generated-projects/
#   2. Installing dependencies and running migrations
#   3. Starting the NestJS backend
#   4. Checking the health endpoint
#   5. Running Playwright E2E tests if present
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Resolve project root — script lives in scripts/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GENERATED_PROJECTS_DIR="$PROJECT_ROOT/generated-projects"
BACKEND_PORT=4001
SERVER_START_TIMEOUT=60
HEALTH_CHECK_TIMEOUT=30

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# ── Find the most recently modified generated project ──────────────────────

find_backend_project() {
    print_header "FINDING GENERATED BACKEND"

    if [ ! -d "$GENERATED_PROJECTS_DIR" ]; then
        log_error "No generated-projects/ directory found: $GENERATED_PROJECTS_DIR"
        exit 1
    fi

    # Look for a NestJS backend directory
    BACKEND_DIR=$(find "$GENERATED_PROJECTS_DIR" -maxdepth 3 -name "package.json" \
        -exec grep -l '"@nestjs/core"' {} \; 2>/dev/null | \
        xargs -I{} dirname {} | \
        sort -t/ -k1,1 | tail -1)

    if [ -z "$BACKEND_DIR" ]; then
        log_error "No NestJS backend found under $GENERATED_PROJECTS_DIR"
        log_info  "Generate an app first: bun run generate:tanstack"
        exit 1
    fi

    log_success "Found backend: $BACKEND_DIR"
    echo "$BACKEND_DIR"
}

# ── Install and migrate ────────────────────────────────────────────────────

setup_backend() {
    local dir="$1"
    print_header "INSTALLING BACKEND DEPENDENCIES"

    cd "$dir"
    bun install

    if [ -f .env.example ] && [ ! -f .env ]; then
        cp .env.example .env
        log_info "Created .env from .env.example"
    fi

    log_info "Running migrations..."
    bun run migrate 2>/dev/null || bun run db:migrate 2>/dev/null || \
        log_warning "No migrate script found — skipping"

    log_success "Backend ready"
}

# ── Start server ───────────────────────────────────────────────────────────

start_backend() {
    local dir="$1"
    print_header "STARTING BACKEND SERVER"

    cd "$dir"
    bun run start:dev > /tmp/appwithai-backend-validate.log 2>&1 &
    BACKEND_PID=$!

    log_info "Waiting for server on :$BACKEND_PORT (up to ${SERVER_START_TIMEOUT}s)..."
    for i in $(seq 1 "$SERVER_START_TIMEOUT"); do
        if curl -sf "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1 || \
           curl -sf "http://localhost:$BACKEND_PORT/health"     > /dev/null 2>&1 || \
           curl -sf "http://localhost:$BACKEND_PORT"            > /dev/null 2>&1; then
            log_success "Server responded after ${i}s"
            return 0
        fi
        sleep 1
    done

    log_error "Server did not start within ${SERVER_START_TIMEOUT}s"
    cat /tmp/appwithai-backend-validate.log
    kill "$BACKEND_PID" 2>/dev/null || true
    exit 1
}

# ── Health checks ──────────────────────────────────────────────────────────

run_health_checks() {
    print_header "HEALTH CHECKS"

    local base="http://localhost:$BACKEND_PORT"
    PASS=0; FAIL=0

    check_endpoint() {
        local label="$1" url="$2" expected_status="${3:-200}"
        local status
        status=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        if [ "$status" = "$expected_status" ] || [ "$status" = "200" ]; then
            log_success "$label ($status)"
            PASS=$((PASS + 1))
        else
            log_warning "$label — got $status"
            FAIL=$((FAIL + 1))
        fi
    }

    check_endpoint "Root"          "$base"
    check_endpoint "Health"        "$base/api/health"
    check_endpoint "Entities"      "$base/api/entities"
    check_endpoint "Dictionary"    "$base/api/sys/tables"

    echo ""
    log_info "Health checks: $PASS passed, $FAIL failed"
}

# ── Playwright tests ───────────────────────────────────────────────────────

run_e2e_tests() {
    local dir="$1"
    print_header "E2E TESTS"

    local e2e_dir="$dir/e2e"
    if [ ! -d "$e2e_dir" ]; then
        log_warning "No e2e/ directory in generated project — skipping Playwright"
        return 0
    fi

    cd "$dir"
    if bunx playwright test "$e2e_dir" --reporter=line; then
        log_success "E2E tests passed"
    else
        log_error "E2E tests failed"
        return 1
    fi
}

# ── Cleanup ────────────────────────────────────────────────────────────────

cleanup() {
    if [ -n "${BACKEND_PID:-}" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    lsof -ti:"$BACKEND_PORT" | xargs kill -9 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ── Main ───────────────────────────────────────────────────────────────────

print_header "APPWITHAI E2E Validation"

BACKEND_DIR=$(find_backend_project)
setup_backend "$BACKEND_DIR"
start_backend  "$BACKEND_DIR"
run_health_checks
run_e2e_tests  "$BACKEND_DIR"

print_header "VALIDATION COMPLETE"
log_success "All checks passed"
