
# Build stage
FROM node:20-bookworm AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Instalar dependencias
RUN npm ci --legacy-peer-deps

# Copiar código fuente
COPY src ./src
COPY prisma ./prisma

# Generar cliente de Prisma
RUN npm run db:generate

# Compilar aplicación
RUN npm run build


# Runtime stage
FROM node:20-bookworm-slim

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./



# Producción: dependencias, OpenSSL (requerido por Prisma) y ffmpeg para las miniaturas de video
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force && \
    apt-get update && \
    apt-get install -y --no-install-recommends openssl ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Copiar código compilado del builder
COPY --from=builder /app/dist ./dist

# Copiar prisma schema
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Carpeta de medios (se monta como volumen en docker-compose) con permisos para el usuario node
RUN mkdir -p storage/thumbs && chown -R node:node /app


# Usar el usuario 'node' provisto por la imagen oficial
USER node

# Exponer puerto
EXPOSE 4006

# Health check: sale en cuanto llega la respuesta (si no, la conexión keep-alive
# deja a node vivo ~6 s y Docker lo corta a los 3 s como «unhealthy»)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:4006/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Aplica migraciones pendientes y arranca
CMD [ "sh", "-c", "npx prisma migrate deploy && node dist/main.js" ]
