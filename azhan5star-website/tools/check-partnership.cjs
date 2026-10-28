'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { safeUrl, videoSource } = require('../js/partnership-media.js');
const { createServer, resolveRequest } = require('../server.cjs');
const root = path.resolve(__dirname, '..');

async function main() {
  for (const bad of ['javascript:alert(1)', 'data:text/html,bad', '//evil.test/video', 'https://user:password@example.com/', 'https://example.com/\nvideo']) {
    assert.equal(safeUrl(bad, true), '', bad);
  }
  assert.equal(safeUrl('/media/video.mp4', false), '');
  assert.equal(videoSource({ videoUrl: '/media/video.mp4' }).type, 'video');
  for (const url of ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/shorts/dQw4w9WgXcQ']) {
    assert.equal(videoSource({ videoUrl: url }).url, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  }
  assert.equal(videoSource({ videoUrl: 'https://www.instagram.com/reel/ABC_123/' }).url, 'https://www.instagram.com/reel/ABC_123/embed/');
  assert.match(videoSource({ videoUrl: 'https://www.facebook.com/watch/?v=1234' }).url, /^https:\/\/www.facebook.com\/plugins\/video.php\?/);
  assert.equal(videoSource({ videoUrl: 'https://evil.test/embed', videoType: 'embed' }, ['player.vimeo.com']).type, 'external');
  assert.equal(videoSource({ videoUrl: 'https://player.vimeo.com/video/123', videoType: 'embed' }, ['player.vimeo.com']).type, 'iframe');
  assert.equal(videoSource({ videoUrl: 'javascript:alert(1)' }), null);
  assert.equal(resolveRequest('/partnership'), path.join(root, 'partnership.html'));
  assert.equal(resolveRequest('/partnership/?test=1'), path.join(root, 'partnership.html'));
  assert.equal(resolveRequest('/%2e%2e/server.cjs'), null);
  const html = fs.readFileSync(path.join(root, 'partnership.html'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(home, /href="partnership\.html"[^>]*>Partnership/, 'Homepage links to partnership');
  assert.match(html, /href="partnership\.html"[^>]*aria-current="page"/, 'Partnership navigation marks current page');
  for (const shared of ['styles.css', 'vendor/three.min.js', 'js/scene.js', 'js/text-effects.js']) assert.ok(html.includes('"' + shared + '"'), 'Shared homepage asset: ' + shared);
  assert.ok(html.includes('class="hero-art p-collage"'), 'Shared floating portrait collage');
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'No duplicate IDs');
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), 'Anchor exists: ' + match[1]);
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (/^[a-z]+:/i.test(match[1])) continue;
    assert.ok(fs.existsSync(path.join(root, match[1].split('#')[0])), 'Asset exists: ' + match[1]);
  }
  const context = { window: {} };
  const nestedContext = { window: { location: { href: 'http://127.0.0.1:5500/azhan5star-website/partnership.html' } }, URL };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/partnership-media.js'), 'utf8'), nestedContext);
  assert.equal(nestedContext.window.PartnershipMedia.safeUrl('/media/video.mp4', true), '/azhan5star-website/media/video.mp4');
  assert.equal(nestedContext.window.PartnershipMedia.safeUrl('media/creator.jpg', true), '/azhan5star-website/media/creator.jpg');
  for (const alias of [path.join(root, 'partnership/index.html')]) {
    const aliasHtml = fs.readFileSync(alias, 'utf8');
    const target = /url=([^"\s]+)/.exec(aliasHtml)[1];
    assert.equal(path.resolve(path.dirname(alias), target), path.join(root, 'partnership.html'), 'Static redirect reaches the actual page');
  }
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/partnership-data.js'), 'utf8'), context);
  assert.ok(Array.isArray(context.window.AZHAN_PARTNERSHIP.creators));
  assert.ok(Array.isArray(context.window.AZHAN_PARTNERSHIP.collaborations));
  for (const file of ['partnership.js', 'partnership-media.js', 'partnership-data.js']) new vm.Script(fs.readFileSync(path.join(root, 'js', file), 'utf8'));
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    for (const url of ['/', '/partnership', '/partnership/', '/partnership.html', '/styles.css', '/navigation.css', '/partnership.css', '/js/partnership.js', '/js/partnership-media.js', '/js/partnership-data.js']) {
      const response = await fetch(base + url);
      assert.equal(response.status, 200, url);
      if (url.startsWith('/partnership') && !url.endsWith('.css')) assert.match(await response.text(), /id="partnership-title"/);
    }
    console.log('PASS: routing, assets, metadata, internal anchors, media providers, URL validation and content schema.');
  } finally { server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
