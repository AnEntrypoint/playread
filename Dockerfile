FROM node:22-slim

RUN apt-get update && apt-get install -y \
    chromium-browser \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN export PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright && \
    npx -y playwright install chrome --with-deps && \
    echo "Searching for chrome-linux directory..." && \
    find /root/.cache/ms-playwright -type d -name "chrome-linux" && \
    CHROME_DIR=$(find /root/.cache/ms-playwright -name "chrome-linux" -type d | head -1) && \
    echo "Found CHROME_DIR: $CHROME_DIR" && \
    test -n "$CHROME_DIR" || (echo "ERROR: chrome-linux not found" && exit 1) && \
    mkdir -p /opt/google && \
    cp -r "$CHROME_DIR" /opt/google/chrome && \
    ls -la /opt/google/chrome/chrome && \
    /opt/google/chrome/chrome --version

EXPOSE 3000

ENV PORT=3000 \
    NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "run", "http"]
