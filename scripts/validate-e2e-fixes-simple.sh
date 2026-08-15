#!/bin/bash

###############################################################################
# Simple project-structure validation for ERDwithAI (TanStack Start edition)
###############################################################################

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# scripts/ is one level below project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0

check_dir() {
    local label="$1" path="$2"
    if [ -d "$path" ]; then
        echo -e "${GREEN}✓${NC} $label"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗${NC} $label  (expected: $path)"
        FAIL=$((FAIL + 1))
    fi
}

check_file() {
    local label="$1" path="$2"
    if [ -f "$path" ]; then
        echo -e "${GREEN}✓${NC} $label"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗${NC} $label  (expected: $path)"
        FAIL=$((FAIL + 1))
    fi
}

check_grep() {
    local label="$1" pattern="$2" file="$3"
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $label"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗${NC} $label"
        FAIL=$((FAIL + 1))
    fi
}

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}ERDwithAI Validation Report${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

echo -e "${BLUE}[1] Monorepo packages${NC}"
check_dir "packages/"               "$PROJECT_ROOT/packages"
check_dir "@erdwithai/core"         "$PROJECT_ROOT/packages/core"
check_dir "@erdwithai/generator"    "$PROJECT_ROOT/packages/generator"
check_dir "@erdwithai/ai"           "$PROJECT_ROOT/packages/ai"
check_dir "@erdwithai/web"          "$PROJECT_ROOT/packages/web"
echo ""

echo -e "${BLUE}[2] Web app (TanStack Start / Vite)${NC}"
check_file "vite.config.ts"             "$PROJECT_ROOT/packages/web/vite.config.ts"
check_file "routes/__root.tsx"          "$PROJECT_ROOT/packages/web/src/routes/__root.tsx"
check_file "routes/index.tsx"           "$PROJECT_ROOT/packages/web/src/routes/index.tsx"
check_file "routes/dashboard.tsx"       "$PROJECT_ROOT/packages/web/src/routes/dashboard.tsx"
check_dir  "routes/api/"               "$PROJECT_ROOT/packages/web/src/routes/api"
check_dir  "routes/projects/"          "$PROJECT_ROOT/packages/web/src/routes/projects"
echo ""

echo -e "${BLUE}[3] Generator templates (tanstackjs-nestjs)${NC}"
check_dir "templates/"                  "$PROJECT_ROOT/packages/generator/templates"
check_dir "tanstack-start-nestjs/"      "$PROJECT_ROOT/packages/generator/templates/tanstack-start-nestjs"
check_file "mermaid.parser.ts"          "$PROJECT_ROOT/packages/generator/src/parsers/mermaid.parser.ts"
echo ""

echo -e "${BLUE}[4] AI config${NC}"
check_file "packages/ai/src/config.ts"  "$PROJECT_ROOT/packages/ai/src/config.ts"
check_file ".env"                       "$PROJECT_ROOT/.env"
check_grep ".env uses mlx-community model" "mlx-community" "$PROJECT_ROOT/.env"
echo ""

echo -e "${BLUE}[5] E2E / Playwright${NC}"
check_file "playwright.config.ts"       "$PROJECT_ROOT/playwright.config.ts"
check_dir  "tests/e2e/"                "$PROJECT_ROOT/tests/e2e"
echo ""

echo -e "${BLUE}[6] Root package.json scripts${NC}"
check_grep "dev script"             '"dev"'              "$PROJECT_ROOT/package.json"
check_grep "dev:mastra script"      '"dev:mastra"'       "$PROJECT_ROOT/package.json"
check_grep "generate:tanstack"      '"generate:tanstack"' "$PROJECT_ROOT/package.json"
check_grep "test:playwright"        '"test:playwright"'  "$PROJECT_ROOT/package.json"
check_grep "seed:admin"             '"seed:admin"'       "$PROJECT_ROOT/package.json"
echo ""

echo -e "${BLUE}======================================${NC}"
echo -e "VALIDATION COMPLETE — $(date)"
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}Passed: $PASS${NC}   ${RED}Failed: $FAIL${NC}"
echo ""

[ $FAIL -eq 0 ]
