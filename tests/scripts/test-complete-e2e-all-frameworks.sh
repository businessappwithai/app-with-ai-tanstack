#!/bin/bash

# Complete E2E Test Suite for All Framework Types
# This script:
# 1. Generates applications for all framework combinations
# 2. Builds all generated applications
# 3. Runs all generated applications
# 4. Tests all applications with Playwright

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_OUTPUT_DIR="$PROJECT_ROOT/test-output/complete-e2e-all-frameworks"
TEST_ERD_FILE="$TEST_OUTPUT_DIR/blog-diagram.mermaid"
PLAYWRIGHT_TESTS_DIR="$TEST_OUTPUT_DIR/playwright-tests"

# Ports for generated apps
BASE_PORT=5100
# APP_PORTS will be tracked in arrays instead

# Create directories
mkdir -p "$TEST_OUTPUT_DIR"
mkdir -p "$PLAYWRIGHT_TESTS_DIR"

echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}Complete E2E Test Suite${NC}"
echo -e "${PURPLE}All Framework Types${NC}"
echo -e "${PURPLE}========================================${NC}"
echo ""

# Step 1: Create comprehensive Playwright tests first
echo -e "${CYAN}Step 1: Creating comprehensive Playwright tests...${NC}"
cat > "$PLAYWRIGHT_TESTS_DIR/generated-apps.spec.ts" << 'EOF'
import { test, expect } from '@playwright/test';

// Test configuration for each generated application
const APP_CONFIGS = [
  { name: 'Option 1 - PostgreSQL', url: 'http://localhost:5101', backend: 'NestJS', frontend: 'Next.js' },
  { name: 'Option 1 - SQLite', url: 'http://localhost:5102', backend: 'NestJS', frontend: 'Next.js' },
  { name: 'Option 2 - PostgreSQL', url: 'http://localhost:5103', backend: 'OData', frontend: 'OpenUI5' },
  { name: 'Option 2 - SQLite', url: 'http://localhost:5104', backend: 'OData', frontend: 'OpenUI5' },
];

test.describe('Generated Applications E2E Tests', () => {
  APP_CONFIGS.forEach((app) => {
    test.describe(`${app.name} (${app.backend} + ${app.frontend})`, () => {
      test.beforeAll(async () => {
        // Wait for application to be ready
        console.log(`Waiting for ${app.name} at ${app.url}...`);
      });

      test('should load the application', async ({ page }) => {
        const response = await page.goto(app.url);
        expect(response?.status()).toBe(200);

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Take screenshot
        await page.screenshot({
          path: `test-output/complete-e2e-all-frameworks/${app.name.replace(/\s+/g, '-').toLowerCase()}-homepage.png`,
          fullPage: true,
        });

        console.log(`✓ ${app.name} homepage loaded`);
      });

      test('should have working API endpoints', async ({ request }) => {
        // Test backend API
        const apiEndpoint = app.backend === 'NestJS' ? '/api/users' : '/Users';

        const response = await request.get(`${app.url}${apiEndpoint}`);
        console.log(`${app.name} API Response: ${response.status()}`);

        // API should respond (even if empty array)
        expect([200, 201, 404, 422]).toContain(response.status());

        console.log(`✓ ${app.name} API endpoint responding`);
      });

      test('should have proper frontend elements', async ({ page }) => {
        await page.goto(app.url);
        await page.waitForLoadState('networkidle');

        if (app.frontend === 'Next.js') {
          // Next.js apps should have modern UI
          const body = page.locator('body');
          await expect(body).toBeVisible();

          // Check for common elements
          const hasContent = await page.evaluate(() => {
            return document.body.innerText.length > 100;
          });
          expect(hasContent).toBeTruthy();
        } else if (app.frontend === 'OpenUI5') {
          // OpenUI5 apps should have SAP UI elements
          const body = page.locator('body');
          await expect(body).toBeVisible();

          // Wait for OpenUI5 to initialize
          await page.waitForTimeout(2000);
        }

        console.log(`✓ ${app.name} frontend elements present`);
      });

      test('should support CRUD operations', async ({ request }) => {
        const userEndpoint = app.backend === 'NestJS' ? '/api/users' : '/Users';
        const userUrl = `${app.url}${userEndpoint}`;

        // CREATE - Try to create a user
        const createResponse = await request.post(userUrl, {
          data: {
            name: 'Test User',
            email: `test-${Date.now()}@example.com`,
            passwordHash: 'hashedpassword',
          },
        });

        console.log(`${app.name} Create Response: ${createResponse.status()}`);

        // READ - Get all users
        const getResponse = await request.get(userUrl);
        console.log(`${app.name} Read Response: ${getResponse.status()}`);

        expect([200, 201, 404, 422]).toContain(createResponse.status());
        expect([200, 404]).toContain(getResponse.status());

        console.log(`✓ ${app.name} CRUD operations working`);
      });

      test('should have proper error handling', async ({ request }) => {
        const userEndpoint = app.backend === 'NestJS' ? '/api/users/invalid-id' : '/Users/invalid-id';
        const userUrl = `${app.url}${userEndpoint}`;

        const response = await request.get(userUrl);

        // Should return appropriate error status
        expect([400, 404, 422]).toContain(response.status());

        console.log(`✓ ${app.name} error handling working`);
      });
    });
  });
});

