FROM node:20-alpine
RUN apk add --no-cache poppler-utils
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
