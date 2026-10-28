(function () {
  'use strict';
  var data = window.AZHAN_MEDIA || { profile: {}, reels: [], photos: [] };
  var reels = Array.isArray(data.reels) ? data.reels : [];
  var photos = Array.isArray(data.photos) ? data.photos : [];
  var $ = function (selector) { return document.querySelector(selector); };
  var $$ = function (selector) { return Array.from(document.querySelectorAll(selector)); };
  var clamp = function (value, min, max) { return Math.max(min, Math.min(max, value)); };
  var pad = function (value) { return String(value).padStart(2, '0'); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motion = !reduced.matches;
  try { if (localStorage.getItem('azhan-motion') === 'off') motion = false; } catch (_) {}
  var muted = true;
  var activeIndex = -1;
  var stageVisible = false;
  var currentSection = '';
  var pendingFrame = 0;
  var modalOpen = false;
  var cards = [];
  var dots = [];
  var videos = [];
  var userPaused = new Set();
  var reelsSection = $('#reels');
  var deck = $('#reel-deck');
  var stepper = $('#reel-stepper');
  var viewer = $('#viewer');
  var viewerType = 'image';
  var viewerIndex = 0;
  var viewerOrigin = null;
  var toastTimer;

  function create(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }
  function safeLink(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try { var url = new URL(value, location.href); return /^(https?:)$/.test(url.protocol) ? url.href : ''; } catch (_) { return ''; }
  }
  function localMedia(value) {
    if (typeof value !== 'string' || !value || /^[a-z]+:/i.test(value) || value.startsWith('//') || value.includes('..')) return '';
    return value;
  }
  function link(href, className, label) {
    var el = create('a', className, label);
    el.href = safeLink(href) || 'https://www.instagram.com/azhan5star/';
    el.target = '_blank'; el.rel = 'noopener noreferrer';
    return el;
  }
  function toast(message) {
    clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('show');
    toastTimer = setTimeout(function () { $('#toast').classList.remove('show'); }, 3500);
  }
  function titleOf(item, fallback) { return item.title || item.alt || fallback; }
  function playLabel(index) {
    var button = cards[index] && cards[index].querySelector('.play-toggle');
    var video = videos[index];
    if (button && video) { button.textContent = video.paused ? '▶ Play' : 'Ⅱ Pause'; button.setAttribute('aria-label', (video.paused ? 'Play ' : 'Pause ') + titleOf(reels[index], 'reel')); }
  }
  function loadVideo(index) {
    var video = videos[index];
    if (video && !video.getAttribute('src')) { video.src = video.dataset.src; video.load(); }
    return video;
  }
  function pauseAll() { videos.forEach(function (v) { if (v) v.pause(); }); }
  function playActive(manual) {
    if (!stageVisible || modalOpen || document.hidden || activeIndex < 0) return;
    if (!manual && (!motion || userPaused.has(activeIndex))) return;
    var index = activeIndex;
    var video = loadVideo(index);
    if (!video) return;
    video.muted = muted;
    var promise = video.play();
    if (promise) promise.then(function () {
      if (index !== activeIndex || !stageVisible || modalOpen || document.hidden || userPaused.has(index) || (!manual && !motion)) video.pause();
    }).catch(function () { playLabel(index); });
  }
  function buildReels() {
    $('#reel-total').textContent = pad(reels.length);
    reelsSection.style.height = Math.max(170, reels.length * 85 + 75) + 'svh';
    reelsSection.style.minHeight = '0';
    if (!reels.length) {
      deck.appendChild(create('p', 'empty-state', 'The reel collection is waiting for its next story.'));
      $('#reel-current').textContent = '00'; $('#reel-prev').disabled = true; $('#reel-next').disabled = true;
      return;
    }
    reels.forEach(function (item, index) {
      var src = localMedia(item.src);
      var poster = localMedia(item.poster);
      var card = create('article', 'reel-card');
      card.dataset.playable = String(!!src);
      card.setAttribute('aria-label', 'Reel ' + (index + 1) + ': ' + titleOf(item, 'Reel'));
      if (poster) {
        var image = create('img', 'reel-poster'); image.src = poster; image.alt = ''; image.width = item.width || 720; image.height = item.height || 1280; image.loading = index === 0 ? 'eager' : 'lazy';
        card.appendChild(image);
      }
      var video = null;
      if (src) {
        video = create('video'); video.dataset.src = src; video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'none'; if (poster) video.poster = poster;
        video.setAttribute('aria-label', titleOf(item, 'Video reel'));
        var fallback = link(item.sourceUrl, '', 'Watch this reel on Instagram'); video.appendChild(fallback);
        video.addEventListener('play', function () { playLabel(index); });
        video.addEventListener('pause', function () { playLabel(index); });
        video.addEventListener('timeupdate', function () { var progress = card.querySelector('.video-progress span'); if (progress && video.duration) progress.style.transform = 'scaleX(' + (video.currentTime / video.duration) + ')'; });
        video.addEventListener('error', function () {
          if (!card.querySelector('.media-error')) {
            var error = create('div', 'media-error'); error.appendChild(link(item.sourceUrl, 'text-link', 'Video unavailable — open original ↗')); card.appendChild(error);
          }
        });
        card.appendChild(video);
      }
      videos.push(video);
      var top = create('div', 'reel-card-top');
      top.appendChild(create('span', 'card-tag' + (src ? ' lime-tag' : ''), src ? '▶ REEL / ' + pad(index + 1) : '↗ ON INSTAGRAM'));
      if (src) { var expand = create('button', 'card-expand', '⛶'); expand.type = 'button'; expand.setAttribute('aria-label', 'Open reel player'); expand.addEventListener('click', function () { openVideo(index, expand); }); top.appendChild(expand); }
      card.appendChild(top);
      if (!src) { var external = link(item.sourceUrl, 'reel-link-overlay', '↗'); external.setAttribute('aria-label', 'Watch ' + titleOf(item, 'this reel') + ' on Instagram'); card.appendChild(external); }
      var caption = create('div', 'reel-caption');
      var handle = create('div', 'card-handle');
      var avatarPath = localMedia(data.profile && data.profile.avatar);
      if (avatarPath) { var avatar = create('img'); avatar.src = avatarPath; avatar.alt = ''; avatar.width = 19; avatar.height = 19; handle.appendChild(avatar); }
      handle.appendChild(create('span', '', '@azhan5star')); caption.appendChild(handle);
      caption.appendChild(create('h3', '', titleOf(item, 'Reel ' + (index + 1))));
      var controls = create('div', 'caption-controls');
      if (src) {
        var toggle = create('button', 'play-toggle', '▶ Play'); toggle.type = 'button';
        toggle.addEventListener('click', function () {
          if (!video.paused) { userPaused.add(index); video.pause(); }
          else { userPaused.delete(index); playActive(true); }
        });
        controls.appendChild(toggle);
      } else { controls.appendChild(link(item.sourceUrl, 'play-toggle', 'Open on Instagram ↗')); }
      if (item.sourceUrl && src) controls.appendChild(link(item.sourceUrl, 'source-link', 'Original ↗'));
      caption.appendChild(controls); card.appendChild(caption);
      if (src) { var progress = create('div', 'video-progress'); progress.appendChild(create('span')); card.appendChild(progress); }
      deck.appendChild(card); cards.push(card);
      var dot = create('button', 'reel-dot'); dot.type = 'button'; dot.setAttribute('aria-label', 'Go to reel ' + (index + 1)); dot.addEventListener('click', function () { jumpToReel(index); }); stepper.appendChild(dot); dots.push(dot);
    });
  }
  function buildPhotos() {
    var grid = $('#photo-grid');
    var stillsOnly = photos.length > 0 && photos.every(function (p) { return p.sourceType === 'reel_still'; });
    $('#frames-count').textContent = pad(photos.length) + (stillsOnly ? ' REEL STILLS' : ' IMAGES');
    $('#frames-description').textContent = stillsOnly ? 'A closer look at the moments. Original covers from the reel collection.' : 'A closer look at the moments. Explore the image collection.';
    if (!photos.length) { grid.appendChild(create('p', 'empty-state', 'New frames will appear here when added to the collection.')); return; }
    photos.forEach(function (item, index) {
      var figure = create('figure', 'photo-card reveal');
      var button = create('button', 'photo-button'); button.type = 'button'; button.setAttribute('aria-label', 'Enlarge ' + titleOf(item, 'image ' + (index + 1)));
      var img = create('img'); img.src = localMedia(item.src); img.alt = item.alt || titleOf(item, 'Image from the collection'); img.width = item.width || 720; img.height = item.height || 1280; img.loading = 'lazy'; img.decoding = 'async';
      img.addEventListener('error', function () { button.appendChild(create('span', 'media-error', 'Image unavailable')); });
      button.appendChild(img);
      button.appendChild(create('span', 'photo-label', item.sourceType === 'reel_still' ? 'REEL STILL' : 'PHOTOGRAPH'));
      button.appendChild(create('span', 'photo-open', '↗'));
      button.addEventListener('click', function () { openImage(index, button); }); figure.appendChild(button);
      var caption = create('figcaption'); caption.appendChild(create('span', 'photo-number', '/' + pad(index + 1)));
      var title = create('span', 'photo-title', titleOf(item, 'Frame ' + (index + 1))); title.appendChild(create('span', 'photo-type', item.sourceType === 'reel_still' ? 'FROM THE REEL COLLECTION' : 'IMAGE COLLECTION')); caption.appendChild(title); figure.appendChild(caption); grid.appendChild(figure);
    });
  }
  function setActive(index, visible) {
    var changed = activeIndex !== index;
    var visibilityChanged = stageVisible !== visible;
    stageVisible = visible;
    if (changed) {
      activeIndex = index; pauseAll();
      cards.forEach(function (card, i) {
        var current = i === index;
        card.setAttribute('aria-hidden', String(!current)); card.inert = !current;
        card.style.pointerEvents = current ? 'auto' : 'none';
        dots[i].setAttribute('aria-current', String(current));
      });
      $('#reel-current').textContent = index >= 0 ? pad(index + 1) : '00';
      $('#reel-prev').disabled = index <= 0;
      $('#reel-next').disabled = index >= reels.length - 1;
    }
    if (!visible) { if (changed || visibilityChanged) pauseAll(); }
    else if (changed || visibilityChanged) playActive(false);
  }
  function update() {
    pendingFrame = 0;
    var h = window.innerHeight;
    var scroll = window.scrollY;
    var max = document.documentElement.scrollHeight - h;
    var progress = max > 0 ? clamp(scroll / max, 0, 1) : 0;
    $('#page-progress').style.transform = 'scaleX(' + progress + ')';
    $('.site-header').classList.toggle('scrolled', scroll > 50);
    var rect = reelsSection.getBoundingClientRect();
    var reelProgress = clamp(-rect.top / Math.max(1, rect.height - h), 0, 1);
    var position = reelProgress * Math.max(0, reels.length - 1);
    var index = reels.length ? clamp(Math.round(position), 0, reels.length - 1) : -1;
    var visible = rect.top < h * .25 && rect.bottom > h * .65;
    setActive(index, visible);
    var cardWidth = cards[0] ? cards[0].offsetWidth : 300;
    cards.forEach(function (card, i) {
      var delta = i - (motion ? position : index);
      var distance = Math.abs(delta);
      var offset = delta * cardWidth * .68;
      var scale = 1 - Math.min(distance, 3) * .115;
      card.style.transform = 'translate(-50%, -50%) translate3d(' + offset.toFixed(2) + 'px,' + (distance * 26).toFixed(2) + 'px,' + (-distance * 130).toFixed(2) + 'px) rotateY(' + (-delta * 19).toFixed(2) + 'deg) rotateZ(' + (delta * 6).toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
      card.style.opacity = distance > 2.7 ? '0' : String(clamp(1 - distance * .34, 0, 1));
      card.style.filter = 'brightness(' + clamp(1 - distance * .31, .3, 1).toFixed(3) + ')';
      card.style.zIndex = String(20 - Math.round(distance * 4));
      card.style.visibility = distance > 3 ? 'hidden' : 'visible';
    });
    var photoTop = $('#photos').getBoundingClientRect().top;
    var connectTop = $('#connect').getBoundingClientRect().top;
    var section = connectTop < h * .5 ? 'outro' : photoTop < h * .55 ? 'photos' : rect.top < h * .7 ? 'reels' : 'hero';
    if (window.AzhanScene) {
      window.AzhanScene.setProgress(progress);
      if (currentSection !== section) window.AzhanScene.setSection(section);
    }
    if (currentSection !== section) {
      currentSection = section;
      $$('[data-nav]').forEach(function (el) { el.classList.toggle('active', el.dataset.nav === (section === 'outro' ? 'connect' : section)); });
    }
  }
  function requestUpdate() { if (!pendingFrame) pendingFrame = requestAnimationFrame(update); }
  function jumpToReel(index) {
    if (!reels.length) return;
    index = clamp(index, 0, reels.length - 1);
    var top = window.scrollY + reelsSection.getBoundingClientRect().top;
    var distance = reelsSection.offsetHeight - window.innerHeight;
    var target = top + (reels.length > 1 ? index / (reels.length - 1) * distance : 0) + 1;
    window.scrollTo({ top: target, behavior: motion ? 'smooth' : 'auto' });
  }
  function setMotion(enabled) {
    motion = enabled;
    document.documentElement.classList.toggle('motion-off', !motion);
    $('#motion-toggle').setAttribute('aria-pressed', String(motion));
    $('#motion-toggle').setAttribute('aria-label', motion ? 'Turn animation off' : 'Turn animation on');
    $('#motion-toggle .motion-label').textContent = motion ? 'Motion on' : 'Motion off';
    if (window.AzhanScene) window.AzhanScene.setMotion(motion);
    if (!motion) { pauseAll(); if (heroArt) resetHeroTilt(); } else playActive(false);
    requestUpdate();
  }
  function lockModal() { modalOpen = true; pauseAll(); document.body.style.overflow = 'hidden'; }
  function unlockModal() {
    modalOpen = false; document.body.style.overflow = '';
    var v = $('#viewer-content video'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
    $('#viewer-content').replaceChildren();
    if (viewerOrigin && viewerOrigin.isConnected) viewerOrigin.focus({ preventScroll: true });
    playActive(false);
  }
  function setViewerSource(item) {
    var a = $('#viewer-source'); a.hidden = !safeLink(item.sourceUrl); if (!a.hidden) a.href = safeLink(item.sourceUrl);
  }
  function renderImage() {
    var item = photos[viewerIndex]; if (!item) return;
    var img = create('img'); img.src = localMedia(item.src); img.alt = item.alt || titleOf(item, 'Image');
    $('#viewer-content').replaceChildren(img);
    $('#viewer-caption').textContent = pad(viewerIndex + 1) + ' / ' + pad(photos.length) + ' — ' + titleOf(item, 'Image') + (item.sourceType === 'reel_still' ? ' · Reel still' : '');
    $('#viewer-prev').hidden = photos.length < 2; $('#viewer-next').hidden = photos.length < 2;
    setViewerSource(item);
  }
  function openImage(index, origin) {
    viewerType = 'image'; viewerIndex = index; viewerOrigin = origin; lockModal(); renderImage(); viewer.showModal(); $('#viewer-close').focus();
  }
  function openVideo(index, origin) {
    var item = reels[index]; if (!item || !localMedia(item.src)) return;
    viewerType = 'video'; viewerOrigin = origin; lockModal();
    var video = create('video'); video.src = localMedia(item.src); video.controls = true; video.playsInline = true; video.muted = muted; video.preload = 'metadata'; if (localMedia(item.poster)) video.poster = item.poster;
    $('#viewer-content').replaceChildren(video); $('#viewer-caption').textContent = titleOf(item, 'Reel');
    $('#viewer-prev').hidden = true; $('#viewer-next').hidden = true; setViewerSource(item); viewer.showModal(); $('#viewer-close').focus();
    var promise = video.play(); if (promise) promise.catch(function () {});
  }
  function changeImage(delta) { if (viewerType !== 'image' || !photos.length) return; viewerIndex = (viewerIndex + delta + photos.length) % photos.length; renderImage(); }

  buildReels(); buildPhotos();
  var note = data.coverage && data.coverage.note;
  $('#coverage-note').textContent = note || 'This selected collection presents locally supplied media. Visit the Instagram profile for the full account.';
  // Hero portraits stay independent of the reel cover collection.
  var heroArt = $('.hero-art');
  var heroTiltFrame = 0;
  function resetHeroTilt() {
    cancelAnimationFrame(heroTiltFrame);
    heroTiltFrame = 0;
    heroArt.style.removeProperty('transform');
  }
  heroArt.addEventListener('pointermove', function (event) {
    if (!motion || event.pointerType !== 'mouse') return;
    var bounds = heroArt.getBoundingClientRect();
    var x = clamp((event.clientX - bounds.left) / bounds.width - .5, -.5, .5);
    var y = clamp((event.clientY - bounds.top) / bounds.height - .5, -.5, .5);
    cancelAnimationFrame(heroTiltFrame);
    heroTiltFrame = requestAnimationFrame(function () {
      heroArt.style.transform = 'perspective(1100px) rotateX(' + (-y * 7) + 'deg) rotateY(' + (x * 9) + 'deg)';
      heroTiltFrame = 0;
    });
  });
  heroArt.addEventListener('pointerleave', resetHeroTilt);
  $('#reel-prev').addEventListener('click', function () { jumpToReel(activeIndex - 1); });
  $('#reel-next').addEventListener('click', function () { jumpToReel(activeIndex + 1); });
  $$('a[href="#reels"]').forEach(function (anchor) { anchor.addEventListener('click', function (event) { event.preventDefault(); jumpToReel(0); }); });
  $('#sound-toggle').setAttribute('aria-label', 'Turn video sound on');
  $('#sound-toggle').addEventListener('click', function () {
    muted = !muted; $('#sound-toggle').setAttribute('aria-pressed', String(!muted)); $('#sound-toggle span').textContent = muted ? 'Sound off' : 'Sound on';
    $('#sound-toggle').setAttribute('aria-label', muted ? 'Turn video sound on' : 'Turn video sound off');
    videos.forEach(function (v) { if (v) v.muted = muted; });
    playActive(true);
    if (!videos[activeIndex]) toast(muted ? 'Sound off for local videos.' : 'Sound on for local videos. This reel opens on Instagram.');
  });
  $('#motion-toggle').addEventListener('click', function () { setMotion(!motion); try { localStorage.setItem('azhan-motion', motion ? 'on' : 'off'); } catch (_) {} });
  reduced.addEventListener('change', function (event) { setMotion(!event.matches); });
  $('#viewer-close').addEventListener('click', function () { viewer.close(); });
  viewer.addEventListener('close', unlockModal);
  viewer.addEventListener('click', function (event) { if (event.target === viewer || event.target === $('#viewer-content')) viewer.close(); });
  $('#viewer-prev').addEventListener('click', function () { changeImage(-1); });
  $('#viewer-next').addEventListener('click', function () { changeImage(1); });
  document.addEventListener('keydown', function (event) {
    if (viewer.open && viewerType === 'image') {
      if (event.key === 'ArrowLeft') { event.preventDefault(); changeImage(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); changeImage(1); }
    }
  });
  $('#collection-info').addEventListener('click', function () { viewerOrigin = $('#collection-info'); lockModal(); $('#info-dialog').showModal(); });
  $('#info-close').addEventListener('click', function () { $('#info-dialog').close(); });
  $('#info-dialog').addEventListener('close', unlockModal);
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) { entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }); }, { threshold: .08, rootMargin: '0px 0px -25px 0px' });
    $$('.reveal').forEach(function (el) { observer.observe(el); });
  } else { $$('.reveal').forEach(function (el) { el.classList.add('visible'); }); }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  window.addEventListener('pageshow', requestUpdate);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseAll(); else playActive(false); });
  setMotion(motion); update();
}());
