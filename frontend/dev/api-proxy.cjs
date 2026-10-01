const http = require('node:http');
const https = require('node:https');

const hopHeaders = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);
function endToEndHeaders(headers) {
  const excluded = new Set([...hopHeaders, ...String(headers.connection ?? '').split(',').map(name => name.trim().toLowerCase())]);
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !excluded.has(name.toLowerCase())));
}

/** Development-only, fixed-upstream proxy. Never derive the upstream host from a request. */
function apiProxy(upstream) {
  const target = new URL(upstream);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.search || target.hash) {
    throw new Error('WALKING_API_PROXY_URL must be an HTTP(S) URL without credentials, query or fragment');
  }
  return (req, res, next) => {
    if (!/^\/api(?:\/|\?|$)/.test(req.url ?? '')) return next();
    const path = req.url.slice(4);
    const destination = new URL(target);
    // Assign path directly: even /api//example.com stays on the configured upstream.
    const queryIndex = path.indexOf('?');
    const pathname = queryIndex < 0 ? path : path.slice(0, queryIndex);
    destination.pathname = target.pathname.replace(/\/$/, '') + (pathname || '/');
    destination.search = queryIndex < 0 ? '' : path.slice(queryIndex);
    const transport = destination.protocol === 'https:' ? https : http;
    const headers = endToEndHeaders(req.headers);
    headers.host = target.host;
    const proxy = transport.request(destination, { method: req.method, headers }, response => {
      const responseHeaders = endToEndHeaders(response.headers);
      if (responseHeaders.location) {
        const redirect = new URL(responseHeaders.location, destination);
        if (redirect.origin === target.origin) responseHeaders.location = '/api' + redirect.pathname + redirect.search;
      }
      res.writeHead(response.statusCode ?? 502, responseHeaders);
      response.on('error', () => res.destroy());
      response.pipe(res);
    });
    proxy.setTimeout(25000, () => proxy.destroy(new Error('upstream timeout')));
    proxy.on('error', () => {
      if (res.destroyed) return;
      if (res.headersSent) return res.destroy();
      res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ detail: 'APIに接続できません。PC側のバックエンドの起動状態を確認してください。' }));
    });
    req.on('aborted', () => proxy.destroy());
    req.on('error', () => proxy.destroy());
    res.on('close', () => { if (!res.writableEnded) proxy.destroy(); });
    req.pipe(proxy);
  };
}
module.exports = { apiProxy };
