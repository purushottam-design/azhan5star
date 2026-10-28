#!/usr/bin/env node
'use strict';

/** Import original, authorized local media. Uses Node's standard library only. */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, 'js', 'media-data.js');
const DESTINATION = path.join(ROOT, 'media', 'imported');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.m4v', '.mov']);
const PROFILE = { handle: 'azhan5star', url: 'https://www.instagram.com/azhan5star/', displayName: 'Azhan' };

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

function parseMediaData(source) {
  // Only comments followed by a literal JSON assignment are accepted. Never eval a config.
  const start = /^(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$))*window\.AZHAN_MEDIA\s*=\s*/.exec(source);
  if (!start) throw new Error('media-data.js must contain window.AZHAN_MEDIA = { ...JSON... };');
  const data = JSON.parse(source.slice(start[0].length).trim().replace(/;\s*$/, ''));
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Media config must be an object.');
  if (!Array.isArray(data.reels) || !Array.isArray(data.photos)) throw new Error('Media config must have reels and photos arrays.');
  return data;
}

function safeName(name) {
  const stem = path.basename(name, path.extname(name))
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 58).toLowerCase();
  return stem || 'media';
}

async function sha256(file) {
  const digest = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) digest.update(chunk);
  return digest.digest('hex');
}

async function discover(directory) {
  const files = [];
  async function visit(current) {
    const entries = await fsp.readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink() || entry.name.startsWith('.')) continue;
      // Avoid recursively re-importing generated copies when a parent folder is selected.
      if (isWithin(DESTINATION, full)) continue;
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext)) files.push(full);
      }
    }
  }
  await visit(directory);
  return files;
}

async function existingHashes(items) {
  const hashes = new Set();
  for (const item of items) {
    if (typeof item.sha256 === 'string' && /^[a-f0-9]{64}$/.test(item.sha256)) {
      hashes.add(item.sha256);
      continue;
    }
    if (typeof item.src !== 'string' || /^(?:[a-z]+:|\/\/)/i.test(item.src)) continue;
    const local = path.resolve(ROOT, item.src);
    if (!isWithin(ROOT, local)) continue;
    try {
      if ((await fsp.stat(local)).isFile()) hashes.add(await sha256(local));
    } catch { /* Existing externally hosted items need not have local files. */ }
  }
  return hashes;
}

async function importMedia(folder, options = {}) {
  const source = await fsp.realpath(path.resolve(folder));
  if (!(await fsp.stat(source)).isDirectory()) throw new Error('Select a folder containing original image/video files.');
  if (isWithin(DESTINATION, source)) throw new Error('Choose your original media folder, not media/imported.');

  let previous = null;
  try { previous = parseMediaData(await fsp.readFile(CONFIG, 'utf8')); }
  catch (error) {
    if (options.append && error.code !== 'ENOENT') throw new Error('Cannot append safely: ' + error.message);
  }
  const files = await discover(source);
  if (!files.length) throw new Error('No supported image or video files found. Nothing was changed.');
  const reels = options.append && previous ? [...previous.reels] : [];
  const photos = options.append && previous ? [...previous.photos] : [];
  const known = await existingHashes([...reels, ...photos]);
  const added = { reels: 0, photos: 0, duplicates: 0, mov: 0 };
  await fsp.mkdir(DESTINATION, { recursive: true });

  for (const file of files) {
    const hash = await sha256(file);
    if (known.has(hash)) { added.duplicates++; continue; }
    known.add(hash);
    const ext = path.extname(file).toLowerCase();
    let basename = safeName(file) + '-' + hash.slice(0, 16) + ext;
    let output = path.join(DESTINATION, basename);
    try {
      if (await sha256(output) !== hash) {
        basename = safeName(file) + '-' + hash + ext;
        output = path.join(DESTINATION, basename);
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    // The destination is content-derived; repeated imports reuse unchanged files.
    try { await fsp.copyFile(file, output, fs.constants.COPYFILE_EXCL); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    const isVideo = VIDEO_EXTENSIONS.has(ext);
    const list = isVideo ? reels : photos;
    const title = (isVideo ? 'Reel ' : 'Photo ') + String(list.length + 1).padStart(2, '0');
    const item = {
      id: (isVideo ? 'video-' : 'image-') + hash.slice(0, 16),
      type: isVideo ? 'video' : 'image',
      src: 'media/imported/' + basename,
      title,
      sha256: hash
    };
    if (!isVideo) item.alt = title + ' — @azhan5star media collection';
    if (ext === '.mov') {
      item.compatibilityNote = 'MOV playback depends on the codec and browser. Convert to H.264 MP4 if it does not play.';
      added.mov++;
    }
    list.push(item);
    added[isVideo ? 'reels' : 'photos']++;
  }

  const data = {
    profile: { ...PROFILE, ...(previous && previous.profile && typeof previous.profile === 'object' ? previous.profile : {}) },
    reels,
    photos,
    coverage: {
      mode: options.append && previous ? 'mixed' : 'local',
      note: 'Contains the local files selected for this import. This is not verification of the complete Instagram account archive.',
      localReelsAdded: added.reels,
      localPhotosAdded: added.photos,
      duplicateFilesSkipped: added.duplicates
    }
  };
  await fsp.mkdir(path.dirname(CONFIG), { recursive: true });
  const temporary = CONFIG + '.tmp-' + process.pid;
  await fsp.writeFile(temporary, '/* Local media manifest. Edit values as JSON; do not insert JavaScript expressions. */\nwindow.AZHAN_MEDIA = ' + JSON.stringify(data, null, 2) + ';\n', 'utf8');
  await fsp.rename(temporary, CONFIG);
  return { added, total: { reels: reels.length, photos: photos.length }, data };
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node tools/import-media.cjs "C:\\path\\to\\original-media" [--append]\n\nDefault: replace the gallery manifest with this folder.\n--append: preserve the current gallery and append new unique files.\nOriginal files are copied; the source folder is never modified.');
    return;
  }
  const flags = args.filter(arg => arg.startsWith('--'));
  const inputs = args.filter(arg => !arg.startsWith('--'));
  if (flags.some(flag => flag !== '--append') || inputs.length !== 1) throw new Error('Use one folder path and optional --append. Run with --help for examples.');
  const result = await importMedia(inputs[0], { append: args.includes('--append') });
  console.log('Imported ' + result.added.reels + ' reels and ' + result.added.photos + ' photos.');
  console.log('Skipped ' + result.added.duplicates + ' identical files. Gallery: ' + result.total.reels + ' reels, ' + result.total.photos + ' photos.');
  if (result.added.mov) console.log('Note: ' + result.added.mov + ' MOV file(s) may need H.264 MP4 conversion for your browser.');
  console.log('Saved js/media-data.js. Open or refresh the website to see the collection.');
}

if (require.main === module) main().catch(error => { console.error('Import stopped: ' + error.message); process.exitCode = 1; });
module.exports = { parseMediaData, safeName, isWithin, sha256, discover, importMedia };
