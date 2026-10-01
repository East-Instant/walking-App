const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { apiProxy } = require('../dev/api-proxy.cjs');

async function listen(server, t) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('phone-origin multipart uploads preserve credentials, bytes and upstream path', async t => {
  let received;
  const upstream = await listen(http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received = { url: req.url, headers: req.headers, body: Buffer.concat(chunks) };
    res.writeHead(201, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end('{"id":"saved-photo"}');
  }), t);
  const proxy = apiProxy(upstream);
  const web = await listen(http.createServer((req, res) => proxy(req, res, () => { res.writeHead(404); res.end(); })), t);
  const boundary = 'test-boundary';
  const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="photo.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`), Buffer.from([255,216,255,0,1,2]), Buffer.from(`\r\n--${boundary}--\r\n`)]);
  const result = await fetch(web + '/api/pins/test/photos?check=1', {
    method: 'POST', headers: { Authorization: 'Bearer test-token', Origin: 'https://phone.example', 'Content-Type': `multipart/form-data; boundary=${boundary}` }, body,
  });
  assert.equal(result.status, 201);
  assert.equal((await result.json()).id, 'saved-photo');
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(received.url, '/pins/test/photos?check=1');
  assert.equal(received.headers.authorization, 'Bearer test-token');
  assert.equal(received.headers['content-type'], `multipart/form-data; boundary=${boundary}`);
  assert.deepEqual(received.body, body);
  assert.equal((await fetch(web + '/apiary')).status, 404);
});

test('redirects stay on the web origin and request paths cannot change the upstream', async t => {
  const paths = [];
  const upstream = await listen(http.createServer((req, res) => {
    paths.push(req.url);
    res.writeHead(307, { Location: `http://${req.headers.host}/pins/?page=2` }); res.end();
  }), t);
  const proxy = apiProxy(upstream);
  const web = await listen(http.createServer((req, res) => proxy(req, res, () => res.end())), t);
  const response = await fetch(web + '/api//attacker.example/path', { redirect: 'manual' });
  assert.equal(response.headers.get('location'), '/api/pins/?page=2');
  assert.equal(paths[0], '//attacker.example/path');
});

test('unavailable backend returns an actionable JSON error', async t => {
  const closed = http.createServer();
  closed.listen(0, '127.0.0.1'); await once(closed, 'listening');
  const port = closed.address().port;
  await new Promise(resolve => closed.close(resolve));
  const proxy = apiProxy(`http://127.0.0.1:${port}`);
  const web = await listen(http.createServer((req, res) => proxy(req, res, () => res.end())), t);
  const response = await fetch(web + '/api/health');
  assert.equal(response.status, 503);
  assert.match((await response.json()).detail, /バックエンド/);
});
