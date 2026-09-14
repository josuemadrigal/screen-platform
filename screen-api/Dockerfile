
# Build stage
FROM node:20-bullseye AS builder

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
FROM node:20-bullseye

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./



# Instalar solo dependencias de producción y OpenSSL 1.1 para Prisma
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force && \
    apt-get update && \
    apt-get install -y libssl1.1 && \
    rm -rf /var/lib/apt/lists/*

# Copiar código compilado del builder
COPY --from=builder /app/dist ./dist

# Copiar prisma schema
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma


# Usar el usuario 'node' provisto por la imagen oficial
USER node

# Exponer puerto
EXPOSE 4006

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4006/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Comando de inicio
CMD [ "node", "dist/main.js" ]
