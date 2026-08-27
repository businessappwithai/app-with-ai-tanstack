# APPWITHAI Testing Guide

## Overview

This directory contains comprehensive test suites for the APPWITHAI application generator, including E2E tests, unit tests, and framework-specific tests.

## Quick Start

```bash
# Run all E2E tests
bun run test:e2e

# Run with auto-start server
bun run test:e2e:server

# Run specific test suite
bun test tests/e2e/comprehensive-all-frameworks.e2e.spec.ts
```

## Test Structure

```
tests/
├── README.md                  # This file
├── e2e/                       # Main E2E test suite (Playwright)
│   ├── playwright.config.ts   # Playwright configuration
│   ├── comprehensive-all-frameworks.e2e.spec.ts  # All frameworks
│   └── full-stack-e2e.spec.ts # Full stack generation tests
├── unit-tests/                # Unit tests (Vitest)
│   ├── setup.test.ts          # Test configuration
│   └── all-frameworks-comprehensive.spec.ts
├── test-data/                 # Test ERD files
│   ├── comprehensive-test.mermaid
│   ├── simple-crm.mermaid
│   └── hospital.mermaid
├── docs/                      # Test documentation
│   └── ...
└── archive/                   # Archived test outputs
```

## Prerequisites

1. **Dependencies**: Install all dependencies
   ```bash
   bun install
   ```

2. **Build Packages**: Build generator and web packages
   ```bash
   bun run build:generator
   bun run build:web
   ```

3. **Database**: Ensure database directory exists
   ```bash
   mkdir -p packages/web/database
   ```

## Test Suites

### 1. E2E Tests (`e2e/`)

Tests the complete application workflow from project creation to code generation.

#### comprehensive-all-frameworks.e2e.spec.ts
Tests both stack options:
- **Option 1**: Modern Web Stack (TanStack Start + NestJS)
- **Option 2**: Enterprise Stack (OpenUI5 + OData)

**Coverage:**
- Landing page functionality
- Project creation workflow
- ERD designer features
- Stack selection
- Code generation
- Generated application structure validation
- API endpoint testing
- Frontend functionality

#### full-stack-e2e.spec.ts
Tests full application generation and deployment:
- Complete app generation
- Build process
- Runtime validation
- CRUD operations

### 2. Unit Tests (`unit-tests/`)

Tests individual components and functions.

**Files:**
- `setup.test.ts` - Test configuration and utilities
- `all-frameworks-comprehensive.spec.ts` - Framework-specific unit tests

### 3. Generated Application Tests

Generated applications include their own test suites:
- Frontend component tests
- Backend CRUD tests
- E2E navigation tests

## Running Tests

### Run All E2E Tests

```bash
# Start dev server first
bun run dev

# In another terminal
bun test tests/e2e/comprehensive-all-frameworks.e2e.spec.ts
```

### Run with Auto-Start Script

```bash
bun run test:e2e:server
```

This script:
1. Stops any existing dev server
2. Starts the dev server
3. Waits for it to be ready
4. Runs the E2E tests
5. Cleans up by stopping the server

### Run Specific Test Suite

```bash
# Web UI tests
bun test tests/e2e/comprehensive-all-frameworks.e2e.spec.ts

# Full stack tests
bun test tests/e2e/full-stack-e2e.spec.ts

# Unit tests
bun test tests/unit-tests/all-frameworks-comprehensive.spec.ts
```

### Run in Visual Mode

Watch the browser execute tests:

```bash
HEADLESS=false bun test tests/e2e/comprehensive-all-frameworks.e2e.spec.ts
```

## Test Data

Test ERD files are located in `test-data/`:

| File | Description | Entities |
|------|-------------|----------|
| `comprehensive-test.mermaid` | Full-featured test | Customer, Order, Product, OrderLine, Category |
| `simple-crm.mermaid` | Simple CRM | Customer, Interaction, Ticket |
| `hospital.mermaid` | Hospital management | Patient, Doctor, Appointment |
| `blog.mermaid` | Blog platform | User, Post, Comment |

## Supported Framework Types

The generator supports **two main stack options**:

### Option 1: Modern Web Stack
- **Backend**: NestJS + Fastify + Knex.js
- **Frontend**: TanStack Start + Shadcn UI + TanStack Query
- **Database**: PostgreSQL or SQLite
- **Use Case**: Modern web applications

### Option 2: Enterprise SAP-Style Stack
- **Backend**: OData V4 Server (jaystack)
- **Frontend**: OpenUI5 Flexible Column Layout (FCL)
- **Database**: PostgreSQL or SQLite
- **Use Case**: SAP-style enterprise applications

## Test Results

### Results Location

After each test run:
- **Console Output**: Real-time test progress and results
- **Screenshots**: `tests/e2e/screenshots/` for debugging
- **Logs**: `tests/e2e/logs/` for detailed logs
- **Test Results**: `tests/e2e/test-results/` for JSON reports

### Reading Test Results

```bash
# View latest screenshots
ls -lt tests/e2e/screenshots/ | head -10

# View test logs
cat tests/e2e/logs/comprehensive-e2e.log

# View error summary
cat tests/e2e/logs/comprehensive-e2e-errors.json
```

## Test Coverage

### Currently Tested Flows

1. **Landing Page**
   - Page title verification
   - Main heading presence
   - Feature cards display
   - Navigation links

2. **Project Creation**
   - New Project button
   - Project form validation
   - Project save functionality

3. **ERD Designer**
   - Page elements
   - Example templates
   - Manual editing
   - Validation
   - Save/Load functionality
   - Version history

4. **Stack Selection**
   - Option 1 (Modern Web Stack)
   - Option 2 (Enterprise SAP-Style Stack)

5. **Code Generation**
   - Generation for both options
   - File structure validation
   - Dependency installation
   - Build process validation

6. **Generated Applications**
   - API endpoint testing
   - Frontend functionality
   - CRUD operations
   - Navigation

## Troubleshooting

### Server Not Running

```bash
# Check if server is running
curl http://localhost:3000

# Start server
bun run dev
```

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Start server
bun run dev
```

### Test Timeout

Increase timeout in test file:
```typescript
test.setTimeout(60000); // 60 seconds
```

### Screenshot Issues

Ensure Playwright browsers are installed:
```bash
bunx playwright install
```

## Test Configuration

Playwright configuration is in `tests/e2e/playwright.config.ts`:

```typescript
export const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  screenshotDir: 'tests/e2e/screenshots',
  logDir: 'tests/e2e/logs',
};
```

## Best Practices

1. **Run tests before committing**: Ensure all tests pass
2. **Clean up generated apps**: Remove test-generated apps after validation
3. **Update test data**: Keep test ERD files up to date
4. **Add tests for new features**: Cover new functionality
5. **Use descriptive test names**: Make failures easy to understand

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: |
    bun install
    bun run build:generator
    bun run build:web
    bun run dev &
    bun run test:e2e:server
```

## Archiving

Old test outputs are archived in `tests/archive/`:
- `generated-apps/` - Past generated applications
- `screenshots/` - Historical test screenshots
- `logs/` - Past test execution logs

---

**Version**: 5.1.0
**Last Updated**: February 2026
**Test Framework**: Playwright + Vitest
