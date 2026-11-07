# syntax=docker/dockerfile:1

# ---- Build: Angular needs Node, the workspace uses Bun ----
FROM node:22-bookworm-slim AS build
RUN npm install --global bun@1.4.4
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bunx nx build web --skip-nx-cache \
	&& bun build apps/server/src/main.ts --target=bun --minify --outfile=dist/server/main.js

# ---- Runtime: one bundled server file plus the static web app ----
FROM oven/bun:1.4.4-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
	PORT=3000 \
	STATIC_DIR=public

COPY --from=build /app/dist/server/main.js ./main.js
COPY --from=build /app/dist/apps/web/browser ./public

USER bun
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s \
	CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["bun", "main.js"]
