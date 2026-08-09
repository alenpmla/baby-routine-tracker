# ---- Stage 1: build the frontend ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 2: run the API server + serve the app ----
FROM node:22-alpine AS serve
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
COPY scripts/gen-certs.sh ./scripts/gen-certs.sh
RUN apk add --no-cache openssl
ENV PORT=3000
ENV HTTPS_PORT=3443
ENV DATA_FILE=/data/bt.json
ENV CERT_DIR=/data/certs
EXPOSE 3000 3443
VOLUME ["/data"]
CMD ["sh", "-c", "sh scripts/gen-certs.sh && node server/index.js"]
