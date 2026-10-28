# AZHAN 5STAR — A world in motion

A responsive, animated portfolio for [@azhan5star](https://www.instagram.com/azhan5star/). Scroll through the reel deck first, then continue into the image gallery. The package contains the website source, bundled Three.js and fonts, available original media, and tools for adding more local media.

## Open the website

1. **Extract the entire ZIP** into a folder. Do not open the website from inside the ZIP viewer.
2. **Quick preview:** double-click `index.html`. Its classic scripts and bundled assets can load directly from the extracted folder.
3. **Preferred Windows preview:** install Node.js 18 or newer if needed, then double-click `start.bat`. It starts the local website and opens your browser.
4. On macOS/Linux, run `sh start.sh`. You can also run `npm start` in the extracted folder on any supported system. **No `npm install` is needed.**

The local address is `http://127.0.0.1:4173`. Keep the terminal open while viewing the website. Press Ctrl+C to stop. If that port is already occupied, close the earlier server or set the `AZHAN_PORT` environment variable to another port.

## What is included

| Content | Included in this package |
| --- | --- |
| Reel cards in the scroll sequence | 6 |
| Locally playable original MP4 reels | 3 |
| Additional reel cards linking to Instagram | 3 |
| Original reel covers/stills in the image gallery | 6 |
| Profile avatar | 1 |
| Standalone photo posts downloaded | 0 |

**This is a selected collection, not the complete Instagram account archive.** The public profile embed supplied six reel entries. Three individual official embeds supplied playable video files; the other three did not provide video files. Those cards show their genuine covers and open the original Instagram post. They are not presented as locally playable videos.

The six gallery images are authentic **reel covers/stills**, not a set of separate photo posts. They are labeled “REEL STILL” in the interface. The three MP4 files, six covers, profile avatar, fonts, and Three.js script are local assets. The three Instagram-only reels and external profile/source links require internet and depend on Instagram availability.

Source details and retrieval evidence are recorded in `media-research.json`. The website’s current collection is defined in `js/media-data.js`. Media was retrieved on **27 October 2026**. The website does not automatically synchronize future Instagram posts.

## Experience and controls

- **Three.js scene:** a rotating, beveled five-point star with supporting orbit details and particles; the camera responds to scrolling and pointer movement. A styled fallback keeps the page usable when WebGL is unavailable.
- **Reels before images:** the pinned reel deck advances as you scroll, with counters, previous/next controls, and direct reel selectors. Continue scrolling past the final reel to reach the image gallery.
- **Local video playback:** the active local reel starts muted when the browser permits autoplay. Use Play/Pause as needed; click **Sound off** to enable sound. Playback stops when a local reel becomes inactive.
- **Expanded player:** open the reel player for browser video controls.
- **Image lightbox:** click a gallery image to enlarge it, then use the previous/next controls or keyboard arrows. Escape closes the viewer.
- **Motion controls:** use **Motion on/off** in the header. The page also respects the system’s reduced-motion preference.
- **Responsive layout:** the composition and controls adapt to desktop and smaller screens.

## Add the rest of the original collection

Place the original photos and videos you want to include in a separate folder. The importer accepts nested folders, including extracted media folders from an account-owner-provided Instagram export. It scans media files without reading messages or unrelated export metadata.

From inside the extracted website folder, run:

```sh
node tools/import-media.cjs "C:\Users\You\Downloads\AzhanMedia"
```

This makes the selected folder the gallery, copies the files into `media/imported/`, and updates `js/media-data.js`. Your original files remain unchanged. Refresh the website afterwards. Existing copied files are retained on disk, but their old gallery entries are replaced unless they appear in the new import.

To retain the current six-card collection and append new unique originals, run:

```sh
node tools/import-media.cjs "C:\Users\You\Downloads\MoreMedia" --append
```

The importer skips content-identical files by SHA-256 and orders files deterministically by name. Prefix filenames with `001-`, `002-`, etc. for a predictable order. Videos always appear in the reels section, followed by the image section. MOV playback depends on its codec; use H.264 MP4 with AAC audio for broad browser compatibility. The importer copies files and does not transcode them.

See `MEDIA_GUIDE.md` for supported formats and additional examples.

### Edit titles, order and image labels

`js/media-data.js` is a single `window.AZHAN_MEDIA = { ... };` assignment containing valid JSON. Keep double-quoted property names and values, with no executable expressions or trailing commas. Change `title`, `alt`, and optional `poster` / `sourceUrl` values, or move entries within the `reels` and `photos` arrays to reorder them.

The image gallery uses the `sourceType` field to distinguish reel stills:

```json
{
  "id": "my-reel-still",
  "type": "image",
  "src": "media/imported/my-still.jpg",
  "title": "A moment from the reel",
  "alt": "Describe what is visible in this frame",
  "sourceType": "reel_still"
}
```

Use `"sourceType": "photo"` for a standalone photograph. Imported image entries have no `sourceType` by default and receive the photograph label; add `"sourceType": "reel_still"` when importing reel covers or extracted frames.

## Put the website on a static host

Upload `index.html`, `styles.css`, and the complete `js/`, `media/`, `assets/`, and `vendor/` folders together. Keep their relative paths unchanged. Preserve `vendor/THREE-LICENSE.txt` with the bundled library. No build step, database, API key, or Node server is required for static hosting. The provided Node server is only a convenient local preview.

After adding originals, zip the full website folder again so the updated manifest and local media travel together. This delivered package has not been publicly deployed.

## Validation and rendering note

The importer/server checks can be run with:

```sh
node tools/check-tools.cjs
```

These checks cover safe manifest parsing, nested imports, deduplication, append behavior, source integrity, video byte ranges, and path handling.

Browser review checked the desktop layout, a 390 × 844 mobile layout and an 844 × 390 landscape layout. Local video playback, pausing, inactive-video suspension, the expanded video player, image enlargement and next-image navigation were exercised. The imported asset references and the three MP4s and seven JPEGs were validated.

The cloud browser used for review has WebGL disabled, so the actual Three.js GPU-rendered scene could not be visually verified there. The code includes a graceful fallback for that condition. Open the package on a browser/device with WebGL enabled to view the 3D scene.
