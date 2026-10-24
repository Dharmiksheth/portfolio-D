(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  // Split marked text into letters so they can animate one by one
  function splitChars(el) {
    var i = 0;
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      node.textContent.split('').forEach(function (c) {
        if (c === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
        var s = document.createElement('span');
        s.className = 'ch'; s.textContent = c; s.style.setProperty('--i', i++);
        frag.appendChild(s);
      });
      el.replaceChild(frag, node);
    });
    return el.querySelectorAll('.ch');
  }
  document.querySelectorAll('[data-split]').forEach(splitChars);
  document.querySelectorAll('.hero-tags > *').forEach(function (el, i) { el.style.setProperty('--i', i); });

  // Intro: preloader counts up once per visit, then the hero animates in
  var loaded = false;
  function intro() {
    if (loaded) return; loaded = true;
    document.body.classList.add('loaded');
  }
  var pre = document.querySelector('.preloader');
  var seen = false;
  try { seen = sessionStorage.getItem('ds-intro') === '1'; sessionStorage.setItem('ds-intro', '1'); } catch (e) {}
  if (!pre || reduce || seen) {
    if (pre) pre.classList.add('skip');
    requestAnimationFrame(function () { requestAnimationFrame(intro); });
    setTimeout(intro, 120);
  } else {
    var num = pre.querySelector('.pl-count span');
    var t0 = Date.now(), dur = 1100;
    var tick = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / dur);
      num.textContent = Math.round(100 * (1 - Math.pow(1 - k, 2)));
      if (k >= 1) {
        clearInterval(tick);
        pre.classList.add('done');
        setTimeout(intro, 350);
        setTimeout(function () { pre.classList.add('skip'); }, 1200);
      }
    }, 30);
  }

  // Mobile menu
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('nav-menu');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // Header: solid once scrolled, hides on scroll down, returns on scroll up
  var header = document.querySelector('.site-header');
  var lastY = window.scrollY;
  var darkZones = document.querySelectorAll('[data-dark]');
  var toTop = document.querySelector('.to-top');
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('scrolled', y > 20);
    var onDark = false;
    darkZones.forEach(function (z) { var r = z.getBoundingClientRect(); if (r.top <= 36 && r.bottom >= 36) onDark = true; });
    header.classList.toggle('dark', onDark);
    if (toTop) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      toTop.classList.toggle('show', y > 600);
      toTop.style.setProperty('--p', String(1 - (max > 0 ? y / max : 0)));
    }
    header.classList.toggle('hidden', y > 400 && y > lastY && !menu.classList.contains('open'));
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Section titles: letters fill in as the title scrolls through the screen
  var fills = [];
  document.querySelectorAll('[data-fill]').forEach(function (t) {
    if (reduce) return;
    fills.push({ el: t, chars: splitChars(t) });
  });
  function fillTitles() {
    var vh = window.innerHeight;
    fills.forEach(function (f) {
      var r = f.el.getBoundingClientRect();
      var p = (vh * 0.9 - r.top) / (vh * 0.5);
      var n = Math.round(Math.max(0, Math.min(1, p)) * f.chars.length);
      for (var i = 0; i < f.chars.length; i++) f.chars[i].classList.toggle('lit', i < n);
    });
  }
  if (fills.length) {
    window.addEventListener('scroll', fillTitles, { passive: true });
    window.addEventListener('resize', fillTitles);
    fillTitles();
  }

  // Count-up numbers
  function countUp(el) {
    var to = parseInt(el.getAttribute('data-to'), 10);
    if (reduce) { el.textContent = to; return; }
    var start = null;
    function step(t) {
      if (!start) start = t;
      var k = Math.min(1, (t - start) / 1400);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }

  // Reveal on scroll, plus one-off triggers (counters, drawing, contact title)
  var targets = document.querySelectorAll('.reveal, .drawing, .contact-title, .count, .sec-title, .squiggle');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.classList.contains('count')) countUp(el);
        else if (el.classList.contains('drawing')) el.classList.add('drawn');
        else el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el, i) {
      if (el.classList.contains('reveal')) el.style.transitionDelay = (i % 4) * 0.08 + 's';
      io.observe(el);
    });
  } else {
    targets.forEach(function (el) { el.classList.add('in', 'drawn'); });
  }

  // Showcase videos: silent preview on hover, click plays with sound (one at a time)
  var frames = document.querySelectorAll('.vframe');
  function stopAll(except) {
    frames.forEach(function (f) {
      if (f === except) return;
      var v = f.querySelector('video');
      v.pause(); v.muted = true;
      f.classList.remove('playing', 'previewing');
    });
  }
  frames.forEach(function (f) {
    var v = f.querySelector('video');
    var btn = f.querySelector('.vplay');
    function safePlay() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    if (window.matchMedia('(hover: hover)').matches && !reduce) {
      f.addEventListener('mouseenter', function () {
        if (f.classList.contains('playing')) return;
        stopAll(f); v.muted = true; f.classList.add('previewing'); safePlay();
      });
      f.addEventListener('mouseleave', function () {
        if (f.classList.contains('playing')) return;
        f.classList.remove('previewing'); v.pause(); v.currentTime = 0;
      });
    }
    f.addEventListener('click', function () {
      if (f.classList.contains('playing')) {
        v.pause(); f.classList.remove('playing'); btn.firstElementChild.textContent = '▶';
        btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace('Pause', 'Play'));
        return;
      }
      stopAll(f);
      f.classList.remove('previewing'); f.classList.add('playing');
      v.muted = false; v.currentTime = 0; safePlay();
      btn.firstElementChild.textContent = '❚❚';
      btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace('Play', 'Pause'));
    });
    v.addEventListener('ended', function () { f.classList.remove('playing'); });
  });

  // Fine-pointer extras: cursor dot and magnetic contact button
  if (window.matchMedia('(pointer: fine)').matches && !reduce) {
    var cursor = document.querySelector('.cursor');
    var cx = 0, cy = 0, tx = 0, ty = 0;
    window.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; cursor.classList.add('on'); });
    document.addEventListener('mouseleave', function () { cursor.classList.remove('on'); });
    (function loop() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cursor.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      requestAnimationFrame(loop);
    })();
    var label = cursor.querySelector('.cursor-label');
    document.querySelectorAll('a, button').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cursor.classList.add('big'); });
      el.addEventListener('mouseleave', function () { cursor.classList.remove('big'); });
    });
    document.querySelectorAll('[data-cursor]').forEach(function (el) {
      el.addEventListener('mouseenter', function () { label.textContent = el.getAttribute('data-cursor'); cursor.classList.add('label'); });
      el.addEventListener('mouseleave', function () { cursor.classList.remove('label'); });
    });

    // Spotlight glow that follows the mouse across cards
    document.querySelectorAll('.work-card, .feature').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    // Hero: glow and photo lean towards the mouse
    var hero = document.querySelector('.hero');
    var glow = document.querySelector('.hero-glow');
    if (hero && glow) {
      hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
        glow.style.transform = 'translate(' + dx * 60 + 'px,' + dy * 40 + 'px)';
      });
    }

    var magnet = document.querySelector('.magnet');
    if (magnet) {
      magnet.addEventListener('mousemove', function (e) {
        var r = magnet.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        magnet.style.transform = 'translate(' + x * 0.3 + 'px,' + y * 0.3 + 'px)';
        magnet.firstElementChild.style.transform = 'translate(' + x * 0.15 + 'px,' + y * 0.15 + 'px)';
      });
      magnet.addEventListener('mouseleave', function () {
        magnet.style.transform = ''; magnet.firstElementChild.style.transform = '';
      });
    }

    // Hero parallax: name and photo drift apart slightly as you scroll
    var photo = document.querySelector('.hero-photo img');
    var lines = document.querySelectorAll('.hero-name .line');
    window.addEventListener('scroll', function () {
      var y = Math.min(window.scrollY, window.innerHeight);
      if (photo) photo.style.transform = 'translateY(' + y * 0.12 + 'px)';
      lines.forEach(function (l, i) { l.style.transform = 'translateX(' + (i ? 1 : -1) * y * 0.15 + 'px)'; });
    }, { passive: true });
  }

  document.getElementById('year').textContent = new Date().getFullYear();
})();
