# ─────────────────────────────────────────────────────────────
# Multi-stage build: önce frontend bundle, sonra server runtime.
# Sonuç: Express, /dist'i statik servis eder (nginx zorunluluğu yok).
# ─────────────────────────────────────────────────────────────

FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine AS server-deps
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Sadece koşum için gerekli dosyalar
COPY --from=server-deps /app/node_modules ./node_modules
COPY server/ ./server/
COPY --from=frontend /app/dist ./dist

# Express app dist/'i ayrıca servis etmek isterse, server/index.js içinde
# express.static('dist') eklenebilir; mevcut deploy nginx ile yapılıyor.
WORKDIR /app/server
EXPOSE 3001

# Container içinde root değil
RUN addgroup -S app && adduser -S app -G app && \
    chown -R app:app /app
USER app

CMD ["node", "index.js"]