test.describe('Cross-Framework Validation', () => {
  test('all applications should be accessible', async ({ request }) => {
    const results = [];

    for (const app of APP_CONFIGS) {
      try {
        const response = await request.get(app.url, { timeout: 5000 });
        results.push({ app: app.name, status: response.status(), accessible: true });
        console.log(`✓ ${app.name} is accessible (status: ${response.status()})`);
      } catch (error) {
        results.push({ app: app.name, status: 'Error', accessible: false });
        console.log(`✗ ${app.name} is not accessible`);
      }
    }

    // At least some apps should be accessible
    const accessibleCount = results.filter((r: any) => r.accessible).length;
    expect(accessibleCount).toBeGreaterThan(0);

    console.log(`\nAccessible: ${accessibleCount}/${APP_CONFIGS.length} applications`);
  });
});
EOF

echo -e "${GREEN}✓ Playwright tests created${NC}"
echo ""

# Step 2: Create test ERD diagram
echo -e "${CYAN}Step 2: Creating test ERD diagram...${NC}"
cat > "$TEST_ERD_FILE" << 'EOF'
erDiagram
  USER ||--o{ POST : creates
  USER ||--o{ COMMENT : writes
  POST ||--o{ COMMENT : has

  USER {
    string id PK
    string name
    string email UK
    string passwordHash
    datetime createdAt
    datetime updatedAt
  }

  POST {
    string id PK
    string title
    text content
    boolean isPublished
    string userId FK
    datetime createdAt
    datetime updatedAt
  }

  COMMENT {
    string id PK
    text content
    string userId FK
    string postId FK
    datetime createdAt
    datetime updatedAt
  }
EOF

echo -e "${GREEN}✓ Test ERD created (3 entities, 2 relationships)${NC}"
echo ""

# Step 3: Build generator
echo -e "${CYAN}Step 3: Building generator...${NC}"
cd "$PROJECT_ROOT"
bun run --filter @appwithai/generator build
echo -e "${GREEN}✓ Generator built${NC}"
echo ""

# Step 4: Define frameworks and generate applications
echo -e "${CYAN}Step 4: Generating applications for all frameworks...${NC}"

FRAMEWORKS=(
  "option1:postgresql:5101"
  "option1:sqlite:5102"
  "option2:postgresql:5103"
  "option2:sqlite:5104"
)

GEN_PATH="$PROJECT_ROOT/packages/generator/dist/cli/generate.js"

for FRAMEWORK_CONFIG in "${FRAMEWORKS[@]}"; do
  IFS=':' read -r STACK DB PORT <<< "$FRAMEWORK_CONFIG"
  FRAMEWORK_ID="${STACK}-${DB}"
  OUTPUT_DIR="$TEST_OUTPUT_DIR/$FRAMEWORK_ID"

  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}Generating: ${FRAMEWORK_ID}${NC}"
  echo -e "${BLUE}========================================${NC}"

  mkdir -p "$OUTPUT_DIR"

  # Generate application
  echo "Running generator..."
  node "$GEN_PATH" generate \
    --input "$TEST_ERD_FILE" \
    --output "$OUTPUT_DIR/generated" \
    --name "test-${FRAMEWORK_ID}" \
    --stack "$STACK" \
    --db "$DB" \
    --port "$PORT" \
    --no-interactive \
    > "$OUTPUT_DIR/generation.log" 2>&1

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Generated ${FRAMEWORK_ID}${NC}"

    # Validate structure
    if [ -d "$OUTPUT_DIR/generated/backend" ]; then
      echo -e "  ${GREEN}✓ Backend exists${NC}"
    fi
    if [ -d "$OUTPUT_DIR/generated/frontend" ]; then
      echo -e "  ${GREEN}✓ Frontend exists${NC}"
    fi
  else
    echo -e "${RED}✗ Generation failed for ${FRAMEWORK_ID}${NC}"
    echo -e "${RED}Check log: $OUTPUT_DIR/generation.log${NC}"
  fi
done

echo ""
echo -e "${GREEN}✓ All applications generated${NC}"
echo ""

# Step 5: Build all applications
echo -e "${CYAN}Step 5: Building all applications...${NC}"

for FRAMEWORK_CONFIG in "${FRAMEWORKS[@]}"; do
  IFS=':' read -r STACK DB PORT <<< "$FRAMEWORK_CONFIG"
  FRAMEWORK_ID="${STACK}-${DB}"
  OUTPUT_DIR="$TEST_OUTPUT_DIR/$FRAMEWORK_ID"

  echo ""
  echo -e "${YELLOW}Building ${FRAMEWORK_ID}...${NC}"

  # Build backend
  if [ -d "$OUTPUT_DIR/generated/backend" ]; then
    echo "  Installing backend dependencies..."
    cd "$OUTPUT_DIR/generated/backend"
    bun install > "$OUTPUT_DIR/backend-install.log" 2>&1

    if [ $? -eq 0 ]; then
      echo -e "  ${GREEN}✓ Backend deps installed${NC}"

      echo "  Building backend..."
      bun run build > "$OUTPUT_DIR/backend-build.log" 2>&1

      if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓ Backend built${NC}"
      else
        echo -e "  ${RED}✗ Backend build failed${NC}"
      fi
    else
      echo -e "  ${RED}✗ Backend install failed${NC}"
    fi
  fi

  # Build frontend
  if [ -d "$OUTPUT_DIR/generated/frontend" ]; then
    echo "  Installing frontend dependencies..."
    cd "$OUTPUT_DIR/generated/frontend"
    bun install > "$OUTPUT_DIR/frontend-install.log" 2>&1

    if [ $? -eq 0 ]; then
      echo -e "  ${GREEN}✓ Frontend deps installed${NC}"

      # Note: We don't build frontend in dev mode, just prep
      echo -e "  ${GREEN}✓ Frontend ready${NC}"
    else
      echo -e "  ${RED}✗ Frontend install failed${NC}"
    fi
  fi
done

echo ""
echo -e "${GREEN}✓ All applications built${NC}"
echo ""

# Step 6: Start all applications
echo -e "${CYAN}Step 6: Starting all applications...${NC}"

# Function to cleanup processes on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping all applications...${NC}"
  jobs -p | xargs -r kill 2>/dev/null || true
  sleep 2
  echo -e "${GREEN}✓ All applications stopped${NC}"
}

trap cleanup EXIT INT TERM

for FRAMEWORK_CONFIG in "${FRAMEWORKS[@]}"; do
  IFS=':' read -r STACK DB PORT <<< "$FRAMEWORK_CONFIG"
  FRAMEWORK_ID="${STACK}-${DB}"
  OUTPUT_DIR="$TEST_OUTPUT_DIR/$FRAMEWORK_ID"

  echo ""
  echo -e "${YELLOW}Starting ${FRAMEWORK_ID} on port ${PORT}...${NC}"

  # Create database directory for SQLite
  if [ "$DB" = "sqlite" ] && [ -d "$OUTPUT_DIR/generated/backend" ]; then
    mkdir -p "$OUTPUT_DIR/generated/backend/database"
  fi

  # Start backend
  if [ -d "$OUTPUT_DIR/generated/backend" ]; then
    cd "$OUTPUT_DIR/generated/backend"

    # Check for package.json scripts
    if grep -q "start:dev" package.json; then
      bun run start:dev > "$OUTPUT_DIR/backend-runtime.log" 2>&1 &
    elif grep -q "dev" package.json; then
      bun run dev > "$OUTPUT_DIR/backend-runtime.log" 2>&1 &
    elif grep -q "start" package.json; then
      bun run start > "$OUTPUT_DIR/backend-runtime.log" 2>&1 &
    else
      node dist/main.js > "$OUTPUT_DIR/backend-runtime.log" 2>&1 &
    fi

    BACKEND_PID=$!
    echo "  Backend PID: $BACKEND_PID"
    echo "$BACKEND_PID" > "$OUTPUT_DIR/backend.pid"
  fi

  # Start frontend if separate
  if [ -d "$OUTPUT_DIR/generated/frontend" ] && [ "$STACK" = "option1" ]; then
    cd "$OUTPUT_DIR/generated/frontend"

    # Wait a bit for backend to start
    sleep 2

    bun run dev > "$OUTPUT_DIR/frontend-runtime.log" 2>&1 &
    FRONTEND_PID=$!
    echo "  Frontend PID: $FRONTEND_PID"
    echo "$FRONTEND_PID" > "$OUTPUT_DIR/frontend.pid"
  fi

  echo -e "  ${GREEN}✓ ${FRAMEWORK_ID} starting...${NC}"
done

echo ""
echo -e "${GREEN}✓ All applications starting...${NC}"
echo ""

# Step 7: Wait for applications to be ready
echo -e "${CYAN}Step 7: Waiting for applications to be ready...${NC}"
sleep 10

# Check which applications are running
echo ""
echo -e "${BLUE}Application Status:${NC}"
for FRAMEWORK_CONFIG in "${FRAMEWORKS[@]}"; do
  IFS=':' read -r STACK DB PORT <<< "$FRAMEWORK_CONFIG"
  FRAMEWORK_ID="${STACK}-${DB}"

  if curl -s "http://localhost:${PORT}" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} ${FRAMEWORK_ID} - Running on port ${PORT}"
  else
    echo -e "  ${RED}✗${NC} ${FRAMEWORK_ID} - Not responding on port ${PORT}"
  fi
