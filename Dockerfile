# ── Aura — PRODUCTION / STAGING image (multi-stage) ──────────────────────
# Builds the Next.js app and serves it with `next start`. Priority of this task
# is the dev image (Dockerfile.dev); this is the clean base for staging/prod.

# 1) Build stage — install ALL deps (incl. dev: tailwind/postcss/typescript are
#    needed by `next build`) and run the production build. NODE_ENV is left unset
#    here so npm installs devDependencies; the runner stage sets it to production.
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci --include=dev || npm install
# Native Linux SWC (lockfile may only carry the host-OS binary → slow WASM fallback).
RUN npm install --no-save --no-audit --no-fund "@next/swc-linux-x64-gnu@$(node -p "require('next/package.json').version")" || true
COPY . .
RUN npm run build

# 2) Runner stage — minimal runtime (.next + node_modules + package.json)
#    node_modules is kept whole on purpose: `ethers` is pulled transitively, so
#    `npm prune --production` would drop it. Slimming (output:standalone or
#    promoting ethers to a dependency) is a documented follow-up.
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000

# next start -H 0.0.0.0 (reads PORT from env). See package.json "start:docker".
CMD ["npm", "run", "start:docker"]
