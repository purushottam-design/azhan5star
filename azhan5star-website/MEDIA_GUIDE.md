# Add the complete original media collection

The website shows reels first and photos afterwards. For a complete offline collection, add the original files you are authorized to use. A public Instagram profile URL alone does not supply a permanent downloadable archive of every post.

## Start the website

1. Extract the whole ZIP folder.
2. On Windows, double-click `start.bat`. On macOS/Linux, run `sh start.sh`.
3. If requested, install Node.js LTS from https://nodejs.org/ and try again. No `npm install` is needed.
4. Keep the terminal window open while using the website. Close it or press Ctrl+C to stop.

You can also open `index.html` directly for locally bundled assets. A local server is recommended for consistent browser behavior. Instagram embeds, if included, need internet and may depend on Instagram availability.

## Add videos and images

Put your original media in a separate folder, for example `C:\Users\You\Downloads\AzhanMedia`. You can also select the extracted media folder from an Instagram account export that the account owner has provided. The importer scans folders recursively; it does not read messages, passwords, contacts or export metadata.

Open a terminal inside this website folder and run:

```sh
node tools/import-media.cjs "C:\Users\You\Downloads\AzhanMedia"
```

macOS/Linux example:

```sh
node tools/import-media.cjs "/Users/you/Downloads/AzhanMedia"
```

The command copies the files into `media/imported/` and updates `js/media-data.js`. Your original folder is not changed. Refresh the website after importing.

**Default behavior:** the selected folder becomes the gallery. Old copied media files are left on disk, but entries not present in the new import disappear from the gallery.

To keep the current gallery and add only new unique media:

```sh
node tools/import-media.cjs "C:\Users\You\Downloads\MoreMedia" --append
```

Files with identical SHA-256 content are skipped. File names determine import order, so names like `001-intro.mp4`, `002-next.mp4`, `001-portrait.jpg` make your preferred order predictable. Reels and photos are always placed in separate sections.

### Supported files

| Category | Extensions |
| --- | --- |
| Photos | JPG, JPEG, PNG, WEBP, AVIF, GIF |
| Reels | MP4, WEBM, M4V, MOV |

For broad playback support, use MP4 with H.264 video and AAC audio. A MOV or other video container may contain a codec your browser cannot play; the importer does not transcode files. Convert incompatible originals separately before importing them.

## Set names, captions, posters and order

Open `js/media-data.js` in a text editor. Keep it as a single `window.AZHAN_MEDIA = { ... };` assignment containing valid JSON. Use double quotes; do not insert JavaScript code or trailing commas.

Each local video uses this shape:

```json
{
  "id": "your-unique-id",
  "type": "video",
  "src": "media/imported/your-file.mp4",
  "poster": "media/imported/your-poster.jpg",
  "title": "Your reel title",
  "sourceUrl": "https://www.instagram.com/azhan5star/"
}
```

The `poster` and `sourceUrl` fields are optional. A photo uses `"type": "image"` and should have an `alt` description. Move objects within `reels` or `photos` to change their order. Do not move photos into the reel list.

## Share or host the finished collection

After importing, zip the entire website folder again. Include `media/`, `js/`, `vendor/` and the other asset folders. Copy all frontend files together when deploying to a static host. This local server is a preview convenience and binds only to your own computer; it is not a public hosting service.

**Hinglish:** Pura offline media chahiye to account ke original videos aur photos folder me rakhein, import command chalayein, phir page refresh karein. Saari selected reels pehle aayengi, uske baad selected photos. Import ke liye Instagram login, password ya token ki zaroorat nahi hai.
