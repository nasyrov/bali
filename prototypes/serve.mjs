// PROTOTYPE server: serves the repo statically and saves screenshots POSTed by the prototype pages.
// Run: node prototypes/serve.mjs  ->  http://localhost:8642/prototypes/art-direction/
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';

const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.geojson': 'application/json' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/shot') {
    const chunks = []; for await (const c of req) chunks.push(c);
    const dataUrl = Buffer.concat(chunks).toString();
    const png = Buffer.from(dataUrl.split(',')[1], 'base64');
    const name = (url.searchParams.get('name') || 'shot').replace(/[^a-z0-9_-]/gi, '_');
    const dir = url.searchParams.get('dir') || 'prototypes/art-direction/screenshots';
    const file = join(root, normalize(dir), name + '.png');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, png);
    res.writeHead(200, { 'content-type': 'text/plain' }); res.end(file); return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const body = await readFile(join(root, normalize(p)));
    res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(8642, () => console.log('prototype server on http://localhost:8642/prototypes/art-direction/'));
