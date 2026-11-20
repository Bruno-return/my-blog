// 로컬 개발용 정적 파일 서버 (의존성 없음)
// 사용법: node serve.mjs [포트]   → http://localhost:8000

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.argv[2] || process.env.PORT || 8000);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

async function handle(req, res) {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = normalize(join(root, pathname));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
}

// 'localhost'가 IPv6(::1)로 먼저 풀리는 PC가 있어서 IPv4와 IPv6 둘 다에서 기다립니다.
// 두 주소 모두 이 컴퓨터 안에서만 접속할 수 있습니다.
let listening = 0;
for (const host of ['127.0.0.1', '::1']) {
  createServer(handle)
    .on('error', (err) => {
      if (host === '::1' && (err.code === 'EADDRNOTAVAIL' || err.code === 'EAFNOSUPPORT')) return; // IPv6를 끈 PC
      console.error(`${host}:${port}에서 서버를 시작하지 못했습니다: ${err.message}`);
      if (err.code === 'EADDRINUSE') console.error(`이미 ${port}번 포트를 쓰는 프로그램이 있습니다. 다른 포트로 실행해 보세요: node serve.mjs 3000`);
      process.exitCode = 1;
    })
    .listen(port, host, () => {
      if (++listening === 1) console.log(`블로그 서버 실행 중: http://localhost:${port}`);
    });
}
