import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] ?? 8080);
const types = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.md': 'text/markdown',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon'
};

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('Porta inválida. Use um número de 0 a 65535.');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const fail = (status, message) => {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(message);
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(405, 'Método não permitido.');
  let path;
  try {
    const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    if (pathname.includes('\0')) return fail(400, 'Caminho inválido.');
    path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (path !== root && !path.startsWith(root + sep)) return fail(400, 'Caminho inválido.');
  } catch {
    return fail(400, 'Caminho inválido.');
  }
  try {
    const body = await readFile(path);
    const type = types[extname(path).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type + (/^(text\/|application\/json)/.test(type) ? '; charset=utf-8' : '') });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    fail(404, 'Arquivo não encontrado.');
  }
});

server.on('error', () => {
  console.error('Não foi possível iniciar o servidor. Verifique a porta.');
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Portfólio disponível em http://127.0.0.1:${server.address().port}`);
});
