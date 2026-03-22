FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ cairo-dev pango-dev libjpeg-turbo-dev giflib-dev

COPY package*.json ./

RUN npm install --only=production

COPY . .

RUN mkdir -p logs uploads/qrcodes

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]
