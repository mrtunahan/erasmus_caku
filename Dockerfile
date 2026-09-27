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
# ⚠ Sunucu kök lib/ altındaki ortak kural dosyalarını import ediyor
# (routes/db.js, routes/yoklama.js → import('../../lib/...')). Bu satır
# yokken imajda anket/muafiyet/staj yazmaları ve yoklama 500 dönüyordu.
COPY lib/ ./lib/
COPY --from=frontend /app/dist ./dist

# Express dist/'i servis ETMEZ; imaj önünde dist/'i sunan bir nginx
# (ssl-setup/nginx-domain.conf) gerektirir. Yüklenen dosyalar
# /app/server/uploads altındadır — kalıcı olması için volume bağlayın:
#   docker run -v caku_uploads:/app/server/uploads ...
WORKDIR /app/server
EXPOSE 3001

# Container içinde root değil
RUN mkdir -p /app/server/uploads && addgroup -S app && adduser -S app -G app && \
    chown -R app:app /app
VOLUME ["/app/server/uploads"]
USER app

CMD ["node", "index.js"]
