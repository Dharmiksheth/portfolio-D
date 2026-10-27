/* Portfolio chat assistant: floating button + panel that talks to /api/chat.
   Self-contained: if anything here fails, the rest of the site is unaffected.
   Conversation lives only in memory for this page view; nothing is stored. */
(function () {
  'use strict';

  var ENDPOINT = '/api/chat';
  var EMAIL = 'shethdharmik3@gmail.com';
  var MAX_LEN = 500;
  var MAX_HISTORY = 6;
  var CLIENT_TIMEOUT_MS = 25000;
  var FALLBACK = "Sorry, I can't answer right now. Email " + EMAIL;
  var RATE_LIMITED = "You've sent a lot of messages in a short time. Please wait a few minutes and try again, or email " + EMAIL;
  var GREETING = "Hi! I'm Dharmik's assistant. Ask me about his work, projects or how to reach him.";
  var SUGGESTIONS = ['What does Dharmik do?', 'What projects has he built?', 'How can I contact him?'];

  var history = [];   // [{ role: 'user' | 'model', text }]
  var busy = false;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Escape first, then add a small set of safe formatting: bold, bullets, links, paragraphs.
  function format(text) {
    var s = escapeHtml(text.trim());
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/^\s*[-*]\s+/gm, '• ');
    s = s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/(^|[\s(])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '$1<a href="mailto:$2">$2</a>');
    return s.split(/\n{2,}/).map(function (p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
  }

  var ICON_CHAT = '<svg class="dc-ico-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" stroke-width="2.6"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var ICON_MARK = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="20" cy="27" r="9" fill="none" stroke="#fff" stroke-width="4.5"/><path d="M29 9v18" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><path d="M27 34l7 7" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/></svg>';

  function init() {
    // Styles load here (not in <head>) so they never delay the first paint.
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'css/chat.css?v=20261028';
    document.head.appendChild(css);

    var launch = el('button', 'dc-launch', ICON_CHAT + ICON_X.replace('<svg ', '<svg class="dc-ico-close" '));
    launch.type = 'button';
    launch.setAttribute('aria-label', "Open chat with Dharmik's assistant");
    launch.setAttribute('aria-expanded', 'false');
    launch.setAttribute('aria-controls', 'dc-panel');

    var panel = el('section', 'dc-panel');
    panel.id = 'dc-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', "Ask Dharmik's assistant");
    panel.setAttribute('aria-hidden', 'true');

    var head = el('div', 'dc-head',
      '<span class="dc-avatar">' + ICON_MARK + '</span>' +
      '<div class="dc-title"><h2>Ask Dharmik\'s assistant</h2><p>AI · answers from this site</p></div>');
    var close = el('button', 'dc-x', ICON_X);
    close.type = 'button';
    close.setAttribute('aria-label', 'Close chat');
    head.appendChild(close);

    var log = el('div', 'dc-log');
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', 'polite');

    var chips = el('div', 'dc-chips');
    SUGGESTIONS.forEach(function (q) {
      var b = el('button', 'dc-chip');
      b.type = 'button';
      b.textContent = q;
      b.addEventListener('click', function () { send(q); });
      chips.appendChild(b);
    });

    var form = el('form', 'dc-form');
    form.setAttribute('novalidate', '');
    var input = el('input', 'dc-input');
    input.type = 'text';
    input.name = 'message';
    input.maxLength = MAX_LEN;
    input.autocomplete = 'off';
    input.placeholder = 'Ask a question…';
    input.setAttribute('aria-label', 'Your question');
    var sendBtn = el('button', 'dc-send', ICON_SEND);
    sendBtn.type = 'submit';
    sendBtn.setAttribute('aria-label', 'Send');
    form.appendChild(input);
    form.appendChild(sendBtn);

    panel.appendChild(head);
    panel.appendChild(log);
    panel.appendChild(chips);
    panel.appendChild(form);
    panel.hidden = true; launch.hidden = true; // show once styles are ready
    document.body.appendChild(panel);
    document.body.appendChild(launch);
    function reveal() { panel.hidden = false; launch.hidden = false; }
    css.addEventListener('load', reveal);
    setTimeout(reveal, 4000);

    addMessage('bot', GREETING);

    function setOpen(open) {
      panel.classList.toggle('open', open);
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      launch.setAttribute('aria-expanded', open ? 'true' : 'false');
      launch.setAttribute('aria-label', open ? 'Close chat' : "Open chat with Dharmik's assistant");
      if (open) setTimeout(function () { input.focus(); }, 60);
    }

    launch.addEventListener('click', function () { setOpen(!panel.classList.contains('open')); });
    close.addEventListener('click', function () { setOpen(false); launch.focus(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) { setOpen(false); launch.focus(); }
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });

    // Lets other parts of the page (e.g. project popups) open the chat with a question
    window.dcAsk = function (question) { setOpen(true); send(question); };

    function addMessage(who, text, isError) {
      var m = el('div', 'dc-msg ' + (who === 'user' ? 'dc-user' : 'dc-bot') + (isError ? ' dc-err' : ''), format(text));
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
      return m;
    }

    function showTyping() {
      var t = el('div', 'dc-msg dc-bot dc-typing', '<span></span><span></span><span></span>');
      t.setAttribute('role', 'status');
      t.setAttribute('aria-label', 'Assistant is typing');
      log.appendChild(t);
      log.scrollTop = log.scrollHeight;
      return t;
    }

    function setBusy(state) {
      busy = state;
      sendBtn.disabled = state;
      input.disabled = state;
      Array.prototype.forEach.call(chips.querySelectorAll('button'), function (b) { b.disabled = state; });
    }

    function send(raw) {
      var text = String(raw || '').trim();
      if (!text || busy) return;
      if (text.length > MAX_LEN) text = text.slice(0, MAX_LEN);

      chips.hidden = true;
      input.value = '';
      addMessage('user', text);
      setBusy(true);
      var typing = showTyping();

      var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, CLIENT_TIMEOUT_MS) : null;

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(-MAX_HISTORY) }),
        signal: ctrl ? ctrl.signal : undefined
      })
        .then(function (r) {
          if (r.status === 429) { var e = new Error('rate'); e.rate = true; throw e; }
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (data) {
          var reply = data && typeof data.reply === 'string' ? data.reply.trim() : '';
          if (!reply) throw new Error('Empty reply');
          typing.remove();
          addMessage('bot', reply);
          history.push({ role: 'user', text: text }, { role: 'model', text: reply.slice(0, MAX_LEN) });
          if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
        })
        .catch(function (err) {
          typing.remove();
          addMessage('bot', err && err.rate ? RATE_LIMITED : FALLBACK, true);
        })
        .then(function () {
          if (timer) clearTimeout(timer);
          setBusy(false);
          if (panel.classList.contains('open')) input.focus();
        });
    }
  }

  function safeInit() {
    try { init(); } catch (e) { /* never break the page */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safeInit);
  else safeInit();
})();
