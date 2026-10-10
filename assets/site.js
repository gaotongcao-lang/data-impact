const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Mobile navigation
const toggle = document.querySelector('.mobile-toggle');
const navigation = document.getElementById('navigation');
function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? 'Close' : 'Menu';
  navigation.classList.toggle('open', open);
}
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
navigation.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

// Text "decode": characters cycle through the field's glyphs before settling
const GLYPHS = '.:-=+*#%@<>/\\_';
function decode(el, ms = 600) {
  const nodes = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) if (walk.currentNode.nodeValue.trim()) nodes.push(walk.currentNode);
  const orig = nodes.map(n => n.__orig || (n.__orig = n.nodeValue));
  const total = orig.join('').length || 1;
  const start = performance.now();
  if (el.__decoding) cancelAnimationFrame(el.__decoding);
  (function frame(now) {
    const p = Math.min(1, (now - start) / ms);
    let k = 0;
    nodes.forEach((n, i) => {
      n.nodeValue = [...orig[i]].map(c => (c === ' ' || k++ / total < p * 1.15 - .15) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]).join('');
    });
    if (p < 1) el.__decoding = requestAnimationFrame(frame);
    else { nodes.forEach((n, i) => (n.nodeValue = orig[i])); el.__decoding = 0; }
  })(start);
}
if (!calm) {
  document.querySelectorAll('[data-decode]').forEach((el, i) => setTimeout(() => decode(el, 700 + i * 200), i * 250));
  document.querySelectorAll('nav a, .button').forEach(a => {
    a.setAttribute('aria-label', a.textContent.trim());
    a.addEventListener('pointerenter', () => decode(a, 350));
  });
}

// Type the hero terminal lines once
(() => {
  const lines = [...document.querySelectorAll('[data-type]')];
  if (calm || !lines.length) return;
  const texts = lines.map(li => li.textContent);
  lines.forEach(li => (li.textContent = ''));
  let i = 0, j = 0;
  setTimeout(function tick() {
    if (i >= lines.length) return;
    lines[i].textContent = texts[i].slice(0, ++j);
    if (j >= texts[i].length) { i++; j = 0; setTimeout(tick, 200); } else setTimeout(tick, 24);
  }, 1000);
})();

// Header follows the page: dark over the hero, light over the white body
(() => {
  const header = document.querySelector('header');
  const hero = document.querySelector('.hero');
  const footer = document.querySelector('footer');
  if (!hero) return;
  let heroIn = true, footIn = false;
  const set = () => header.classList.toggle('on-light', !heroIn && !footIn);
  new IntersectionObserver(([e]) => { heroIn = e.isIntersecting; set(); }, { rootMargin: '-56px 0px 0px 0px', threshold: 0 }).observe(hero);
  new IntersectionObserver(([e]) => { footIn = e.isIntersecting; set(); }, { rootMargin: '0px 0px -95% 0px' }).observe(footer);
})();

// Team: a portrait with data-site becomes a link that reveals the person's website on hover
document.querySelectorAll('.member').forEach(m => {
  const url = (m.dataset.site || '').trim();
  if (!url) return;
  let host = url;
  try { host = new URL(url).host.replace(/^www\./, ''); } catch (e) {}
  const name = m.querySelector('.member-name').textContent.trim();
  const box = m.querySelector('.member-photo');
  const a = document.createElement('a');
  a.className = 'member-photo'; a.href = url; a.target = '_blank'; a.rel = 'noopener';
  a.setAttribute('aria-label', `${name} — personal website (${host}), opens in a new tab`);
  a.append(...box.childNodes);
  const tag = document.createElement('span');
  tag.className = 'member-site'; tag.setAttribute('aria-hidden', 'true');
  tag.innerHTML = `<b>[ visit site ]</b><span></span>`;
  tag.lastChild.textContent = host + ' \u2197';
  a.append(tag);
  box.replaceWith(a);
  const h = m.querySelector('.member-name');
  h.innerHTML = '';
  const nl = document.createElement('a'); nl.href = url; nl.target = '_blank'; nl.rel = 'noopener'; nl.textContent = name;
  h.append(nl);
  const u = document.createElement('p'); u.className = 'member-url'; u.textContent = host; m.append(u);
});

// Reveal on scroll
const revealer = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); revealer.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-reveal]').forEach(el => revealer.observe(el));

