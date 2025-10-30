FROM node:22-slim

RUN apt-get update && apt-get install -y \
    chromium-browser \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

RUN npx -y playwright install chrome --with-deps && \
    CHROME_DIR=$(find /root/.cache/ms-playwright -name "chrome-linux" -type d | head -1) && \
    mkdir -p /opt/google && \
    cp -r "$CHROME_DIR" /opt/google/chrome && \
    ls -la /opt/google/chrome/chrome

EXPOSE 3000

ENV PORT=3000 \
    NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "run", "http"]
