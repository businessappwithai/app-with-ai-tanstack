#!/bin/sh
cd /app/backend
# Try node first (if available), fall back to bun
if command -v node >/dev/null 2>&1; then
  exec node -r tsconfig-paths/register /app/backend/dist/src/main.js
else
  export NODE_PATH=/app/node_modules:/app/backend/node_modules
  exec bun run /app/backend/dist/src/main.js
fi
