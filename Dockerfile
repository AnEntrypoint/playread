FROM node:22-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npx -y playwright install chromium --with-deps

EXPOSE 3000

ENV PORT=3000 \
    NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "run", "http"]
