#!/usr/bin/env node
'use strict';

// Focused integration checks: importer never evaluates config text, deduplicates
// originals safely, preserves entries in append mode, and server handles ranges.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Writable } = require('node:stream');
const { spawnSync } = require('node:child_process');

function request(server, requestPath, range) {
  return new Promise((resolve, reject) => {
    // Exercise the HTTP handler without opening a port in restricted runtimes.
    const chunks = [];
    const res = new Writable({ write(chunk, _encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
    res.headers = {};
    res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value; };
    res.writeHead = (status, headers = {}) => {
      res.status = status;
      for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
    };
    res.on('finish', () => resolve({ status: res.status, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    res.on('error', reject);
    server.emit('request', { method: 'GET', url: requestPath, headers: range ? { range } : {} }, res);
  });
}

async function main() {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'azhan-tools-'));
  let server;
  try {
    const project = path.join(temporary, 'site');
    const originals = path.join(temporary, 'original media');
    await fs.mkdir(path.join(project, 'tools'), { recursive: true });
    await fs.mkdir(path.join(project, 'js'), { recursive: true });
    await fs.mkdir(path.join(originals, 'nested'), { recursive: true });
    await fs.copyFile(path.join(__dirname, 'import-media.cjs'), path.join(project, 'tools', 'import-media.cjs'));
    await fs.copyFile(path.join(__dirname, '..', 'server.cjs'), path.join(project, 'server.cjs'));
    await fs.writeFile(path.join(originals, '001 portrait.jpg'), 'first-image-fixture');
    await fs.writeFile(path.join(originals, 'nested', 'same-image.jpg'), 'first-image-fixture');
    await fs.writeFile(path.join(originals, 'nested', '001 portrait.jpg'), 'second-image-fixture');
    await fs.writeFile(path.join(originals, '002 reel.mp4'), 'video-fixture');
    await fs.writeFile(path.join(originals, 'private.json'), '{"password":"must-not-be-imported"}');
    const { parseMediaData } = require(path.join(project, 'tools', 'import-media.cjs'));
    assert.throws(() => parseMediaData('window.AZHAN_MEDIA = (globalThis.executed = true);'));
    assert.throws(() => parseMediaData('window.AZHAN_MEDIA = {"reels":[],"photos":[]}; console.log("unexpected");'));
    assert.deepEqual(parseMediaData('/* header */\nwindow.AZHAN_MEDIA = {"reels":[],"photos":[]};'), { reels: [], photos: [] });

    let result = spawnSync(process.execPath, ['tools/import-media.cjs', originals], { cwd: project, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    let data = parseMediaData(await fs.readFile(path.join(project, 'js', 'media-data.js'), 'utf8'));
    assert.equal(data.reels.length, 1);
    assert.equal(data.photos.length, 2);
    assert.equal(data.coverage.duplicateFilesSkipped, 1);
    assert.notEqual(data.photos[0].src, data.photos[1].src);
    const originalsUnchanged = await fs.readFile(path.join(originals, '001 portrait.jpg'), 'utf8');
    assert.equal(originalsUnchanged, 'first-image-fixture');
    data.reels.unshift({ id: 'existing', type: 'instagram', sourceUrl: 'https://www.instagram.com/reel/EXAMPLE/' });
    await fs.writeFile(path.join(project, 'js', 'media-data.js'), 'window.AZHAN_MEDIA = ' + JSON.stringify(data) + ';');
    result = spawnSync(process.execPath, ['tools/import-media.cjs', originals, '--append'], { cwd: project, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    data = parseMediaData(await fs.readFile(path.join(project, 'js', 'media-data.js'), 'utf8'));
    assert.equal(data.reels.length, 2);
    assert.equal(data.reels[0].id, 'existing');
    assert.equal(data.photos.length, 2);

    await fs.writeFile(path.join(project, 'index.html'), '<h1>Fixture</h1>');
    await fs.writeFile(path.join(project, 'clip.mp4'), '0123456789');
    const { createServer } = require(path.join(project, 'server.cjs'));
    server = createServer();
    assert.equal((await request(server, '/')).status, 200);
    let response = await request(server, '/clip.mp4', 'bytes=2-5');
    assert.equal(response.status, 206);
    assert.equal(response.body, '2345');
    assert.equal(response.headers['content-range'], 'bytes 2-5/10');
    assert.equal(response.headers['content-type'], 'video/mp4');
    assert.equal((await request(server, '/clip.mp4', 'bytes=-3')).body, '789');
    assert.equal((await request(server, '/clip.mp4', 'bytes=20-30')).status, 416);
    assert.equal((await request(server, '/%2e%2e/private.json')).status, 403);
    assert.equal((await request(server, '/tools/import-media.cjs')).status, 403);
    assert.equal((await request(server, '/bad%ZZ')).status, 403);
    console.log('PASS: safe JSON parsing, nested imports, content deduplication, append preservation, source integrity, video byte ranges and traversal rejection.');
  } finally {
    if (server) server.removeAllListeners();
    await fs.rm(temporary, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
