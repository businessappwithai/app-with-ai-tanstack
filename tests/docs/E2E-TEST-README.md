# E2E Testing Documentation

## Overview

This document describes the comprehensive End-to-End (E2E) testing system for the APPWITHAI generator application. The E2E tests validate the complete workflow from creating projects to generating applications with different stack options.

## Test Architecture

### Supported Framework Types

The generator supports **two main stack options**:

1. **Option 1 (Modern Web Stack)**: NestJS backend + TanStack Start frontend
2. **Option 2 (Enterprise Stack)**: OData V4 backend + OpenUI5 frontend

### Test Files

#### 1. `comprehensive-e2e.test.ts`
Tests the web application UI including:
- Landing page functionality
- Project creation workflow
- ERD designer features
- Stack selection
- Project management
- Error handling
- Responsive design

#### 2. `generator-e2e.test.ts`
Tests the code generator including:
- Application generation for both stack options
- Generated file structure validation
- Dependency installation
- Application building
- API endpoint testing
- Frontend testing

#### 3. `run-all-e2e.test.ts`
Master test runner that executes all test suites in sequence.

#### 4. `setup.test.ts`
Shared test utilities including:
- Test configuration
- Logging utilities
- Browser management
- Result tracking

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   bun install
   ```

2. Build the generator:
   ```bash
   bun run build:generator
   ```

3. Build the web application:
   ```bash
   bun run build:web
   ```

### Run Individual Test Suites

#### Web Application E2E Tests
```bash
# Start dev server first
bun run dev

# In another terminal, run tests
bun run test/comprehensive-e2e.test.ts
```

#### Generator E2E Tests
```bash
bun run test/generator-e2e.test.ts
```

#### All E2E Tests
```bash
bun run test/run-all-e2e.test.ts
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

## Test Results

### Latest Test Run (Iteration 1)

**Comprehensive E2E Test Results:**
- Total Tests: 21
- Passed: 19 (90.48%)
- Failed: 2

**Passed Tests:**
1. ✓ Landing Page - Hero Section
2. ✓ Landing Page - Feature Cards
3. ✓ Landing Page - Navigation
4. ✓ Project Creation - New Project Button
5. ✓ Project Init - All Stack Types
6. ✓ ERD Designer - Page Elements
7. ✓ ERD Designer - Example Templates
8. ✓ ERD Designer - Manual Editing
9. ✓ ERD Designer - Validation
10. ✓ ERD Designer - Save Draft
11. ✓ ERD Designer - Version History
12. ✓ Stack Selection - All Options
13. ✓ Configuration Summary
14. ✓ Projects List - Display
15. ✓ Projects List - Search
16. ✓ Projects List - Project Actions
17. ✓ Error Handling - Invalid Routes
18. ✓ Responsive Design - Mobile View

**Failed Tests:**
1. ✗ Project Init - Form Validation (Timeout on Save & Continue button)
2. ✗ Project Init - Save and Continue (Timeout on textarea fill)

Both failures are related to form element timeouts and can be fixed by:
- Increasing timeout values
- Using more specific element selectors
- Adding explicit waits for element visibility

## Test Scenarios

### Blog Application (Option 1)
- **ERD**: User and Post entities with one-to-many relationship
- **Stack**: NestJS + TanStack Start
- **Validates**: CRUD operations, REST API endpoints, TanStack Start UI

### E-commerce Application (Option 1)
- **ERD**: Customer, Order, Product, OrderItem entities
- **Stack**: NestJS + TanStack Start
- **Validates**: Complex relationships, multiple entities, transaction handling

### Hospital Management (Option 2)
- **ERD**: Patient, Doctor, Appointment entities
- **Stack**: OData + OpenUI5
- **Validates**: Enterprise stack, OData endpoints, SAP-style UI

## Directory Structure

```
test/
├── comprehensive-e2e.test.ts    # Web app E2E tests
├── generator-e2e.test.ts        # Generator E2E tests
├── run-all-e2e.test.ts          # Master test runner
├── setup.test.ts                # Test utilities
├── setup.vitest.tsx             # Vitest setup (unit tests)
├── screenshots/                 # Test screenshots
├── logs/                        # Test logs
└── full-app-test.ts            # Additional app tests

scripts/
└── run-e2e-with-server.sh       # Auto-start script
```

## Configuration

Test configuration is in `test/setup.test.ts`:

```typescript
export const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  screenshotDir: 'test/screenshots',
  logDir: 'test/logs',
};
```

## CI/CD Integration

To run tests in CI:

```yaml
- name: Run E2E Tests
  run: |
    bun run build
    bun run test:e2e:server
```

## Troubleshooting

### Server Won't Start
- Check if port 3000 is already in use
- Kill existing bun processes: `pkill -f "bun.*dev"`

### Tests Time Out
- Increase timeout values in TEST_CONFIG
- Check if server is running: `curl http://localhost:3000`

### Screenshots Not Saving
- Ensure screenshot directory exists
- Check file permissions

## Future Improvements

1. **Fix Failing Tests**: Address the 2 failing form validation tests
2. **Add More Test Scenarios**: Test additional ERD patterns
3. **Visual Regression Testing**: Compare screenshots across runs
4. **Performance Testing**: Measure response times
5. **Accessibility Testing**: Test with screen readers
6. **Cross-Browser Testing**: Test with Firefox, Safari, Edge
7. **Mobile Testing**: Test on real devices
8. **API Testing**: Add comprehensive API endpoint tests
9. **Database Testing**: Validate database migrations
10. **Security Testing**: Test for XSS, CSRF, SQL injection

## Contributing

When adding new E2E tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Add logging for debugging
4. Take screenshots on failure
5. Clean up resources (close browsers, stop servers)
6. Update this README with new test scenarios

## Ralph Loop Integration

This E2E test system was developed as part of **Iteration 1 of 40** of the Ralph Loop. Each iteration will:
1. Run all E2E tests
2. Fix any failing tests
3. Add new test scenarios
4. Improve test coverage
5. Optimize test performance

## Test Coverage Goals

- **Current**: 90.48% (19/21 tests passing)
- **Target**: 100% (all tests passing)
- **Coverage**: All major user flows
- **Frequency**: Every code change, before deployment
