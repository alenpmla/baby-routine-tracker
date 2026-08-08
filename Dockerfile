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
ENV PORT=3000
ENV DATA_FILE=/data/bt.json
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server/index.js"]
