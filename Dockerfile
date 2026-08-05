# The ERDwithAI generator, as an image.
#
# What comes out is the design-and-generate application: sign in, bring a model,
# generate a full-stack app from it, and — at the deploy step — build that
# generated app into an image of its own.
#
# That last part is why the runtime stage carries a docker client. The container
# does not run a daemon; it talks to the host's, which means the socket has to be
# handed in:
#
#   docker run -v /var/run/docker.sock:/var/run/docker.sock …
#
# Without it everything works except deploy, which will say so rather than fail
# obscurely.
#
# Two ways to give it a model, both handled by the entrypoint:
#
#   SEED_MODEL=/models/drug-discovery.eml.mmd   a mounted .mmd document
#   SEED_DATABASE_URL=postgres://…              an existing schema to read
#
# And one database of its own, which may be local or hosted:
#
#   DATABASE_URL=postgresql://…                 Neon and friends work as-is; TLS
#                                               is negotiated for remote hosts

# Behind a TLS-intercepting proxy — corporate egress, or a sandboxed CI runner —
# the build cannot verify any certificate until it trusts that proxy's CA. Drop
# the certificate into `docker/ca-certificates/` and it is installed in both
# stages; the directory is empty by default and the whole step is a no-op:
#
#   cp corporate-ca.crt docker/ca-certificates/
#   docker build --network host \
#     --build-arg HTTPS_PROXY="$HTTPS_PROXY" --build-arg NO_PROXY="$NO_PROXY" .
#
# ─── certificates ───────────────────────────────────────────────────────────
# One stage, reused by both of the real ones, so the trust store is assembled
# identically in each and the install layer is cached once.
FROM oven/bun:1.3.14-alpine AS certs

# The directory always exists, so this COPY always succeeds; whether it carries
# anything is up to whoever is building.
COPY docker/ca-certificates/ /usr/local/share/ca-certificates/
RUN if ls /usr/local/share/ca-certificates/*.crt >/dev/null 2>&1; then \
      cat /usr/local/share/ca-certificates/*.crt >> /etc/ssl/certs/ca-certificates.crt; \
      echo "installed $(ls /usr/local/share/ca-certificates/*.crt | wc -l) extra CA certificate(s)"; \
    else \
      echo "no extra CA certificates supplied"; \
    fi

# ─── build ──────────────────────────────────────────────────────────────────
FROM oven/bun:1.3.14-alpine AS build

ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ARG NO_PROXY=""
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY} \
    NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

COPY --from=certs /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

WORKDIR /app

# Manifests first: this layer only changes when a dependency does, so editing
# source does not re-run the install.
COPY package.json bun.lock ./
COPY packages/core/package.json ./packages/core/
COPY packages/generator/package.json ./packages/generator/
COPY packages/ai/package.json ./packages/ai/
COPY packages/web/package.json ./packages/web/
RUN bun install --frozen-lockfile

COPY . .

# Same order as `bun run build`, minus the lint step — a lint warning should not
# stop an image from being produced.
RUN bun run build:core \
 && bun run build:generator \
 && bun run build:ai \
 && bun run build:web

# Drop the dev tree once it has produced the bundles. Vite, Vitest, Playwright
# and the type checker are half the image and none of them run in production —
# the server serves a bundle that was already built.
RUN bun install --frozen-lockfile --production \
 && rm -rf /root/.bun/install/cache node_modules/.cache packages/*/node_modules/.cache

# ─── runtime ────────────────────────────────────────────────────────────────
FROM oven/bun:1.3.14-alpine

ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ARG NO_PROXY=""

COPY --from=certs /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt \
    DEFAULT_OUTPUT_DIR=/app/generated-projects

# docker-cli    build the generated application's image at the deploy step
# postgresql-client  wait for the database before migrating
# git           the generator initialises a repository in each generated project
RUN apk add --no-cache docker-cli postgresql-client git

# The whole workspace, not just the build output. The generator shells out to its
# own CLI, reads Handlebars templates off disk and runs `bun install` inside each
# project it writes, so the sources and templates have to be present — a runtime
# image pruned to dist alone can start but cannot generate anything.
COPY --from=build /app /app

# Somewhere to write generated applications. Mount a volume over it to keep them.
RUN mkdir -p /app/generated-projects /models

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000

# Reports unhealthy while the database is unreachable, which is the failure
# worth surfacing: the app answers on the port long before it is usable.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT}/api/health" || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bun", "run", "--cwd", "packages/web", "start"]
