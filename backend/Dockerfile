# Build context is ./backend (see docker-compose.yml).

FROM node:22-bookworm-slim AS build
WORKDIR /app

# Prisma needs openssl to pick the right query engine.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# The schema has to be here before npm ci because postinstall runs prisma generate.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build


# The build stage stays intact (the compose seed service runs from it). This
# one drops devDependencies, then regenerates the client so the pruned
# node_modules is guaranteed to hold it.
FROM build AS prod-deps
RUN npm prune --omit=dev && npx prisma generate


FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
