const ALLOWED_ORIGINS = ['https://dumpsterfire.ink', 'http://localhost:5173']
const ALLOWED_HOSTS = ['api.github.com', 'github.com']

function isAllowedPath(url: URL): boolean {
  if (url.hostname === 'api.github.com') return true
  if (url.hostname === 'github.com') return /^\/[^/]+\/[^/]+\.git\//.test(url.pathname)
  return false
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent, Accept, X-GitHub-Api-Version, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access',
    'Access-Control-Expose-Headers': 'WWW-Authenticate',
    'Access-Control-Max-Age': '86400',
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin') || ''
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden', { status: 403 })
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (!request.headers.get('User-Agent')) {
      return new Response('User-Agent required', { status: 400 })
    }

    const url = new URL(request.url)
    const targetPath = url.pathname.replace(/^\/proxy\//, '')
    const targetUrl = new URL(`https://${targetPath}${url.search}`)

    if (!ALLOWED_HOSTS.includes(targetUrl.hostname) || !isAllowedPath(targetUrl)) {
      return new Response('Forbidden: path not allowed', { status: 403 })
    }

    const proxyHeaders = new Headers(request.headers)
    proxyHeaders.delete('Origin')
    proxyHeaders.delete('Host')

    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: proxyHeaders,
      body: request.body,
    })

    const responseHeaders = new Headers(response.headers)
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      responseHeaders.set(k, v)
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  },
}
