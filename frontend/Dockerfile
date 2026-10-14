# --- Compilación ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# --- Ejecución: servidor Node que renderiza Angular y reenvía /api al backend ---
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist/frontend ./dist/frontend
USER node
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:4000/mascot/spriteCool.png > /dev/null || exit 1
CMD ["node", "dist/frontend/server/server.mjs"]
