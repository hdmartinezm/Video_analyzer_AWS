# ── Etapa 1: builder ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# ── Etapa 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-slim

# ffmpeg y yt-dlp — node:20-slim usa Debian (glibc), compatible con binarios estándar
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3 curl ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
         -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copiar dependencias instaladas
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Copiar código backend
COPY backend/ ./backend/

# Copiar frontend (servido por Express como static files)
COPY index.html ./
COPY scripts/ ./scripts/
COPY styles/ ./styles/

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "server.js"]
