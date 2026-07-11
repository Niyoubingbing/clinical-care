// 本地等价测试服务器：托管 out/ 静态导出产物（= 线上 Vercel 部署的同一份）。
// 路由映射模拟 Vercel/Next 静态导出行为；/patient 为通用详情壳（pid 走 sessionStorage）。
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(ROOT, 'out');
const PORT = Number(process.env.PORT || 4321);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
};

const ROUTES = {
  '/': 'index.html',
  '/todos': 'todos.html',
  '/settings': 'settings.html',
  '/settings/rounding': 'settings/rounding.html',
  '/settings/quick-todos': 'settings/quick-todos.html',
  '/settings/groups': 'settings/groups.html',
  '/settings/bed-recognition': 'settings/bed-recognition.html',
  '/patient': 'patient.html',
};

function resolve(pathname) {
  if (ROUTES[pathname]) return ROUTES[pathname];
  const clean = pathname.split('?')[0];
  if (clean === '/') return 'index.html';
  return clean.replace(/^\/+/, '');
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = resolve(pathname);
    const filePath = join(OUT, rel);
    const safe = normalize(filePath);
    if (!safe.startsWith(OUT + sep) && safe !== OUT) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const data = await readFile(safe);
    const ext = extname(safe).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    try {
      const fb = await readFile(join(OUT, '404.html'));
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fb);
    } catch {
      res.writeHead(404);
      res.end('404');
    }
  }
});

server.listen(PORT, () => {
  console.log(`e2e server on http://localhost:${PORT} (serving ${OUT})`);
});
