# ── Stage 1: Build React frontend ─────────────────────────────────────────────
# .env* is excluded via .dockerignore, so VITE_SUPABASE_URL is unset,
# which activates local-API mode in the frontend bundle.
FROM node:20-alpine AS frontend
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Compile backend ───────────────────────────────────────────────────
FROM node:20-alpine AS backend-build
WORKDIR /app
COPY app/package*.json ./
RUN npm ci
COPY app/ .
RUN npx prisma generate && npm run build

# ── Stage 3: Production image ──────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY --from=backend-build /app/package*.json ./
COPY --from=backend-build /app/node_modules  ./node_modules
COPY --from=backend-build /app/dist          ./dist
COPY --from=backend-build /app/prisma        ./prisma
COPY --from=frontend      /build/dist        ./public

EXPOSE 3000
# db push syncs the schema on every startup (safe for local use)
CMD ["sh", "-c", "./node_modules/.bin/prisma db push && node dist/index.js"]
