# APPWITHAI Scripts

This directory contains utility scripts for setting up, testing, and developing APPWITHAI.

## Directory Structure

```
scripts/
├── setup/                              # Initial setup and installation
│   └── setup.sh                        # Complete project setup
└── tests/                              # Testing scripts
    ├── run-e2e-with-server.sh          # E2E tests with dev server
    ├── quick-test.sh                   # Quick development tests
    ├── run-comprehensive-framework-tests.sh  # Full framework tests
    └── comprehensive-e2e-test.sh       # Comprehensive E2E testing
```

## Setup Scripts

### `setup/setup.sh`

Complete project setup script that checks prerequisites and builds all packages.

**Usage:**
```bash
./scripts/setup/setup.sh
```

**What it does:**
1. Checks for Bun.js (>= 1.1.0)
2. Checks for Node.js and Git (optional)
3. Creates `.env` from `.env.example` if needed
4. Cleans previous build artifacts
5. Installs dependencies (`bun install`)
6. Builds all packages: core, generator, ai, web
7. Verifies installation

**Prerequisites:**
- Bun.js 1.1.0 or higher

## Test Scripts

### `tests/run-e2e-with-server.sh`

Simple E2E test runner that starts the dev server, runs tests, and cleans up.

**Usage:**
```bash
# Via npm script
bun run test:e2e:server

# Or directly
./scripts/tests/run-e2e-with-server.sh
```

**What it does:**
1. Stops any existing dev server
2. Starts dev server in background
3. Waits for server to be ready (up to 60 seconds)
4. Runs E2E tests
5. Stops dev server
6. Reports test results

### `tests/quick-test.sh`

Fast E2E testing for development - tests Option 1 with SQLite only.

**Usage:**
```bash
./scripts/tests/quick-test.sh
```

**What it does:**
- Tests Option 1 (Next.js + NestJS) with SQLite
- Use this for rapid iteration during development
- Creates test ERD (Hospital Management System)
- Generates, builds, and runs tests
- Auto-cleanup on exit

### `tests/run-comprehensive-framework-tests.sh`

Comprehensive framework E2E test runner that tests all framework/database combinations.

**Usage:**
```bash
# Test all frameworks with SQLite (fast)
./scripts/tests/run-comprehensive-framework-tests.sh

# Test Option 1 only
./scripts/tests/run-comprehensive-framework-tests.sh --option1

# Test Option 2 only
./scripts/tests/run-comprehensive-framework-tests.sh --option2

# Test with PostgreSQL (requires PostgreSQL running)
./scripts/tests/run-comprehensive-framework-tests.sh --postgres

# Skip build step
./scripts/tests/run-comprehensive-framework-tests.sh --skip-build

# Keep test output for debugging
./scripts/tests/run-comprehensive-framework-tests.sh --keep-output
```

**What it tests:**
- Option 1 (Next.js + NestJS) + SQLite
- Option 1 (Next.js + NestJS) + PostgreSQL
- Option 2 (OData + OpenUI5) + SQLite
- Option 2 (OData + OpenUI5) + PostgreSQL

### `tests/comprehensive-e2e-test.sh`

Complete end-to-end test harness that validates the entire generator workflow.

**Usage:**
```bash
# Test all frameworks with SQLite (fast)
./scripts/tests/comprehensive-e2e-test.sh --fast

# Test Option 1 only
./scripts/tests/comprehensive-e2e-test.sh --option1

# Test Option 2 only
./scripts/tests/comprehensive-e2e-test.sh --option2

# Test with PostgreSQL (requires PostgreSQL running)
./scripts/tests/comprehensive-e2e-test.sh --postgres

# Test everything
./scripts/tests/comprehensive-e2e-test.sh

# Clean and test
./scripts/tests/comprehensive-e2e-test.sh --clean

# Keep results for debugging
./scripts/tests/comprehensive-e2e-test.sh --keep-results
```

**Features:**
- ✅ Generates applications for both Option 1 and Option 2
- ✅ Tests with SQLite and PostgreSQL databases
- ✅ Runs Playwright E2E tests for Option 1
- ✅ Runs OPA5 E2E tests for Option 2
- ✅ Handles server startup and shutdown
- ✅ Manages database migrations
- ✅ Provides detailed logging and error reporting
- ✅ Creates comprehensive test reports

**Output:**
All test results are saved to `test-results/<timestamp>/`:
- Generator build logs
- App generation logs
- Database migration logs
- Server logs
- E2E test results
- Playwright reports (HTML)
- Summary report

## Root Scripts

In addition to the scripts in this folder, the root directory contains:

### `start.sh`
Start the development server with proper PID tracking.

**Usage:**
```bash
./start.sh
```

### `stop.sh`
Stop all running APPWITHAI services.

**Usage:**
```bash
./stop.sh
```

## Prerequisites

All scripts require:
- **Bun.js 1.1.0+** (REQUIRED runtime)
- SQLite3 (included with better-sqlite3 package)
- PostgreSQL 14+ (optional, for --postgres tests)

## Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Clean Everything
```bash
# Remove all test output
rm -rf test-output
rm -rf test-results
rm -rf generated-projects
```

### View Logs
```bash
# View most recent test logs
ls -lt test-results/ | head -2 | tail -1 | xargs -I {} cat {}/summary.txt
```

## Development Workflow

1. **Initial Setup:**
   ```bash
   ./scripts/setup/setup.sh
   ```

2. **Start Development:**
   ```bash
   ./start.sh
   ```

3. **Quick Test (during development):**
   ```bash
   ./scripts/tests/quick-test.sh
   ```

4. **Full Test Suite:**
   ```bash
   ./scripts/tests/run-comprehensive-framework-tests.sh
   ```

5. **Stop Development:**
   ```bash
   ./stop.sh
   ```

## Continuous Integration

These scripts are designed to work in CI/CD environments:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: |
    chmod +x scripts/tests/comprehensive-e2e-test.sh
    ./scripts/tests/comprehensive-e2e-test.sh --fast
```

## Contributing

When adding new test scripts:
1. Make them executable (`chmod +x`)
2. Add detailed comments
3. Include usage examples in this README
4. Handle errors gracefully
5. Log all important actions
6. Support common options (--help, --verbose, etc.)

## Support

For issues or questions about these scripts, please refer to:
- `/tests/README.md` - Comprehensive testing guide
- `/docs/TESTING.md` - Detailed E2E testing documentation
- `test-results/<timestamp>/` - Detailed test logs

---

**Version**: 5.1.0
**Last Updated**: February 2026
**Runtime**: Bun.js 1.3+
