FROM node:18-alpine AS build-stage
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:18-alpine AS production-stage
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY --from=build-stage /app/dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
