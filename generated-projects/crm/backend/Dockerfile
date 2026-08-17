FROM oven/bun:1.3-alpine AS builder

WORKDIR /app
COPY bun.lock package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN bun install --frozen-lockfile

COPY backend/ ./backend/
WORKDIR /app/backend
RUN bun run build

# ─── runtime ───────────────────────────────────────────────────────────────
FROM oven/bun:1.3-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY bun.lock package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN bun install --frozen-lockfile --production

# Copy backend application
COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/src ./backend/src
COPY backend/seeds ./backend/seeds
COPY backend/tsconfig.json ./backend/

# Copy startup script
COPY backend/run-app.sh ./backend/
RUN chmod +x ./backend/run-app.sh

EXPOSE 4001

CMD ["/app/backend/run-app.sh"]
