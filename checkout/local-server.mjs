// Local end-to-end test server. Reads the key from checkout/.dev.vars (gitignored).
// Run from repo root:  node checkout/local-server.mjs   → serves on 127.0.0.1:8787
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createCheckoutResponse } from './worker.js';

const KEY = readFileSync(new URL('./.dev.vars', import.meta.url), 'utf8')
  .split('\n').find(l => l.startsWith('DODO_API_KEY=')).split('=')[1].trim();

http.createServer(async (req, res) => {
  const body = req.method === 'POST' ? await readBody(req) : undefined;
  const request = new Request('http://127.0.0.1:8787' + req.url, {
    method: req.method,
    headers: { origin: req.headers.origin || '', 'content-type': 'application/json' },
    body: body || undefined,
  });
  const out = await createCheckoutResponse(request, KEY);
  res.writeHead(out.status, Object.fromEntries(out.headers));
  res.end(await out.text());
}).listen(8787, '127.0.0.1', () => console.log('checkout api on http://127.0.0.1:8787'));

function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => resolve(data));
  });
}