// Binary data field behind the hero: streaming 0s and 1s on desktop, a gentle wave on phones
(() => {
  const canvas = document.getElementById('data-field');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: -9999, y: -9999, on: 0 };
  let w = 0, h = 0, t = 0, frame;
  function resize() {
    const box = hero.getBoundingClientRect();
    w = box.width; h = box.height;
    const d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = w * d; canvas.height = h * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    draw();
  }
  // Desktop: columns of 0s and 1s stream downward like scrolling code, each column at its own
  // speed, with a bright "head" running down it. Phones keep the gentle wave.
  const fine = matchMedia('(pointer: fine)');
  const hash = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
  function draw() {
    ctx.clearRect(0, 0, w, h);
    const step = w < 600 ? 16 : 18;
    ctx.font = `${step * .7}px 'JetBrains Mono', ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const rain = fine.matches && w >= 760;
    let c = 0;
    for (let x = step / 2; x < w; x += step, c++) {
      const speed = .45 + hash(c, 1) * 1.1;             // column scroll speed
      const off = t * 260 * speed;                        // px scrolled so far
      const shift = rain ? off % step : 0;
      const base = rain ? Math.floor(off / step) : 0;
      // the column's bright head travels faster than the column itself and loops past the bottom
      const cycle = h * 1.6, trail = h * (.25 + hash(c, 2) * .35);
      const head = ((t * 900 * (.6 + hash(c, 3)) + hash(c, 4) * cycle) % cycle) - trail * .3;
      for (let j = -1, y = step / 2 - step; y < h + step; j++, y += step) {
        const yy = rain ? y + shift : y + Math.sin(x * .006 + y * .005 + t) * 14;
        if (yy < -step || yy > h + step) continue;
        const horizon = h * .55 + Math.sin(x * .003 + t * .6) * h * .16;
        const glow = Math.max(0, 1 - Math.abs(yy - horizon) / (h * .28));
        const lens = Math.max(0, 1 - Math.hypot(x - pointer.x, yy - pointer.y) / 190) * pointer.on;
        const d = head - yy;
        const streak = rain && d >= 0 && d < trail ? Math.pow(1 - d / trail, 2) : 0;
        const level = Math.min(1, glow * glow * (rain ? .55 : .8) + lens + streak * .85);
        const alpha = .05 + level * .6;
        // a digit belongs to its row in the moving column, so it travels with the stream;
        // it still flips now and then, faster under the pointer
        const row = j - base;
        const ph = hash(c, row);
        const ch = Math.floor(t * ((rain ? 3 : 10) + lens * 60) + ph * 7) % 2 ? '1' : '0';  // phones: digits flip faster since there is no rain
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillText(ch, x, yy);
      }
    }
  }
  function animate() { t += .004; draw(); frame = requestAnimationFrame(animate); }
  hero.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.on = 1;
    if (reduce.matches) draw();
  });
  hero.addEventListener('pointerleave', () => { pointer.on = 0; if (reduce.matches) draw(); });
  new IntersectionObserver(entries => {
    cancelAnimationFrame(frame);
    if (entries[0].isIntersecting && !reduce.matches) animate();
  }).observe(canvas);
  new ResizeObserver(resize).observe(hero);
  reduce.addEventListener('change', () => { cancelAnimationFrame(frame); if (!reduce.matches) animate(); else draw(); });
  resize();
  document.fonts && document.fonts.ready.then(resize);
})();

// WeChat: undo its own font-size setting (Android uses a JS bridge, iOS sets text-size-adjust on body)
(() => {
  const reset = () => { document.body.style.webkitTextSizeAdjust = '100%'; document.body.style.textSizeAdjust = '100%'; };
  reset(); addEventListener('load', reset);
  const bridge = () => {
    try {
      WeixinJSBridge.invoke('setFontSizeCallback', { fontSize: 0 });
      WeixinJSBridge.on('menu:setfont', () => WeixinJSBridge.invoke('setFontSizeCallback', { fontSize: 0 }));
    } catch (e) {}
  };
  if (typeof WeixinJSBridge === 'object') bridge(); else document.addEventListener('WeixinJSBridgeReady', bridge);
})();

// Giant one-line words (hero wordmarks, footer mark) shrink to fit their column if the browser
// renders text larger than planned (in-app text scaling, user zoom, fallback fonts)
(() => {
  const els = [...document.querySelectorAll('.wm-data, .wm-impact, .footer-mark')];
  if (!els.length) return;
  function fit() {
    els.forEach(el => {
      el.style.fontSize = '';
      const room = el.parentElement.clientWidth;
      const range = document.createRange();
      const need = () => { range.selectNodeContents(el); return range.getBoundingClientRect().width; };
      for (let i = 0; i < 4 && need() > room; i++)
        el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * room / need() * 0.97) + 'px';
    });
  }
  fit();
  addEventListener('resize', fit);
  document.fonts && document.fonts.ready.then(fit);
})();
