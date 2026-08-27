#!/bin/bash

# Run Playwright E2E tests against the dev server.
# Starts the dev server, waits until it is ready, runs tests, then tears down.

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_PORT=3000

echo "=========================================="
echo "E2E Tests with Dev Server"
echo "=========================================="

# Kill any leftover dev processes on port 3000
echo "Stopping any existing dev server on :$APP_PORT..."
lsof -ti:"$APP_PORT" | xargs kill -9 2>/dev/null || true
sleep 1

# Start dev server in background
echo "Starting dev server..."
cd "$PROJECT_ROOT"
bun run dev > /tmp/appwithai-dev-server.log 2>&1 &
DEV_SERVER_PID=$!

# Wait for server (up to 90 s)
echo "Waiting for server on http://localhost:$APP_PORT ..."
for i in $(seq 1 90); do
    if curl -sf "http://localhost:$APP_PORT" > /dev/null 2>&1; then
        echo "Server ready (${i}s)"
        break
    fi
    if [ "$i" -eq 90 ]; then
        echo "Server failed to start within 90 seconds"
        cat /tmp/appwithai-dev-server.log
        kill "$DEV_SERVER_PID" 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# Run Playwright tests
echo "Running E2E tests..."
bunx playwright test
TEST_EXIT_CODE=$?

# Tear down
echo "Stopping dev server..."
kill "$DEV_SERVER_PID" 2>/dev/null || true
lsof -ti:"$APP_PORT" | xargs kill -9 2>/dev/null || true

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "All E2E tests passed."
else
    echo "Some E2E tests failed."
fi

exit $TEST_EXIT_CODE
