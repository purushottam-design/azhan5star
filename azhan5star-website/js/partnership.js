(function () {
  'use strict';
  var config = window.AZHAN_PARTNERSHIP || {};
  var media = window.PartnershipMedia;
  var $ = function (s) { return document.querySelector(s); };
  var creators = (config.creators || []).filter(function (c) { return c.published === true; });
  var collaborations = (config.collaborations || []).filter(function (c) {
    return c.published === true && creators.some(function (p) { return p.id === c.creatorId; }) && media.videoSource(c, config.embedHosts);
  });
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var motion = !reduced.matches;
  try { if (localStorage.getItem('azhan-motion') === 'off') motion = false; } catch (_) {}
  var modal = $('#collaboration-modal');
  var origin;
  var draftText = '';
  var statFrame = 0;
  var statsStarted = false;
  var targets = { creators: creators.length, collaborations: collaborations.length, platforms: new Set(collaborations.map(function (c) { return c.platform; })).size };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function external(text, url, cls) {
    var a = el('a', cls || 'p-small-link', text);
    var safe = media.safeUrl(url, false);
    if (!safe) { a.hidden = true; return a; }
    a.href = safe; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function creatorOf(item) { return creators.find(function (c) { return c.id === item.creatorId; }); }
  function image(src, alt, cls) {
    var safe = media.safeUrl(src, true);
    if (!safe) return null;
    var img = el('img', cls); img.src = safe; img.alt = alt; img.loading = 'lazy'; img.decoding = 'async';
    img.addEventListener('error', function () { img.hidden = true; });
    return img;
  }
  function CreatorIdentity(creator) {
    var box = el('div', 'p-creator');
    var img = image(creator.creatorImage, creator.creatorName || 'Creator');
    if (img) { img.width = 65; img.height = 65; box.appendChild(img); }
    else box.appendChild(el('span', 'p-avatar-fallback', (creator.creatorName || 'C').charAt(0)));
    var copy = el('div'); copy.appendChild(el('h3', '', creator.creatorName)); copy.appendChild(el('p', '', creator.username)); box.appendChild(copy);
    return box;
  }
  function PlatformIcon(platform) {
    var box = el('span', 'p-platform');
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(ns, 'path');
    var icons = { Instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm9 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM17 7h1', YouTube: 'M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm2 5 6 4-6 4Z', Facebook: 'M15 22V13h3l1-4h-4V7c0-2 1-2 4-2V2h-4c-3 0-5 2-5 5v2H7v4h3v9' };
    path.setAttribute('d', icons[platform] || 'M4 4h16v16H4Zm5 4 7 4-7 4Z'); svg.appendChild(path); box.appendChild(svg); box.appendChild(document.createTextNode(platform || 'Video'));
    return box;
  }
  function watchButton(item) {
    var creator = creatorOf(item);
    var button = el('button', 'p-thumbnail'); button.type = 'button'; button.setAttribute('aria-label', 'Watch ' + item.campaign + ' with ' + creator.creatorName);
    var poster = image(item.poster || creator.creatorImage, ''); if (poster) button.appendChild(poster);
    var play = el('span', 'p-play', '▶'); play.setAttribute('aria-hidden', 'true'); button.appendChild(play);
    button.addEventListener('click', function () { openVideo(item, button); }); return button;
  }
  function CollaborationVideoCard(item) {
    var creator = creatorOf(item);
    var card = el('article', 'p-card'); card.appendChild(CreatorIdentity(creator)); card.appendChild(watchButton(item));
    var body = el('div', 'p-card-body'); body.appendChild(PlatformIcon(item.platform)); body.appendChild(el('h3', '', item.campaign || 'Brand Collaboration')); body.appendChild(el('p', '', item.description));
    if (item.collaborationDate) { var date = el('time', '', item.collaborationDate); if (/^\d{4}-\d{2}(-\d{2})?$/.test(item.collaborationDate)) date.dateTime = item.collaborationDate; body.appendChild(date); }
    var actions = el('div', 'p-card-links'); var view = el('button', '', 'View Collaboration ↗'); view.type = 'button'; view.addEventListener('click', function () { openVideo(item, view); }); actions.appendChild(view); actions.appendChild(external('Creator Profile ↗', creator.socialUrl)); body.appendChild(actions); card.appendChild(body); return card;
  }
  function renderGallery(filter) {
    var items = collaborations.filter(function (item) {
      return filter === 'All' || filter === 'Featured' && item.featured === true || filter === 'Short Videos' && (item.shortVideo === true || /youtube\.com\/shorts\/|instagram\.com\/reels?\//i.test(item.videoUrl)) || item.platform === filter;
    });
    $('#collaboration-grid').replaceChildren.apply($('#collaboration-grid'), items.map(CollaborationVideoCard));
    var empty = $('#collaboration-empty'); empty.hidden = items.length > 0;
    empty.querySelector('h3').textContent = collaborations.length ? 'No collaborations in this category yet' : 'New Collaborations Coming Soon';
    empty.querySelector('p').textContent = collaborations.length ? 'Try another filter or become our next partner.' : 'We are continuously partnering with talented creators. Follow our journey and check back soon.';
    $('#collaboration-count').textContent = items.length + ' collaboration' + (items.length === 1 ? '' : 's') + (filter !== 'All' ? ' in ' + filter : '');
  }
  function FeaturedCollaboration(item) {
    var layout = el('article', 'p-featured-layout'); layout.appendChild(watchButton(item));
    var creator = creatorOf(item), copy = el('div', 'p-featured-copy'); copy.appendChild(CreatorIdentity(creator)); copy.appendChild(el('h3', '', item.campaign)); copy.appendChild(el('p', '', item.description)); copy.appendChild(PlatformIcon(item.platform));
    var buttons = el('div', 'p-buttons'); buttons.appendChild(external('View Creator Profile ↗', creator.socialUrl, 'pill'));
    var watch = el('button', 'pill p-primary', 'Watch Collaboration ↗'); watch.type = 'button'; watch.addEventListener('click', function () { openVideo(item, watch); }); buttons.appendChild(watch); copy.appendChild(buttons); layout.appendChild(copy); return layout;
  }
  function PartnerCard(creator) {
    var card = el('article', 'p-partner'); card.appendChild(CreatorIdentity(creator)); card.appendChild(el('p', '', creator.category || 'Content Creator')); card.appendChild(PlatformIcon(creator.platform));
    var count = collaborations.filter(function (c) { return c.creatorId === creator.id; }).length;
    card.appendChild(el('p', '', count + ' collaboration' + (count === 1 ? '' : 's') + (creator.followers ? ' · ' + creator.followers + ' followers' : ''))); card.appendChild(external('View Profile ↗', creator.socialUrl)); return card;
  }
  function openVideo(item, trigger) {
    var source = media.videoSource(item, config.embedHosts); if (!source) return;
    var creator = creatorOf(item); origin = trigger;
    $('#modal-creator').replaceChildren(CreatorIdentity(creator)); $('#modal-campaign').textContent = item.campaign; $('#modal-description').textContent = item.description; $('#modal-platform').replaceChildren(PlatformIcon(item.platform));
    var profile = media.safeUrl(creator.socialUrl, false), original = media.safeUrl(item.sourceUrl || item.videoUrl, false);
    $('#modal-social').hidden = !profile; if (profile) $('#modal-social').href = profile;
    $('#modal-original').hidden = !original; if (original) $('#modal-original').href = original;
    var player;
    if (source.type === 'video') { player = el('video'); player.src = source.url; player.controls = true; player.playsInline = true; player.preload = 'metadata'; var poster = media.safeUrl(item.poster, true); if (poster) player.poster = poster; }
    else if (source.type === 'iframe') { player = el('iframe'); player.src = source.url; player.title = item.campaign + ' — ' + creator.creatorName; player.allow = 'encrypted-media; fullscreen; picture-in-picture'; player.allowFullscreen = true; player.referrerPolicy = 'strict-origin-when-cross-origin'; }
    else { player = el('div'); player.appendChild(el('p', 'p-modal-description', 'Watch this collaboration on its original platform.')); player.appendChild(external('Watch Video ↗', source.url, 'pill')); }
    $('#modal-player').replaceChildren(player); modal.showModal(); document.body.style.overflow = 'hidden'; $('#modal-close').focus();
  }
  function cleanPlayer() {
    var video = $('#modal-player video'); if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
    $('#modal-player').replaceChildren(); document.body.style.overflow = ''; if (origin && origin.isConnected) origin.focus({ preventScroll: true });
  }
  $('#modal-close').addEventListener('click', function () { modal.close(); }); modal.addEventListener('close', cleanPlayer);
  modal.addEventListener('click', function (event) { if (event.target === modal) { var r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close(); } });
  document.addEventListener('visibilitychange', function () { if (document.hidden && modal.open) modal.close(); });
  document.querySelectorAll('[data-filter]').forEach(function (button) {
    button.addEventListener('click', function () { document.querySelectorAll('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); }); renderGallery(button.dataset.filter); });
  });
  renderGallery('All');
  var featured = collaborations.find(function (c) { return c.featured === true; });
  if (featured) $('#featured-collaboration').replaceChildren(FeaturedCollaboration(featured));
  creators.forEach(function (c) { $('#partner-grid').appendChild(PartnerCard(c)); }); $('#partners-empty').hidden = creators.length > 0;

  var form = $('#partnership-form');
  form.addEventListener('input', function (event) { if (event.target.setCustomValidity) event.target.setCustomValidity(''); });
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var status = $('#form-status'); status.dataset.error = 'false';
    ['fullName', 'city', 'idea'].forEach(function (name) { var input = form.elements[name]; input.setCustomValidity(input.value.trim() ? '' : 'Please enter ' + (name === 'fullName' ? 'your full name.' : name === 'city' ? 'your city.' : 'your collaboration idea.')); });
    var phone = form.elements.phone; phone.setCustomValidity(/^[+\d\s().-]{7,30}$/.test(phone.value.trim()) && phone.value.replace(/\D/g, '').length >= 7 ? '' : 'Please enter a valid phone number.');
    ['profile', 'youtube', 'facebook'].forEach(function (name) { var input = form.elements[name]; input.setCustomValidity(!input.value || media.safeUrl(input.value, false) ? '' : 'Please enter a complete http or https profile URL.'); });
    if (!form.reportValidity()) { status.dataset.error = 'true'; status.textContent = 'Please check the required fields and correct any highlighted details.'; return; }
    var values = new FormData(form), lines = ['PARTNERSHIP REQUEST', ''];
    Array.from(form.querySelectorAll('.p-field')).forEach(function (field) { var input = field.querySelector('input, select, textarea'); var label = field.querySelector('label').textContent.replace(/ \*$/, ''); lines.push(label + ': ' + (String(values.get(input.name) || '').trim() || 'Not provided')); });
    lines.push('', 'Consent: I agree to be contacted regarding partnership opportunities.'); draftText = lines.join('\n');
    var email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.contactEmail || '') ? config.contactEmail : 'azhan5star1@gmail.com';
    var mailto = 'mailto:' + email + '?subject=' + encodeURIComponent('Partnership request — ' + values.get('fullName')) + '&body=' + encodeURIComponent(draftText);
    $('#request-email').href = mailto; $('#request-email').hidden = false; $('#download-request').hidden = false;
    status.textContent = 'Your request is ready. Review and send it in your email app. If the app does not open, use the prepared email link or download your request and email it to ' + email + '. Your request has not been sent yet.';
    try { window.location.href = mailto; } catch (_) { status.textContent = 'Your request is ready, but your email app could not open. Use the prepared email link or download the request and send it to ' + email + '.'; }
  });
  $('#download-request').addEventListener('click', function () {
    if (!draftText) return;
    var url = URL.createObjectURL(new Blob([draftText], { type: 'text/plain;charset=utf-8' })); var a = el('a'); a.href = url; a.download = 'partnership-request.txt'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
  $('#submit-partnership').disabled = false;

  function finalStats() { cancelAnimationFrame(statFrame); document.querySelectorAll('[data-stat]').forEach(function (n) { n.textContent = targets[n.dataset.stat]; }); }
  function animateStats() {
    if (statsStarted) return; statsStarted = true; if (!motion) { finalStats(); return; }
    var start = performance.now();
    function frame(now) { var progress = Math.min(1, (now - start) / 850); document.querySelectorAll('[data-stat]').forEach(function (n) { n.textContent = Math.round(targets[n.dataset.stat] * (1 - Math.pow(1 - progress, 3))); }); if (progress < 1 && motion) statFrame = requestAnimationFrame(frame); }
    statFrame = requestAnimationFrame(frame);
  }
  function setMotion(enabled) {
    motion = enabled; document.documentElement.classList.toggle('motion-off', !motion);
    if (window.AzhanScene) window.AzhanScene.setMotion(motion);
    $('#motion-toggle').setAttribute('aria-pressed', String(motion)); $('#motion-toggle').setAttribute('aria-label', motion ? 'Turn animation off' : 'Turn animation on'); $('#motion-toggle .motion-label').textContent = motion ? 'Motion on' : 'Motion off'; if (!motion) finalStats();
  }
  $('#motion-toggle').addEventListener('click', function () { setMotion(!motion); try { localStorage.setItem('azhan-motion', motion ? 'on' : 'off'); } catch (_) {} }); reduced.addEventListener('change', function (e) { setMotion(!e.matches); }); setMotion(motion);
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) { entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add('visible'); if (entry.target.classList.contains('p-stats')) animateStats(); observer.unobserve(entry.target); } }); }, { threshold: .08 });
    document.querySelectorAll('.reveal, .p-stats').forEach(function (node) { observer.observe(node); });
  } else { document.querySelectorAll('.reveal').forEach(function (node) { node.classList.add('visible'); }); finalStats(); }
  var scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    var max = document.documentElement.scrollHeight - innerHeight;
    var progress = max > 0 ? Math.min(1, scrollY / max) : 0;
    $('#page-progress').style.transform = 'scaleX(' + progress + ')';
    $('.site-header').classList.toggle('scrolled', scrollY > 30);
    if (window.AzhanScene) {
      window.AzhanScene.setProgress(progress);
      var section = $('.p-final').getBoundingClientRect().top < innerHeight * .6 ? 'outro' : $('.p-hero').getBoundingClientRect().bottom > innerHeight * .4 ? 'hero' : 'reels';
      window.AzhanScene.setSection(section);
    }
  }
  addEventListener('scroll', function () { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }, { passive: true }); addEventListener('resize', updateScroll); updateScroll();
  $('#coverage-note').textContent = window.AZHAN_MEDIA && window.AZHAN_MEDIA.coverage ? window.AZHAN_MEDIA.coverage.note : 'Explore the selected Azhan5star media collection on the homepage.';
  $('#collection-info').addEventListener('click', function () { $('#info-dialog').showModal(); }); $('#info-close').addEventListener('click', function () { $('#info-dialog').close(); });
}());
