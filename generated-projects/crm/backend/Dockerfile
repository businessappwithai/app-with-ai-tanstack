FROM oven/bun:1.3-alpine AS builder

WORKDIR /app
# `bun.loc[k]` rather than `bun.lock`: a Docker COPY of a file that is not there
# fails the build, and the generator does not write a lockfile — it has no
# registry to resolve against. The glob makes it optional, and the install below
# pins to it when a project has committed one.
COPY package.json bun.loc[k] ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN if [ -f bun.lock ]; then bun install --frozen-lockfile; else bun install; fi

COPY backend/ ./backend/
WORKDIR /app/backend
RUN bun run build

# ─── runtime ───────────────────────────────────────────────────────────────
FROM oven/bun:1.3-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json bun.loc[k] ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN if [ -f bun.lock ]; then bun install --frozen-lockfile --production; \
    else bun install --production; fi

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
