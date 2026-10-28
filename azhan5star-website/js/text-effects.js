(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var headings = document.querySelectorAll('#hero-title, #reels-title, #frames-title, #connect-title, [data-animated-text]');
  var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.classList.toggle('text-in-view', entry.isIntersecting);
    });
  }, { threshold: 0.15 }) : null;

  headings.forEach(function (heading) {
    // Keep the original line breaks, accent colors and decorative star intact.
    var walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        return node.parentElement.closest('[aria-hidden="true"]') || !node.textContent.trim()
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    var label = heading.cloneNode(true);
    label.querySelectorAll('[aria-hidden="true"]').forEach(function (el) { el.remove(); });
    label.querySelectorAll('br').forEach(function (br) { br.replaceWith(' '); });
    heading.setAttribute('aria-label', label.textContent.replace(/\s+/g, ' ').trim());

    var index = 0;
    nodes.forEach(function (node) {
      var fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { fragment.appendChild(document.createTextNode(part)); return; }
        var word = document.createElement('b');
        word.className = 'text-word';
        word.setAttribute('aria-hidden', 'true');
        Array.from(part).forEach(function (char) {
          var letter = document.createElement('i');
          letter.className = 'text-letter';
          letter.textContent = char;
          // Alternating directions make a deliberate, repeatable assembly.
          var direction = index % 4;
          letter.style.setProperty('--from-x', [-95, 70, -35, 55][direction] + '%');
          letter.style.setProperty('--from-y', [65, -90, -65, 95][direction] + '%');
          letter.style.setProperty('--from-turn', [-18, 15, 12, -14][direction] + 'deg');
          letter.style.setProperty('--letter-delay', (index % 24) * 28 + 'ms');
          word.appendChild(letter);
          index++;
        });
        fragment.appendChild(word);
      });
      node.replaceWith(fragment);
    });
    heading.classList.add('text-animated');
    if (observer) observer.observe(heading); else heading.classList.add('text-in-view');

    var letters = Array.from(heading.querySelectorAll('.text-letter'));
    var frame = 0;
    function clearLight() {
      cancelAnimationFrame(frame);
      frame = 0;
      letters.forEach(function (letter) {
        letter.style.removeProperty('--letter-light');
        letter.classList.remove('letter-lit');
      });
    }
    heading.addEventListener('pointermove', function (event) {
      if (event.pointerType !== 'mouse' || reduced.matches || document.documentElement.classList.contains('motion-off')) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        var radius = Math.min(180, Math.max(90, heading.clientWidth * .16));
        // Read all bounds before changing styles to avoid layout thrashing.
        var strengths = letters.map(function (letter) {
          var rect = letter.getBoundingClientRect();
          var distance = Math.hypot(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
          return Math.max(0, 1 - distance / radius);
        });
        letters.forEach(function (letter, i) {
          letter.style.setProperty('--letter-light', strengths[i].toFixed(3));
          letter.classList.toggle('letter-lit', strengths[i] > .35);
        });
        frame = 0;
      });
    });
    heading.addEventListener('pointerleave', clearLight);
    reduced.addEventListener('change', clearLight);
    new MutationObserver(function () {
      if (document.documentElement.classList.contains('motion-off')) clearLight();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  });
}());
