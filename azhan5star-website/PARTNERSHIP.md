# Partnership page

Run `npm start` and visit `http://127.0.0.1:4173/partnership`.
All Partnership files are inside `azhan5star-website`. With VS Code Live Server serving the workspace on port 5500, use `http://127.0.0.1:5500/azhan5star-website/partnership/` or `http://127.0.0.1:5500/azhan5star-website/partnership.html`. If Live Server serves the website folder directly, `/partnership/` also works. Navigation uses relative `.html` links in either setup.
The homepage is preserved apart from the new navigation destination and its small-screen spacing stylesheet.

## Publishing content

Edit `js/partnership-data.js`. Both arrays are intentionally empty until real partnerships are supplied. Existing portfolio reels are not presented as confirmed company collaborations. Statistics are calculated from published content, not sample numbers.

Each collaboration references a creator by `creatorId`. Set `published: true` on both records to display a collaboration. Partner cards show only published creators. Unpublished records in this frontend file are still publicly downloadable: do not put private material here. A future database should return only publicly published records.

Example schema (replace all example values before publishing):

```js
window.AZHAN_PARTNERSHIP = {
  contactEmail: 'azhan5star1@gmail.com',
  embedHosts: ['player.vimeo.com'],
  creators: [{
    id: 'creator-1',
    published: false,
    creatorName: 'Creator Name',
    username: '@creator',
    creatorImage: '/media/partners/creator.jpg',
    category: 'Lifestyle Creator',
    platform: 'Instagram',
    socialUrl: 'https://www.instagram.com/creator/',
    // Optional verified display value:
    followers: '10K'
  }],
  collaborations: [{
    id: 'campaign-1',
    creatorId: 'creator-1',
    published: false,
    featured: true,
    shortVideo: true,
    campaign: 'Campaign Name',
    description: 'Describe the actual collaboration.',
    collaborationDate: '2026-10-28',
    platform: 'Instagram',
    videoUrl: '/media/partners/campaign.mp4',
    poster: '/media/partners/campaign-cover.jpg',
    sourceUrl: 'https://www.instagram.com/reel/REPLACE_WITH_REAL_ID/'
  }]
};
```

Use `platform: 'Instagram'`, `'YouTube'`, or `'Facebook'` for the platform filters. `shortVideo: true` includes an item in Short Videos. The first published record marked `featured: true` supplies the featured section.

## Media

- Local or HTTPS `.mp4`, `.webm`, `.m4v`: native controls, loaded only when the modal opens.
- Instagram `/reel/ID/` or `/p/ID/`: Instagram's embed.
- YouTube watch, `youtu.be`, `/shorts/ID`, `/embed/ID`: privacy-enhanced YouTube embed.
- Facebook video and `fb.watch`: Facebook's video plugin.
- Other providers: use a direct embeddable URL, `videoType: 'embed'`, and add its exact trusted hostname to `embedHosts`. Arbitrary HTML is never inserted.
- Unsupported URLs open through an explicit external Watch Video link.

Platforms can restrict embedding or require sign-in; the modal also offers the original link. No external video iframe is loaded before a visitor opens a collaboration. Videos are not autoplayed. Closing the modal, pressing Escape, or hiding the tab releases the player.

## Application form

This is a static frontend, with no submission service or storage backend. Required fields, profile URLs and phone numbers are validated. Submit prepares an email addressed to `contactEmail`. The visitor must send it in their mail app. The page clearly states that the request has not been sent, and provides a prepared-email link and text download as fallbacks. It does not store applicant information in local storage.

To enable direct submission later, replace the form's submit handler in `js/partnership.js` with an authenticated submission endpoint or a properly configured Supabase insert/RPC. Show a sent confirmation only after the service confirms acceptance. Keep server credentials out of frontend files. Upload management and an admin panel are not implemented.

## Structure and hosting

- `partnership.html`: page sections, original header/footer, metadata, accessible form and dialog.
- `partnership.css`: page-specific layout and responsive rules.
- `navigation.css`: compact navigation spacing below 420px for the extra link.
- `js/partnership-data.js`: public content source, replaceable with fetched data.
- `js/partnership-media.js`: URL validation and video provider handling.
- `js/partnership.js`: reusable `CollaborationVideoCard`, `PartnerCard`, `FeaturedCollaboration`, filters, modal, statistics and form.
- `server.cjs`: maps `/partnership` and `/partnership/` to the new page.

The static `partnership/index.html` alias redirects clean directory URLs to `partnership.html`. Shared assets and homepage links use relative URLs, supporting deployment under a subdirectory. Local data media paths resolve inside the website directory. Add a canonical URL and absolute `og:url`/`og:image` metadata once the production hostname is known.

## Verification

Run `node tools/check-partnership.cjs` for route, media provider, unsafe URL, schema, internal anchor and asset checks. No additional dependencies are needed.

Visual checks to perform when a browser is available: 320, 375, 425, 768, 1024, 1440 and 1920px; keyboard focus and Escape; filters with published records; native form validation; motion toggle; and video shutdown on modal close. Actual external playback depends on the provider and connection.
