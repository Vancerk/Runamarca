FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apk add --no-cache python3
COPY server.js dice-game.js accounts.mjs read-cache.mjs ./
COPY public ./public
COPY mesa-nova ./mesa-nova
COPY torre ./torre
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
