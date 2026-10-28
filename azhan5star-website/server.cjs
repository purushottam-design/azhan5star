#!/usr/bin/env node
'use strict';
// Small local-only server. No packages or external services are needed.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const ROOT = __dirname;
const HOST = '127.0.0.1';
const PORT = Number(process.env.AZHAN_PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.m4v': 'video/mp4',
  '.webm': 'video/webm', '.mov': 'video/quicktime', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf'
};

function resolveRequest(rawUrl) {
  const rawPath = String(rawUrl || '/').split('?')[0];
  let decoded;
  try { decoded = decodeURIComponent(rawPath); } catch { return null; }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  if (decoded.split('/').some(segment => segment === '..' || segment.startsWith('.'))) return null;
  const pagePath = /^\/partnership\/?$/.test(decoded) ? '/partnership.html' : decoded;
  const file = path.resolve(ROOT, '.' + (pagePath === '/' ? '/index.html' : pagePath));
  const relative = path.relative(ROOT, file);
  if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) return null;
  // Scripts used by the local tooling need not be exposed by a static web server.
  if (relative === 'server.cjs' || relative === 'package.json' || relative.startsWith('tools' + path.sep)) return null;
  return file;
}

function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value || '');
  if (!match || (!match[1] && !match[2]) || size === 0) return null;
  let start = match[1] ? Number(match[1]) : null;
  let end = match[2] ? Number(match[2]) : size - 1;
  if (start === null) { start = Math.max(0, size - end); end = size - 1; }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

function createServer() {
  return http.createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'no-cache');
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
    // Keep relative page assets correct when the clean route has a trailing slash.
    if (String(req.url).split('?')[0] === '/partnership/') {
      const query = String(req.url).includes('?') ? String(req.url).slice(String(req.url).indexOf('?')) : '';
      res.writeHead(302, { Location: '/partnership' + query }); res.end(); return;
    }
    const file = resolveRequest(req.url);
    if (!file) { res.writeHead(403); res.end('Forbidden'); return; }
    fs.realpath(file, (realError, actual) => {
      const relative = actual ? path.relative(ROOT, actual) : '';
      if (realError || relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
        res.writeHead(404); res.end('File not found'); return;
      }
      fs.stat(actual, (error, stat) => {
        if (error || !stat.isFile()) { res.writeHead(404); res.end('File not found'); return; }
        const headers = { 'Content-Type': TYPES[path.extname(actual).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
        let range;
        if (req.headers.range) {
          range = parseRange(req.headers.range, stat.size);
          if (!range) { res.writeHead(416, { ...headers, 'Content-Range': 'bytes */' + stat.size }); res.end(); return; }
          headers['Content-Range'] = 'bytes ' + range.start + '-' + range.end + '/' + stat.size;
          headers['Content-Length'] = range.end - range.start + 1;
        } else headers['Content-Length'] = stat.size;
        res.writeHead(range ? 206 : 200, headers);
        if (req.method === 'HEAD') { res.end(); return; }
        const stream = fs.createReadStream(actual, range || {});
        stream.on('error', () => res.destroy());
        res.on('close', () => stream.destroy());
        stream.pipe(res);
      });
    });
  });
}

function openBrowser(url) {
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => console.log('Open this address in your browser: ' + url));
  child.unref();
}

if (require.main === module) {
  const server = createServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? 'Port ' + PORT + ' is already in use. Try opening http://' + HOST + ':' + PORT + ' or set AZHAN_PORT to another port.' : error.message);
    process.exitCode = 1;
  });
  server.listen(PORT, HOST, () => {
    const url = 'http://' + HOST + ':' + PORT;
    console.log('AZHAN5STAR website: ' + url + '\nKeep this window open. Press Ctrl+C to stop.');
    if (process.argv.includes('--open')) openBrowser(url);
  });
}
module.exports = { createServer, resolveRequest, parseRange };
