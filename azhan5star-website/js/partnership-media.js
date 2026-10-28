(function (root) {
  'use strict';
  function safeUrl(value, local) {
    if (typeof value !== 'string' || !value.trim()) return '';
    if (/^[\\/]{2}|\\|[\u0000-\u001f]/.test(value)) return '';
    try {
      var url = new URL(value, 'https://local.invalid/');
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
      if (url.username || url.password) return '';
      if (url.hostname === 'local.invalid') {
        if (!local) return '';
        // Local content belongs to the website directory, including Live Server subfolders.
        var base = root.location ? new URL('.', root.location.href).pathname : '/';
        return base + url.pathname.replace(/^\//, '') + url.search;
      }
      return url.href;
    } catch (_) { return ''; }
  }
  function videoSource(item, embedHosts) {
    var raw = safeUrl(item.videoUrl, true);
    if (!raw) return null;
    var url = new URL(raw, 'https://local.invalid/');
    var host = url.hostname.replace(/^www\./, '');
    if (/\.(mp4|webm|m4v)$/i.test(url.pathname)) return { type: 'video', url: raw };
    var id;
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      id = url.searchParams.get('v') || (/^\/(shorts|embed)\/([^/]+)/.exec(url.pathname) || [])[2];
    }
    if (id && /^[\w-]{11}$/.test(id)) return { type: 'iframe', url: 'https://www.youtube-nocookie.com/embed/' + id };
    if (host === 'instagram.com') {
      var match = /^\/(reel|reels|p|tv)\/([\w-]+)/.exec(url.pathname);
      if (match) return { type: 'iframe', url: 'https://www.instagram.com/' + (match[1] === 'reels' ? 'reel' : match[1]) + '/' + match[2] + '/embed/' };
    }
    if (host === 'facebook.com' || host === 'm.facebook.com' || host === 'fb.watch') {
      return { type: 'iframe', url: 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(url.href) + '&show_text=false' };
    }
    if (item.videoType === 'embed' && (embedHosts || []).includes(url.hostname) && url.protocol === 'https:') return { type: 'iframe', url: url.href };
    return { type: 'external', url: raw };
  }
  var api = { safeUrl: safeUrl, videoSource: videoSource };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PartnershipMedia = api;
}(typeof window === 'undefined' ? globalThis : window));
