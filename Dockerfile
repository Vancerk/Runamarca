FROM node:24-alpine
WORKDIR /app
COPY package.json server.js dice-game.js ./
COPY public ./public
COPY mesa-nova ./mesa-nova
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
