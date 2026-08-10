# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
# Production dependencies only (keeps the image small and the attack surface low),
# then regenerate the Prisma engine for this platform.
RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Run as an unprivileged user (no root in the container).
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# Apply committed migrations to the database, then boot.
# Prisma's engine is generated at image build time; only the migration layer
# runs at startup. New schema changes are shipped as additional migrations.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