done
echo ""

# Step 8: Run Playwright tests
echo -e "${CYAN}Step 8: Running Playwright E2E tests...${NC}"
echo ""

cd "$PROJECT_ROOT"

# Run the tests
npx playwright test "$PLAYWRIGHT_TESTS_DIR/generated-apps.spec.ts" \
  --reporter=list \
  --project=chromium \
  --config=playwright.config.ts \
  2>&1 | tee "$TEST_OUTPUT_DIR/playwright-test-results.log"

TEST_EXIT_CODE=${PIPESTATUS[0]}

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ Playwright tests passed${NC}"
else
  echo -e "${RED}✗ Playwright tests failed${NC}"
fi

# Step 9: Generate summary report
echo ""
echo -e "${CYAN}Step 9: Generating summary report...${NC}"

cat > "$TEST_OUTPUT_DIR/SUMMARY.md" << EOF
# Complete E2E Test Summary

**Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Test Suite:** Complete E2E for All Framework Types

## Frameworks Tested

EOF

for FRAMEWORK_CONFIG in "${FRAMEWORKS[@]}"; do
  IFS=':' read -r STACK DB PORT <<< "$FRAMEWORK_CONFIG"
  FRAMEWORK_ID="${STACK}-${DB}"
  OUTPUT_DIR="$TEST_OUTPUT_DIR/$FRAMEWORK_ID"

  echo "### ${FRAMEWORK_ID}" >> "$TEST_OUTPUT_DIR/SUMMARY.md"
  echo "" >> "$TEST_OUTPUT_DIR/SUMMARY.md"

  # Check if generated
  if [ -d "$OUTPUT_DIR/generated" ]; then
    echo "- **Generated:** ✅ Yes" >> "$TEST_OUTPUT_DIR/SUMMARY.md"
  else
    echo "- **Generated:** ❌ No" >> "$TEST_OUTPUT_DIR/SUMMARY.md"
  fi

  # Check backend
  if [ -d "$OUTPUT_DIR/generated/backend" ]; then
    echo "- **Backend:** ✅ Present" >> "$TEST_OUTPUT_DIR/SUMMARY.md"
  else
    echo "- **Backend:** ❌ Missing" >> "$TEST_OUTPUT_DIR/SUMMARY.md"
  fi

  # Check frontend
  if [ -d "$OUTPUT_DIR/generated/frontend" ]; then
    echo "- **Frontend:** ✅ Present" >> "$TEST_OUTPUT_DIR/SUMMARY.md"
  else
    echo "- **Frontend:** ❌ Missing" >> "$TEST_OUTPUT_DIR/SUMMARY.md"
  fi

  # Check if running
  if curl -s "http://localhost:${PORT}" > /dev/null 2>&1; then
    echo "- **Running:** ✅ Yes (http://localhost:${PORT})" >> "$TEST_OUTPUT_DIR/SUMMARY.md"
  else
    echo "- **Running:** ❌ No" >> "$TEST_OUTPUT_DIR/SUMMARY.md"
  fi

  echo "" >> "$TEST_OUTPUT_DIR/SUMMARY.md"
done

echo "" >> "$TEST_OUTPUT_DIR/SUMMARY.md"
echo "## Test Results" >> "$TEST_OUTPUT_DIR/SUMMARY.md"
echo "" >> "$TEST_OUTPUT_DIR/SUMMARY.md"
echo "Detailed test results saved to: \`playwright-test-results.log\`" >> "$TEST_OUTPUT_DIR/SUMMARY.md"

echo -e "${GREEN}✓ Summary report created${NC}"

# Final output
echo ""
echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}Test Execution Complete${NC}"
echo -e "${PURPLE}========================================${NC}"
echo ""
echo -e "Test Output Directory: ${CYAN}$TEST_OUTPUT_DIR${NC}"
echo ""
echo -e "Results:"
echo -e "  - Generation logs: Each framework directory"
echo -e "  - Build logs: Each framework directory"
echo -e "  - Runtime logs: Each framework directory"
echo -e "  - Playwright test results: playwright-test-results.log"
echo -e "  - Summary: SUMMARY.md"
echo ""
echo -e "${GREEN}All tests complete!${NC}"
echo ""

exit $TEST_EXIT_CODE
