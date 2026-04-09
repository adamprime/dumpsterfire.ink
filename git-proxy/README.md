# Git CORS Proxy

Cloudflare Worker that proxies GitHub API and Git HTTP requests, adding CORS headers so the browser app can talk to GitHub directly.

## Security

- Only allows requests from `dumpsterfire.ink` and `localhost:5173`
- Only proxies to `api.github.com` and `github.com/*.git/*` paths
- Requires User-Agent header (blocks trivial abuse)
- Rate limiting via Cloudflare's built-in rules (configure in dashboard)
- The proxy sees TLS-encrypted traffic but cannot read repo contents (auth header passes through to GitHub, not stored)

## Deploy

```bash
cd git-proxy
npx wrangler deploy
```

## Usage

Requests to `https://git-proxy.dumpsterfire.ink/proxy/api.github.com/user` are proxied to `https://api.github.com/user` with CORS headers added.
