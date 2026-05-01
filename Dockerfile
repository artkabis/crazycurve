FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:all

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/server/dist  ./server/dist
EXPOSE 3001
CMD ["node", "server/dist/server.cjs"]
