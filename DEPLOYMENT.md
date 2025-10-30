# Playread Deployment Guide

## Quick Start

### Local Development
```bash
npm install
npm run http
# Visit http://localhost:3000/health
```

### Docker Compose
```bash
docker-compose up -d
docker-compose logs -f
```

### Production Docker
```bash
docker build -t playread:latest .
docker run -d -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  --name playread \
  playread:latest
```

## Coolify Deployment

### Prerequisites
- Coolify 4.0.0 or later
- Repository connected: `github.com/AnEntrypoint/playread`
- Dockerfile in repository (already included)

### Standard Deployment
1. In Coolify Dashboard, select your application
2. Set Build Pack to **"Dockerfile"**
3. Set Port to **3000**
4. Environment Variables:
   ```
   PORT=3000
   NODE_ENV=production
   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
   ```
5. Deploy

### Troubleshooting Permission Errors

If you see: `Permission denied` on `.env` or `docker-compose.yaml`

**Solution 1: Fix Host Permissions (SSH into Coolify host)**
```bash
cd /data/coolify/applications/YOUR_APP_ID
sudo chown -R coolify:coolify .
sudo chmod -R 755 .
```

**Solution 2: Use provided script**
```bash
# On Coolify host
curl -O https://raw.githubusercontent.com/AnEntrypoint/playread/main/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh /data/coolify/applications/YOUR_APP_ID
```

**Solution 3: Coolify Settings Fix**
1. Stop the application
2. Remove the application directory via Coolify UI
3. Reconnect repository
4. Re-deploy

### Health Check
Once deployed, verify with:
```bash
curl https://playread.yourserver.com/health
# Should return: {"status":"ok"}
```

## Nixpacks Deployment

### Build
```bash
nixpacks build .
```

### Configuration
```bash
PORT=8080 nixpacks build .
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| PORT | 3000 | Server port |
| NODE_ENV | development | Node environment |
| PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD | 0 | Force browser download |
| DISPLAY | :99 | X11 display for headless |

## MCP Endpoints

- `POST /mcp` - MCP protocol (Streamable HTTP)
- `GET /health` - Health check
- `POST /mcp` - Tool execution

## Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Container Logs
```bash
# Docker
docker logs playread

# Docker Compose
docker-compose logs playread

# Coolify
# View in Coolify Dashboard > Application > Logs
```

## Performance

- **Memory**: Starts with ~200MB, grows with browser sessions
- **CPU**: Single threaded Node.js + browser processes
- **Concurrent Requests**: Limited by available system resources
- **Browser Instances**: Each request spawns a new Playwright browser

## Security Notes

- No authentication by default (add reverse proxy if needed)
- All requests execute Playwright flows
- Browser can access any public website
- Consider adding authentication via reverse proxy:
  - Nginx auth_request
  - Caddy basicauth
  - OAuth2 proxy

## Scaling Recommendations

- **Single Server**: Up to ~10 concurrent requests
- **Multiple Servers**: Use load balancer, session-less design
- **High Load**: Consider request queue/job queue system

## Common Issues

### "Cannot find module '@playwright/mcp'"
```bash
npm install
```

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000
kill -9 <PID>
```

### Browser crashes
- Increase memory limit
- Reduce concurrent requests
- Add swap space

### Timeout errors
- Increase NODE timeout
- Reduce page load wait times
- Check network connectivity
