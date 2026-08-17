FROM oven/bun:1.3-alpine AS builder

WORKDIR /app
COPY bun.lock package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN bun install --frozen-lockfile

COPY frontend/ ./frontend/
WORKDIR /app/frontend

# Empty on purpose. A base URL compiled into a client bundle is an address the
# image can never be run under any other name; empty means "same origin as the
# page", and this server forwards /api/* to the API itself (src/routes/api/$.ts),
# which is what keeps the session cookie same-origin. BACKEND_URL, set at run
# time, is where that forwarding goes.
ARG VITE_API_URL=
ARG VITE_APP_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_URL=${VITE_APP_URL}

RUN bun run build

# ─── runtime ───────────────────────────────────────────────────────────────
FROM oven/bun:1.3-alpine

WORKDIR /app
# PORT is what the server actually binds; without it Nitro picks 3000 and the
# port the compose file publishes has nothing behind it. BACKEND_URL is where
# /api/* is forwarded — compose points it at the backend service.
ENV NODE_ENV=production \
    PORT=4000 \
    BACKEND_URL=http://backend:4001

# Install production dependencies only
COPY bun.lock package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN bun install --frozen-lockfile --production

# Copy frontend application
COPY --from=builder /app/frontend/.output ./frontend/.output
COPY --from=builder /app/frontend/package.json ./frontend/

EXPOSE 4000

CMD ["bun", "run", "frontend/.output/server/index.mjs"]
