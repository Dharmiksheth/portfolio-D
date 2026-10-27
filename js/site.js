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

  // Blur-in paragraphs: split into words that sharpen in sequence
  document.querySelectorAll('[data-blur]').forEach(function (el) {
    var i = 0;
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
          var sp = document.createElement('span'); sp.className = 'bw'; sp.textContent = w; sp.style.setProperty('--i', i++);
          frag.appendChild(sp);
        });
        el.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        node.classList.add('bw'); node.style.setProperty('--i', i++);
      }
    });
  });

  // Grow on scroll: the featured project scales up to full size as it enters
  var growers = document.querySelectorAll('[data-grow]');
  function grow() {
    var vh = window.innerHeight;
    growers.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.75)));
      el.style.setProperty('--g', (0.86 + 0.14 * p).toFixed(4));
      el.style.setProperty('--gp', p.toFixed(3));
    });
  }
  if (growers.length && !reduce) {
    window.addEventListener('scroll', grow, { passive: true });
    window.addEventListener('resize', grow);
    grow();
  }

  // Floating pill: appears after the hero, names the current section, opens a quick menu
  var pill = document.querySelector('.pill');
  if (pill) {
    var pillLabel = pill.querySelector('.pill-label');
    var pillBtn = pill.querySelector('.pill-menu');
    var sections = [['top', 'Home'], ['about', 'About'], ['services', 'Services'], ['process', 'Process'], ['work', 'Projects'], ['videos', 'Videos'], ['experience', 'Experience'], ['contact', 'Contact']]
      .map(function (p) { return { el: document.getElementById(p[0]), name: p[1] }; })
      .filter(function (p) { return p.el; });
    function setPill(open) {
      pill.classList.toggle('open', open);
      pillBtn.setAttribute('aria-expanded', String(open));
      pillBtn.setAttribute('aria-label', open ? 'Close quick menu' : 'Open quick menu');
    }
    pillBtn.addEventListener('click', function () { setPill(!pill.classList.contains('open')); });
    pill.addEventListener('click', function (e) { if (e.target.closest('.pill-links a')) setPill(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setPill(false); });
    function pillScroll() {
      var y = window.scrollY, mid = window.innerHeight * 0.4, name = 'Home';
      pill.classList.toggle('show', y > window.innerHeight * 0.6);
      sections.forEach(function (p) { if (p.el.getBoundingClientRect().top <= mid) name = p.name; });
      if (pillLabel.textContent !== name) pillLabel.textContent = name;
      if (y < window.innerHeight * 0.6) setPill(false);
    }
    window.addEventListener('scroll', pillScroll, { passive: true });
    pillScroll();
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
  var targets = document.querySelectorAll('.reveal, .drawing, .contact-title, .count, .sec-title, .squiggle, .sparkle, [data-blur], .giant-name');
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

  // Process: section stays pinned while steps, image and progress bar advance
  var track = document.querySelector('.proc-track');
  if (track && !reduce) {
    var pImgs = track.querySelectorAll('.proc-img');
    var pSteps = track.querySelectorAll('.proc-steps li');
    var pBar = track.querySelector('.proc-bar span');
    var pNum = track.querySelector('.proc-count b');
    var pCur = -1, pTick = false;
    function procUpdate() {
      pTick = false;
      var r = track.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var p = Math.max(0, Math.min(1, -r.top / (total > 0 ? total : 1)));
      pBar.style.width = (p * 100).toFixed(2) + '%';
      var i = Math.min(pSteps.length - 1, Math.floor(p * pSteps.length));
      if (i === pCur) return;
      pCur = i;
      for (var n = 0; n < pSteps.length; n++) {
        pSteps[n].classList.toggle('is-on', n === i);
        if (pImgs[n]) pImgs[n].classList.toggle('is-on', n === i);
      }
      pNum.textContent = ('0' + (i + 1)).slice(-2);
    }
    function procQueue() { if (!pTick) { pTick = true; requestAnimationFrame(procUpdate); } }
    window.addEventListener('scroll', procQueue, { passive: true });
    window.addEventListener('resize', procQueue);
    procUpdate();
  }

  // Contact form → Web3Forms (sends email to shethdharmik3@gmail.com)
  var cf = document.getElementById('cf');
  if (cf) {
    cf.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!cf.checkValidity()) { cf.reportValidity(); return; }
      var btn = document.getElementById('cf-submit');
      var status = document.getElementById('cf-status');
      // hCaptcha (spam protection): the widget adds this field once it has loaded
      var captcha = cf.querySelector('textarea[name="h-captcha-response"]');
      if (captcha && !captcha.value) {
        status.textContent = 'Please tick “I am human” before sending.';
        status.className = 'cf-status err';
        return;
      }
      btn.disabled = true;
      btn.classList.add('sending');
      status.textContent = 'Sending…';
      status.className = 'cf-status';
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: new FormData(cf)
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        btn.classList.remove('sending');
        if (data.success) {
          status.textContent = '✓ Message sent! I’ll get back to you soon.';
          status.className = 'cf-status ok';
          cf.reset();
          if (window.hcaptcha) { try { window.hcaptcha.reset(); } catch (err) {} }
        } else {
          status.textContent = '✕ Something went wrong. Please try emailing me directly.';
          status.className = 'cf-status err';
          if (window.hcaptcha) { try { window.hcaptcha.reset(); } catch (err) {} }
        }
      })
      .catch(function () {
        btn.disabled = false;
        btn.classList.remove('sending');
        status.textContent = '✕ Network error. Please try emailing me directly.';
        status.className = 'cf-status err';
      });
    });
  }

  // Project cards → details popup
  var pm = document.getElementById('project-modal');
  if (pm && typeof pm.showModal === 'function') {
    var pmBody = pm.querySelector('.pm-body');
    var pmTitle = '';
    var pmOpener = null;
    var ask = pm.querySelector('.pm-ask');
    function openProject(btn) {
      var tpl = document.getElementById(btn.getAttribute('data-project'));
      if (!tpl) return;
      pmBody.innerHTML = '';
      pmBody.appendChild(tpl.content.cloneNode(true));
      var h = pmBody.querySelector('h3');
      if (h) { h.id = 'pm-title'; pmTitle = h.textContent; }
      pmBody.scrollTop = 0;
      ask.hidden = typeof window.dcAsk !== 'function'; // chat widget loads after this file
      pmOpener = btn;
      pm.showModal();
    }
    document.querySelectorAll('.w-open').forEach(function (btn) {
      btn.addEventListener('click', function () { openProject(btn); });
    });
    pm.querySelector('.pm-close').addEventListener('click', function () { pm.close(); });
    pm.addEventListener('click', function (e) { if (e.target === pm) pm.close(); }); // click on backdrop
    pm.addEventListener('close', function () { if (pmOpener) pmOpener.focus(); });
    ask.addEventListener('click', function () {
      pm.close();
      if (typeof window.dcAsk === 'function') window.dcAsk('Tell me more about the ' + pmTitle + ' project.');
    });
  } else if (pm) {
    // Very old browsers without <dialog>: hide the buttons rather than show broken ones
    document.querySelectorAll('.w-open').forEach(function (b) { b.hidden = true; });
  }

  document.getElementById('year').textContent = new Date().getFullYear();
})();
