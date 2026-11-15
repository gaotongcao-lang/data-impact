// Like, comment and share for project and blog pages.
// - A floating rail (right edge on desktop, bottom bar on phones) keeps the three actions in reach while reading.
// - The same three actions also sit at the end of the content.
// - Comments open in a side panel (bottom sheet on phones), so readers never have to scroll to the end.
// Talks to the data-impact-api Worker (source: /api/worker.js in the repo).
(() => {
  const API = 'https://data-impact-api.gaotongcao.workers.dev';
  const TURNSTILE_SITEKEY = ''; // public site key; leave empty to hide the anti-bot widget

  const page = location.pathname.replace(/^\/+|\/+$/g, '');
  if (!/^(projects|blog)\/[a-z0-9-]+$/.test(page)) return;
  const anchor = document.querySelector('.project-pager');
  if (!anchor) return;

  const visitor = (() => {
    const make = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    try {
      let v = localStorage.getItem('di-visitor');
      if (!v) { v = make(); localStorage.setItem('di-visitor', v); }
      return v;
    } catch (e) { return make(); }
  })();

  const ICON = {
    like: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3l-1.2-1.1C5.8 14.7 2.7 11.9 2.7 8.4c0-2.8 2.2-5 5-5 1.6 0 3.2.8 4.3 2 1.1-1.2 2.7-2 4.3-2 2.8 0 5 2.2 5 5 0 3.5-3.1 6.3-8.1 10.8L12 20.3z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6c5 0 9 3.4 9 7.6s-4 7.6-9 7.6c-1 0-1.9-.1-2.8-.4L4.6 20.5l.9-3.9C3.9 15.2 3 13.3 3 11.2c0-4.2 4-7.6 9-7.6z"/><circle cx="8.2" cy="11.3" r="1.1"/><circle cx="12" cy="11.3" r="1.1"/><circle cx="15.8" cy="11.3" r="1.1"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 4.8l7.6 6.7-7.6 6.7v-3.8c-4.6 0-7.9 1.4-10.3 4.8.8-5.6 4-9.8 10.3-10.6V4.8z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  };

  const style = document.createElement('style');
  style.textContent = `
    /* Action group under the title, styled like the site's [ buttons ] */
    .eg-group { display: inline-flex; height: 48px; border: 1px solid var(--ink); }
    .eg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-width: 64px; padding: 0 14px; background: none; border: 0; color: var(--ink); font: 14px var(--mono, monospace); cursor: pointer; transition: background .15s, color .15s; }
    .eg-btn + .eg-btn { border-left: 1px solid var(--ink); }
    .eg-btn svg { width: 20px; height: 20px; display: block; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linejoin: round; stroke-linecap: round; flex: none; }
    .eg-btn svg circle { fill: currentColor; stroke: none; }
    .eg-btn:hover, .eg-btn:focus-visible { background: var(--ink); color: var(--bg); }
    .eg-btn[aria-pressed="true"] svg { fill: #ff3d6e; stroke: #ff3d6e; animation: eg-pop .3s ease; }
    .eg-btn:disabled { opacity: .45; cursor: default; }
    @keyframes eg-pop { 50% { transform: scale(1.3); } }
    .hero-base .actions { align-items: center; }

    /* Floating rail on the right while reading (bottom bar on phones) */
    .eg-rail { position: fixed; z-index: 40; right: 16px; top: 50%; background: var(--bg); transform: translate(calc(100% + 24px), -50%); transition: transform .3s ease; }
    .eg-rail.on { transform: translate(0, -50%); }
    .eg-rail .eg-group { flex-direction: column; height: auto; }
    .eg-rail .eg-btn { flex-direction: column; gap: 4px; width: 58px; min-width: 0; height: 62px; padding: 0; font-size: 11px; }
    .eg-rail .eg-btn + .eg-btn { border-left: 0; border-top: 1px solid var(--ink); }
    .eg-rail .eg-btn svg { width: 22px; height: 22px; }
    .eg-rail .lbl { display: none; }

    /* Share menu */
    .eg-menu { position: fixed; z-index: 60; min-width: 210px; padding: 6px 0; background: #fff; border: 1px solid #000; }
    .eg-menu[hidden] { display: none; }
    .eg-menu a, .eg-menu button { display: block; width: 100%; padding: 10px 16px; text-align: left; font: 13px var(--mono, monospace); color: #000; background: none; border: 0; cursor: pointer; }
    .eg-menu a:hover, .eg-menu button:hover { background: #000; color: #fff; }
    .eg-toast { position: fixed; z-index: 70; left: 50%; bottom: 88px; transform: translateX(-50%); padding: 10px 16px; background: #000; color: #fff; font: 13px var(--mono, monospace); opacity: 0; pointer-events: none; transition: opacity .2s; }
    .eg-toast.on { opacity: 1; }

    /* Comments panel */
    .eg-shade { position: fixed; inset: 0; z-index: 80; background: rgba(0, 0, 0, .35); opacity: 0; transition: opacity .25s; }
    .eg-shade.on { opacity: 1; }
    .eg-panel { position: fixed; z-index: 90; top: 0; right: 0; bottom: 0; width: min(440px, 100vw); display: flex; flex-direction: column; background: #fff; color: #000; border-left: 1px solid #000; transform: translateX(100%); transition: transform .3s ease; --ink: #000; --bg: #fff; --muted: #5c5c5c; --line: rgba(0, 0, 0, .16); }
    .eg-panel.on { transform: none; }
    .eg-panel[hidden], .eg-shade[hidden] { display: none; }
    .eg-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--line); }
    .eg-head h2 { font-size: 18px; font-weight: 700; letter-spacing: -.02em; }
    .eg-head h2 .n { font-size: 13px; font-weight: 400; color: var(--muted); margin-left: 8px; }
    .eg-close { width: 36px; height: 36px; display: grid; place-items: center; background: none; border: 0; color: #000; cursor: pointer; }
    .eg-close svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; }
    .eg-list { flex: 1; overflow-y: auto; list-style: none; margin: 0; padding: 4px 20px; overscroll-behavior: contain; }
    .eg-list li { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--line); }
    .eg-list li.eg-empty { display: block; text-align: center; color: var(--muted); font-size: 13px; padding: 48px 0; border: 0; }
    .eg-ava { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: #000; color: #fff; font-size: 14px; font-weight: 700; text-transform: uppercase; }
    .eg-name { font-size: 13px; font-weight: 700; }
    .eg-body { margin-top: 4px; font-size: 14px; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
    .eg-date { margin-top: 6px; font-size: 11px; color: var(--muted); }
    .eg-form { border-top: 1px solid #000; padding: 12px 20px 16px; background: #fff; }
    .eg-form input, .eg-form textarea { display: block; width: 100%; padding: 10px 12px; border: 1px solid var(--line); background: #fff; color: #000; font: 14px/1.5 var(--mono, monospace); border-radius: 0; outline: none; }
    .eg-form input:focus, .eg-form textarea:focus { border-color: #000; }
    .eg-form textarea { margin-top: 8px; min-height: 72px; max-height: 40vh; resize: vertical; }
    .eg-form .hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
    .eg-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; }
    .eg-note { font-size: 12px; color: var(--muted); min-height: 1.4em; }
    .eg-post { height: 38px; padding: 0 22px; background: #000; color: #fff; border: 1px solid #000; font: 13px var(--mono, monospace); cursor: pointer; flex: none; }
    .eg-post:hover { background: #fff; color: #000; }
    .eg-post:disabled { opacity: .5; cursor: default; }

    /* Phones: bottom bar and bottom sheet */
    @media (max-width: 760px) {
      .hero-base .actions .eg-group { flex: 1 1 100%; }
      .hero-base .actions .eg-btn { flex: 1; }
      .eg-rail { top: auto; bottom: 0; left: 0; right: 0; padding-bottom: env(safe-area-inset-bottom); transform: translateY(110%); }
      .eg-rail.on { transform: none; }
      .eg-rail .eg-group { display: flex; width: 100%; flex-direction: row; border-width: 1px 0 0; }
      .eg-rail .eg-btn { flex: 1; flex-direction: row; gap: 8px; width: auto; height: 52px; font-size: 13px; }
      .eg-rail .eg-btn + .eg-btn { border-top: 0; border-left: 1px solid var(--ink); }
      body.eg-has-rail footer { padding-bottom: 72px; }
      .eg-panel { top: auto; left: 0; width: 100%; height: 78vh; height: 78dvh; border-left: 0; border-top: 1px solid #000; transform: translateY(100%); }
    }
    @media (prefers-reduced-motion: reduce) { .eg-rail, .eg-panel, .eg-shade { transition: none; } .eg-btn[aria-pressed="true"] svg { animation: none; } }
  `;
  document.head.appendChild(style);

  const el = (tag, attrs = {}, text) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
  };
  const enc = encodeURIComponent;

  // Action buttons (built twice: end-of-content bar and floating rail)
  const likeBtns = [], commentBtns = [], shareBtns = [];
  function actions() {
    const group = el('div', { class: 'eg-group', role: 'group', 'aria-label': 'Like, comment and share' });
    const like = el('button', { class: 'eg-btn', type: 'button', 'aria-pressed': 'false', title: 'Like' });
    like.innerHTML = ICON.like + '<span class="n">0</span>';
    const comment = el('button', { class: 'eg-btn', type: 'button', title: 'Comments', 'aria-haspopup': 'dialog' });
    comment.innerHTML = ICON.comment + '<span class="n">0</span>';
    const share = el('button', { class: 'eg-btn', type: 'button', title: 'Share', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-label': 'Share' });
    share.innerHTML = ICON.share + '<span class="lbl">Share</span>';
    group.append(like, comment, share);
    likeBtns.push(like); commentBtns.push(comment); shareBtns.push(share);
    return group;
  }

  // Under the title: in the hero's action area, next to the existing button
  const top = actions();
  const base = document.querySelector('.hero-base');
  if (base) {
    let box = base.querySelector('.actions');
    if (!box) { box = el('div', { class: 'actions' }); base.appendChild(box); }
    box.prepend(top);
  } else {
    anchor.parentNode.insertBefore(top, anchor);
  }

  const rail = el('aside', { class: 'eg-rail', 'aria-label': 'Like, comment and share' });
  rail.appendChild(actions());
  document.body.appendChild(rail);
  document.body.classList.add('eg-has-rail');

  // The rail appears once the buttons under the title have scrolled out of view
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => rail.classList.toggle('on', !e.isIntersecting && e.boundingClientRect.top < 0)).observe(top);
  } else rail.classList.add('on');

  // Toast for short messages
  const toast = el('div', { class: 'eg-toast', role: 'status', 'aria-live': 'polite' });
  document.body.appendChild(toast);
  let toastTimer;
  const flash = msg => { toast.textContent = msg; toast.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('on'), 2200); };

  // Share menu
  const title = document.title.replace(/\s+—\s+Data\^Impact$/, '');
  const shareUrl = location.origin + location.pathname;
  const menu = el('div', { class: 'eg-menu', role: 'menu', hidden: '' });
  const addItem = (node, fn) => { node.setAttribute('role', 'menuitem'); node.addEventListener('click', () => { if (fn) fn(); closeMenu(); }); menu.appendChild(node); };
  addItem(el('button', { type: 'button' }, 'Copy link'), async () => {
    try { await navigator.clipboard.writeText(shareUrl); flash('Link copied'); }
    catch (e) { window.prompt('Copy this link:', shareUrl); }
  });
  if (navigator.share) addItem(el('button', { type: 'button' }, 'More options…'), () => navigator.share({ title, url: shareUrl }).catch(() => {}));
  for (const [name, href] of [
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`],
    ['X (Twitter)', `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(title)}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`],
    ['Email', `mailto:?subject=${enc(title)}&body=${enc(shareUrl)}`],
  ]) addItem(el('a', { href, target: name === 'Email' ? '_self' : '_blank', rel: 'noopener' }, name));
  document.body.appendChild(menu);
  let menuFor = null;
  function closeMenu() { menu.hidden = true; if (menuFor) menuFor.setAttribute('aria-expanded', 'false'); menuFor = null; }
  function openMenu(btn) {
    menu.hidden = false; menuFor = btn; btn.setAttribute('aria-expanded', 'true');
    const r = btn.getBoundingClientRect(), m = menu.getBoundingClientRect(), pad = 8;
    let left, top;
    if (rail.contains(btn) && innerWidth > 760) { left = r.left - m.width - pad; top = r.top + r.height / 2 - m.height / 2; }
    else if (rail.contains(btn)) { left = r.left + r.width / 2 - m.width / 2; top = r.top - m.height - pad; }
    else { left = r.left; top = r.bottom + pad; if (top + m.height > innerHeight - pad) top = r.top - m.height - pad; }
    menu.style.left = Math.max(pad, Math.min(left, innerWidth - m.width - pad)) + 'px';
    menu.style.top = Math.max(pad, Math.min(top, innerHeight - m.height - pad)) + 'px';
  }
  for (const b of shareBtns) b.addEventListener('click', e => { e.stopPropagation(); menuFor === b ? closeMenu() : (closeMenu(), openMenu(b)); });
  document.addEventListener('click', e => { if (!menu.contains(e.target)) closeMenu(); });
  addEventListener('scroll', closeMenu, { passive: true });
  addEventListener('resize', closeMenu);

  // Comments panel
  const shade = el('div', { class: 'eg-shade', hidden: '' });
  const panel = el('div', { class: 'eg-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'eg-title', id: 'comments', hidden: '' });
  panel.innerHTML = `
    <div class="eg-head"><h2 id="eg-title">Comments<span class="n" data-n>0</span></h2><button class="eg-close" type="button" aria-label="Close comments">${ICON.close}</button></div>
    <ol class="eg-list" data-list></ol>
    <form class="eg-form" novalidate>
      <input name="name" maxlength="60" autocomplete="name" placeholder="Your name" aria-label="Your name" required>
      <textarea name="body" maxlength="2000" placeholder="Add a comment…" aria-label="Comment" required></textarea>
      <div class="hp" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></div>
      <div class="eg-foot"><p class="eg-note" data-note role="status" aria-live="polite"></p><button class="eg-post" type="submit">Post</button></div>
    </form>`;
  document.body.append(shade, panel);
  const list = panel.querySelector('[data-list]'), form = panel.querySelector('form');
  const note = panel.querySelector('[data-note]'), submit = form.querySelector('.eg-post');
  const say = msg => { note.textContent = msg || ''; };
  let lastFocus = null;
  function openPanel() {
    lastFocus = document.activeElement; closeMenu();
    shade.hidden = false; panel.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => { shade.classList.add('on'); panel.classList.add('on'); }));
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => (form.elements.name.value ? form.elements.body : form.elements.name).focus({ preventScroll: true }), 50);
  }
  function closePanel() {
    shade.classList.remove('on'); panel.classList.remove('on');
    document.documentElement.style.overflow = '';
    setTimeout(() => { if (!panel.classList.contains('on')) { shade.hidden = true; panel.hidden = true; } }, 300);
    if (location.hash === '#comments') history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  for (const b of commentBtns) b.addEventListener('click', openPanel);
  shade.addEventListener('click', closePanel);
  panel.querySelector('.eg-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!menu.hidden) closeMenu(); else if (!panel.hidden) closePanel(); }
    if (e.key === 'Tab' && !panel.hidden) { // keep focus inside the panel
      const f = [...panel.querySelectorAll('button, input:not([tabindex="-1"]), textarea')].filter(x => !x.disabled);
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  if (location.hash === '#comments') openPanel();

  // Data
  let state = { likes: 0, liked: false, comments: [] };
  const fmtDate = s => {
    const d = new Date(String(s).replace(' ', 'T') + 'Z');
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };
  function render() {
    for (const b of likeBtns) {
      b.setAttribute('aria-pressed', String(state.liked));
      b.setAttribute('aria-label', `${state.liked ? 'Unlike' : 'Like'} (${state.likes} likes)`);
      b.querySelector('.n').textContent = state.likes;
    }
    for (const b of commentBtns) {
      b.setAttribute('aria-label', `Comments (${state.comments.length})`);
      b.querySelector('.n').textContent = state.comments.length;
    }
    panel.querySelector('[data-n]').textContent = state.comments.length;
    list.textContent = '';
    if (!state.comments.length) { list.appendChild(el('li', { class: 'eg-empty' }, 'No comments yet. Be the first to comment.')); return; }
    for (const c of state.comments) {
      const li = el('li'), main = el('div');
      main.append(el('p', { class: 'eg-name' }, c.name), el('p', { class: 'eg-body' }, c.body), el('p', { class: 'eg-date' }, fmtDate(c.created_at)));
      li.append(el('span', { class: 'eg-ava', 'aria-hidden': 'true' }, (c.name.trim()[0] || '?')), main);
      list.appendChild(li);
    }
  }
  async function call(path, body) {
    const res = await fetch(API + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || 'Something went wrong. Please try again.');
    return out;
  }
  call(`/api/engage?page=${enc(page)}&visitor=${enc(visitor)}`).then(d => { state = d; render(); }).catch(() => {
    for (const b of likeBtns) b.disabled = true;
    submit.disabled = true;
    list.textContent = ''; list.appendChild(el('li', { class: 'eg-empty' }, 'Likes and comments are unavailable right now.'));
  });
  render();

  for (const b of likeBtns) b.addEventListener('click', async () => {
    likeBtns.forEach(x => { x.disabled = true; });
    try { state = await call('/api/like', { page, visitor, like: !state.liked }); render(); }
    catch (e) { flash(e.message); }
    likeBtns.forEach(x => { x.disabled = false; });
  });

  let widgetId = null;
  if (TURNSTILE_SITEKEY) {
    const slot = el('div', { class: 'cf-turnstile' });
    form.querySelector('.eg-foot').before(slot);
    window.diTurnstileReady = () => { widgetId = window.turnstile.render(slot, { sitekey: TURNSTILE_SITEKEY }); };
    document.head.appendChild(el('script', { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=diTurnstileReady&render=explicit', async: '', defer: '' }));
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = (fd.get('name') || '').trim(), body = (fd.get('body') || '').trim();
    if (!name || !body) { say('Please add your name and a comment.'); return; }
    const token = widgetId !== null && window.turnstile ? window.turnstile.getResponse(widgetId) : '';
    if (TURNSTILE_SITEKEY && !token) { say('Please complete the check above.'); return; }
    submit.disabled = true; say('Posting…');
    try {
      state = await call('/api/comment', { page, visitor, name, body, website: fd.get('website') || '', token });
      render(); form.elements.body.value = ''; list.scrollTop = 0; say('Posted.');
    } catch (err) { say(err.message); }
    if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
    submit.disabled = false;
  });
})();
