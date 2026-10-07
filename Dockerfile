FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js dice-game.js accounts.mjs read-cache.mjs ./
COPY public ./public
COPY mesa-nova ./mesa-nova
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
