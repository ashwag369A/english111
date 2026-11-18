/* English language 1 – Eng.111 : interactive activities app */
(() => {
  'use strict';
  const KEY = 'ngl111-v2';
  const H = COURSE.header, T = COURSE.tutorials;
  const PREVIEW = !!window.__PREVIEW__;
  const ABOUT = 'An interactive learning application designed to transform English 111 curriculum exercises into engaging question-and-answer activities. The application enables trainees to practise, reinforce their knowledge, review course content, and receive immediate feedback on their performance. It provides comprehensive course revision and targeted practice to support preparation for final assessments, strengthen English language proficiency, and enhance the practical application of language skills. Furthermore, it promotes independent learning through interactive activities, self-assessment, and continuous feedback.';
  let ONLY = null; /* ?t=3 opens Tutorial 3 on its own */
  try { const q = parseInt(new URLSearchParams(location.search).get('t'), 10); if (q >= 1 && q <= COURSE.tutorials.length) ONLY = q - 1; } catch (e) {}
  const linkFor = i => location.origin + location.pathname + '?t=' + (i + 1);
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- state ---------- */
  let S = { name: '', tab: 0, ans: {} };
  try { S = Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const idOf = (ti, si, ii) => `t${ti}.s${si}.q${ii}`;

  /* ---------- grading ---------- */
  const GRADES = [[95, 'A+'], [90, 'A'], [85, 'B+'], [80, 'B'], [75, 'C+'], [70, 'C'], [65, 'D+'], [60, 'D'], [0, 'F']];
  const gradeOf = p => GRADES.find(g => p >= g[0])[1];
  const MAX = 20; /* marks for each tutorial */
  const isScored = it => (it.t === 'mc' && it.a != null && !it.personal) || it.t === 'fill' || it.t === 'mc2';

  function tutStats(ti) {
    let total = 0, correct = 0, answered = 0, held = 0;
    T[ti].sections.forEach((sec, si) => sec.items.forEach((it, ii) => {
      const a = S.ans[idOf(ti, si, ii)];
      if (isScored(it)) { total++; if (a && a.ok !== null && a.ok !== undefined) { answered++; if (a.ok) correct++; } }
      else if (it.t !== 'ex' && a) held++;
    }));
    const pct = total ? Math.round(correct / total * 100) : 0;
    return { total, correct, answered, held, pct, mark: total ? Math.round(correct / total * MAX * 10) / 10 : 0 };
  }
  const complete = i => { const s = tutStats(i); return s.total > 0 && s.answered === s.total; };
  const unlocked = i => true || ONLY != null || i <= 0 || (unlocked(i - 1) && complete(i - 1));
  const fmt = n => (Math.round(n * 10) / 10).toString();
  function overall() {
    let c = 0, t = 0, a = 0, h = 0, m = 0;
    T.forEach((_, i) => { const s = tutStats(i); c += s.correct; t += s.total; a += s.answered; h += s.held; m += s.mark; });
    return { correct: c, total: t, answered: a, held: h, marks: m, maxMarks: MAX * T.length, pct: Math.round(m / (MAX * T.length) * 100) };
  }

  /* ---------- speech ---------- */
  function pickVoice(g) {
    const v = (window.speechSynthesis && speechSynthesis.getVoices() || []).filter(x => /^en/i.test(x.lang));
    const fem = /female|samantha|zira|susan|hazel|karen|serena|moira|tessa|fiona|victoria|amy|emma|sonia|libby/i, mal = /\bmale\b|daniel|david|george|alex|mark|ryan|thomas|oliver|arthur|fred|guy/i;
    if (g === 'f2') { const fs = v.filter(x => fem.test(x.name)); return fs[1] || null; }
    return g === 'f' ? (v.find(x => fem.test(x.name)) || null) : (v.find(x => mal.test(x.name) && !fem.test(x.name)) || null);
  }
  function speakAs(text, g) { /* g = 'f' (woman) or 'm' (man) */
    if (!('speechSynthesis' in window)) { toast('Speech is not available on this device.'); return null; }
    const u = new SpeechSynthesisUtterance(String(text)); u.lang = 'en-GB'; u.rate = 0.88;
    const v = pickVoice(g); if (v) { u.voice = v; u.lang = v.lang; u.pitch = 1; } else u.pitch = g === 'f' ? 1.35 : g === 'f2' ? 1.7 : 0.6;
    return u;
  }
  /* Human recordings: audio/index.json maps a line of text to a file number; when the file is missing the phone's own voice is used instead. */
  const nk = t => String(t).replace(/^[AB]:\s*/, '').replace(/\s+/g, ' ').trim().toLowerCase();
  let AUD = {}; try { fetch('audio/index.json').then(r => r.ok ? r.json() : {}).then(j => { AUD = j || {}; }).catch(() => {}); } catch (e) {}
  let dlgRun = 0, curAudio = null;
  function stopAll() { dlgRun++; if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; } if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  function playSeq(items) { /* items = [[who, text], ...] */
    stopAll(); const run = dlgRun; let i = 0;
    const next = () => {
      if (run !== dlgRun || i >= items.length) return;
      const [who, txt] = items[i++], id = AUD[nk(txt)];
      const tts = () => {
        if (!('speechSynthesis' in window)) { toast('Speech is not available on this device.'); return; }
        let u;
        if (who) u = speakAs(txt, who); else { u = new SpeechSynthesisUtterance(String(txt).replace(/^[AB]:\s*/, '').replace(/_{2,}/g, ' blank ')); u.lang = 'en-GB'; u.rate = 0.85; }
        u.onend = () => setTimeout(next, 350); speechSynthesis.speak(u);
      };
      if (!id) { tts(); return; }
      const a = new Audio('audio/' + id + '.mp3'); curAudio = a; let failed = false;
      a.onerror = () => { if (failed || run !== dlgRun) return; failed = true; tts(); };
      a.onended = () => setTimeout(next, 450);
      a.play().catch(() => { if (!failed && run === dlgRun) { failed = true; tts(); } });
    };
    next();
  }
  const speakDialogue = (lines, voices) => playSeq(lines.map(([who, txt]) => [(voices || {})[who] || 'f', txt]));
  const speak = text => playSeq([[null, text]]);
  const stopBtn = () => { const b = el('button', 'btn small stopbtn', '⏹ Stop'); b.type = 'button'; b.onclick = stopAll; return b; };
  const speakBtn = (text, label) => { const b = el('button', 'spk', '🔊'); b.type = 'button'; b.setAttribute('aria-label', label || 'Listen'); b.onclick = () => speak(text); return b; };

  /* ---------- pictures ---------- */
  const ICONS = {
    'arrow-up': '<path d="M24 40V10M12 22L24 10L36 22"/>',
    'arrow-right': '<path d="M8 24H38M26 12L38 24L26 36"/>',
    'arrow-left': '<path d="M40 24H10M22 12L10 24L22 36"/>',
    'windy': '<path d="M4 16h24a6 6 0 1 0-6-6"/><path d="M4 25h34a6 6 0 1 1-6 6"/><path d="M4 34h16a4 4 0 1 1-4 4"/><path d="M33 14c3-5 8-5 11-1" opacity=".6"/>',
    'elevator': '<rect x="10" y="6" width="28" height="36" rx="3"/><path d="M24 6V42M13 22l4-8 4 8zM27 26l4 8 4-8z"/>',
    'dome': '<path d="M8 34A16 16 0 0 1 40 34"/><path d="M6 34H42M10 34v6h28v-6M24 18v-8"/><circle cx="24" cy="8" r="2"/>',
    'icon-folder': '<path d="M6 12h14l4 5h18v23H6z"/>',
    'icon-globe': '<circle cx="24" cy="24" r="16"/><ellipse cx="24" cy="24" rx="7" ry="16"/><path d="M8 24h32M11 15h26M11 33h26"/>',
    'icon-windows': '<rect x="7" y="7" width="15" height="15"/><rect x="26" y="7" width="15" height="15"/><rect x="7" y="26" width="15" height="15"/><rect x="26" y="26" width="15" height="15"/>',
    'icon-compass': '<circle cx="24" cy="24" r="16"/><path d="M31 17l-5 9-9 5 5-9z"/>',
    'icon-grid': '<rect x="8" y="8" width="32" height="32"/><path d="M8 19h32M8 30h32M19 8v32M30 8v32"/>',
    'icon-doc': '<path d="M12 6h18l8 8v28H12z"/><path d="M30 6v8h8M17 24h16M17 30h16M17 36h10"/>',
    'icon-palette': '<path d="M24 8C14 8 8 15 8 23c0 9 8 17 16 17 3 0 4-2 3-4-1-3 1-5 4-5h5c3 0 4-2 4-4 0-9-7-15-16-15z"/><circle cx="17" cy="21" r="2"/><circle cx="24" cy="15" r="2"/><circle cx="32" cy="19" r="2"/>',
    'icon-database': '<ellipse cx="24" cy="12" rx="14" ry="5"/><path d="M10 12v24c0 3 6 5 14 5s14-2 14-5V12M10 24c0 3 6 5 14 5s14-2 14-5"/>',
    'icon-slides': '<rect x="7" y="9" width="34" height="23" rx="2"/><path d="M24 32v8M16 40h16M14 27v-5M22 27V17M30 27v-9"/>'
  };
  function svgIcon(name, size) {
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 48 48'); s.setAttribute('width', size || 72); s.setAttribute('height', size || 72);
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2.6'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONS[name] || ''; return s;
  }

  /* full-colour pictures: real-life signs, a stamp, a prayer rug */
  const RICH = {
    'sign-ahead': '<circle cx="48" cy="48" r="44" fill="#1565c0"/><path d="M48 18 70 44H56v32H40V44H26z" fill="#fff"/>',
    'sign-right': '<circle cx="48" cy="48" r="44" fill="#1565c0"/><path d="M78 48 50 22v14H20v24h30v14z" fill="#fff"/>',
    'sign-left': '<circle cx="48" cy="48" r="44" fill="#1565c0"/><path d="M18 48 46 22v14h30v24H46v14z" fill="#fff"/>',
    'sign-escalator': '<rect x="4" y="4" width="88" height="88" rx="10" fill="#1565c0"/><path d="M14 76h16V62h14V48h14V34h14V22h12" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/><path d="M16 56 64 12" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="44" cy="28" r="6" fill="#fff"/><path d="M44 36v14l-8 12M44 42l10 6" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>',
    'sign-elevator': '<rect x="4" y="4" width="88" height="88" rx="10" fill="#1565c0"/><rect x="16" y="16" width="44" height="64" rx="3" fill="none" stroke="#fff" stroke-width="5"/><circle cx="38" cy="34" r="6" fill="#fff"/><path d="M38 42v16m-9 18 9-18 9 18M28 50h20" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M76 30 84 42H68zM76 66 68 54h16z" fill="#fff"/>',
    'sign-dome': '<rect x="4" y="4" width="88" height="88" rx="10" fill="#1565c0"/><path d="M18 62a30 30 0 0 1 60 0z" fill="#fff"/><path d="M48 32V18" stroke="#fff" stroke-width="5" stroke-linecap="round"/><rect x="14" y="64" width="68" height="8" fill="#fff"/><path d="M26 72v8M40 72v8M56 72v8M70 72v8" stroke="#fff" stroke-width="5"/>',
    'stamp': '<rect x="14" y="10" width="68" height="76" fill="#fff" stroke="#c2410c" stroke-width="6" stroke-dasharray="5 5"/><rect x="24" y="20" width="48" height="56" fill="#fde68a" stroke="#c2410c" stroke-width="2"/><circle cx="48" cy="42" r="12" fill="#c2410c"/><path d="M30 70h36" stroke="#c2410c" stroke-width="4"/>',
    'rug': '<rect x="18" y="8" width="60" height="80" rx="4" fill="#15803d"/><rect x="24" y="14" width="48" height="68" fill="none" stroke="#fde68a" stroke-width="3"/><path d="M34 72V42a14 14 0 0 1 28 0v30z" fill="#bbf7d0" stroke="#fde68a" stroke-width="3"/><path d="M18 90v4m8-4v4m8-4v4m8-4v4m8-4v4m8-4v4m8-4v4m8-4v4" stroke="#fde68a" stroke-width="2"/>'
  };
  function richSvg(name, size) {
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 96 96'); s.setAttribute('width', size || 84); s.setAttribute('height', size || 84);
    s.setAttribute('aria-hidden', 'true'); s.innerHTML = RICH[name] || ''; return s;
  }
  function calSvg(day) { /* a small week calendar with one day highlighted */
    const D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], on = D.indexOf(day);
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 224 64'); s.setAttribute('width', 196); s.setAttribute('height', 56); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<rect x="1" y="1" width="222" height="62" rx="8" fill="#fff" stroke="#20a1a1" stroke-width="2"/><rect x="1" y="1" width="222" height="16" rx="8" fill="#20a1a1"/>' +
      D.map((d, i) => `<g><rect x="${6 + i * 31}" y="22" width="28" height="36" rx="5" fill="${i === on ? '#f59e0b' : '#eef6f6'}"/><text x="${20 + i * 31}" y="45" text-anchor="middle" font-size="12" font-weight="700" fill="${i === on ? '#fff' : '#17252a'}" font-family="system-ui,sans-serif">${d}</text></g>`).join('');
    return s;
  }
  function clockSvg(t) {
    const [h, m] = t.split(':').map(Number), s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('width', 96); s.setAttribute('height', 96); s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Analogue clock');
    let g = '<circle cx="50" cy="50" r="46" fill="var(--card)" stroke="currentColor" stroke-width="3"/>';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r1 = i % 3 === 0 ? 36 : 40; g += `<line x1="${50 + 44 * Math.sin(a)}" y1="${50 - 44 * Math.cos(a)}" x2="${50 + r1 * Math.sin(a)}" y2="${50 - r1 * Math.cos(a)}" stroke="currentColor" stroke-width="${i % 3 === 0 ? 3 : 1.5}"/>`; }
    [[12, 50, 22], [3, 76, 54], [6, 50, 85], [9, 24, 54]].forEach(([n, x, y]) => { g += `<text x="${x}" y="${y}" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">${n}</text>`; });
    const ha = ((h % 12) * 30 + m * 0.5) * Math.PI / 180, ma = m * 6 * Math.PI / 180;
    g += `<line x1="50" y1="50" x2="${50 + 22 * Math.sin(ha)}" y2="${50 - 22 * Math.cos(ha)}" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`;
    g += `<line x1="50" y1="50" x2="${50 + 33 * Math.sin(ma)}" y2="${50 - 33 * Math.cos(ma)}" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="50" r="3" fill="currentColor"/>`;
    s.innerHTML = g; return s;
  }
  function picture(p, alt) {
    const d = el('div', 'pic');
    if (p.img) { const i = el('img'); i.src = p.img; i.alt = alt || ''; i.loading = 'lazy'; d.append(i); }
    else if (p.cal) { d.classList.add('ico', 'calpic'); d.append(calSvg(p.cal)); const x = el('span', 'calx'); if (p.cimg) { const im = el('img', 'calimg'); im.src = p.cimg; im.alt = ''; x.append(im); } else if (p.rich) x.append(richSvg(p.rich, 56)); else x.textContent = p.emoji || ''; d.append(x); }
    else if (p.rich) { d.classList.add('ico'); d.append(richSvg(p.rich)); }
    else if (p.emoji) { d.classList.add('emo'); d.textContent = p.emoji; }
    else if (p.svg) { d.classList.add('ico'); d.append(svgIcon(p.svg)); }
    else if (p.clock) { d.classList.add('ico'); d.append(clockSvg(p.clock)); }
    else if (p.text) { d.classList.add('sym'); d.textContent = p.text; }
    return d;
  }

  /* ---------- toast ---------- */
  function toast(msg) { const t = el('div', 'toast', msg); document.body.append(t); setTimeout(() => t.remove(), 2800); }

  /* ---------- header & tabs ---------- */
  function buildHeader() {
    const h = $('#head'); h.innerHTML = '';
    const logo = el('img', 'logo'); logo.src = 'assets/logo.png'; logo.alt = 'Technical and Vocational Training Corporation';
    const t = el('div', 'htext');
    t.append(el('div', 'h1', H.country), el('div', 'h2', H.body), el('div', 'h2', H.college));
    const top = el('div', 'htop'); top.append(logo, t);
    const c = el('div', 'hcourse'); c.append(el('b', '', H.course), el('span', '', H.by));
    h.append(top, c);
  }
  function starPop(n) {
    const o = el('div', 'starpop'); o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'All answers correct');
    const c = el('div', 'starcard'); c.append(el('div', 'bigstar', '⭐'), el('div', 'stt', 'Excellent!'), el('div', 'sts', 'All answers in Tutorial ' + n + ' are correct.'));
    for (let i = 0; i < 12; i++) { const m = el('span', 'mini', i % 2 ? '⭐' : '✨'); m.style.setProperty('--a', (i * 30) + 'deg'); m.style.animationDelay = (i * 40) + 'ms'; c.append(m); }
    const b = el('button', 'btn small', 'Continue'); b.type = 'button'; c.append(b); o.append(c); document.body.append(o);
    const close = () => { o.classList.add('out'); setTimeout(() => o.remove(), 250); }; b.onclick = close; o.onclick = e => { if (e.target === o) close(); };
    setTimeout(close, 4200); b.focus();
  }
  const tabs = $('#tabs'), view = $('#view');
  function buildTabs() {
    tabs.innerHTML = '';
    if (ONLY != null) {
      const b = el('button', 'tab on', 'Tutorial ' + T[ONLY].n); b.type = 'button'; b.disabled = true; tabs.appendChild(b); return;
    }
    T.forEach((t, i) => {
      const s = tutStats(i), lk = !unlocked(i), b = el('button', 'tab' + (S.tab === i ? ' on' : '') + (lk ? ' locked' : ''));
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', S.tab === i); if (lk) b.setAttribute('aria-disabled', 'true');
      b.innerHTML = `<span>Tutorial ${t.n}</span>` + (lk ? '<span class="chk" aria-label="locked">🔒</span>' : (s.total && s.answered === s.total ? '<span class="chk">✓</span>' : ''));
      b.onclick = () => go(i); tabs.appendChild(b);
    });
    const r = el('button', 'tab results' + (S.tab === T.length ? ' on' : ''), '★ Results');
    r.type = 'button'; r.setAttribute('role', 'tab'); r.onclick = () => go(T.length); tabs.appendChild(r);
    const on = $('.tab.on', tabs); if (on && on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function go(i) { if (ONLY != null) return; if (i < T.length && !unlocked(i)) { let f = 0; while (f < T.length && unlocked(f + 1)) f++; toast('🔒 Finish Tutorial ' + T[f].n + ' first to open this one.'); return; } S.tab = i; save(); if ('speechSynthesis' in window) speechSynthesis.cancel(); render(); window.scrollTo({ top: 0 }); }
  function render() { buildTabs(); if (ONLY != null) renderTutorial(ONLY); else S.tab >= T.length ? renderResults() : renderTutorial(S.tab); }

  /* ---------- tutorial ---------- */
  function ytButton(url) {
    const a = el('a', 'yt'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.innerHTML = '<span aria-hidden="true">▶</span> Open audio on YouTube'; return a;
  }
  function renderTutorial(ti) {
    view.innerHTML = '';
    const t = T[ti], st = tutStats(ti);
    const head = el('header', 'thead');
    if (ti === 0) head.append(el('p', 'activities', H.activities));
    head.append(el('h2', '', 'Tutorial ' + t.n + (t.sub ? ' – ' + t.sub : '')));
    const prog = el('div', 'prog'); prog.id = 'prog'; head.append(prog); view.append(head); updateProg();

    t.sections.forEach((sec, si) => {
      const box = el('section', 'sec');
      if (sec.kind) { const ic = { Listening: '🎧', Reading: '📖', Writing: '✍️', Grammar: '🧩', Vocabulary: '🔤', Speaking: '🗣️', Spelling: '🔡', Punctuation: '❗' }[sec.kind] || '📝';
        box.append(el('span', 'kind k-' + sec.kind.toLowerCase(), ic + ' ' + sec.kind)); }
      if (sec.title) box.append(el('h3', '', sec.title));
      if (sec.intro) box.append(el('p', 'intro', sec.intro));
      if (sec.bank) box.append(el('p', 'bank', '📦 Word bank: ' + sec.bank));
      if (sec.img) { const w = el('div', 'bigpic'); const i = el('img'); i.src = sec.img.img; i.alt = sec.title || ''; w.append(i); box.append(w); }
      if (sec.passage) box.append(el('div', 'passage', sec.passage));
      if (sec.lines) {
        const l = el('div', 'lines');
        const all = el('button', 'btn small', '🔊 Play all'); all.type = 'button'; all.onclick = () => playSeq(sec.lines.map(x => [null, x])); l.append(all, stopBtn());
        sec.lines.forEach((x, k) => { const r = el('div', 'line'); r.append(speakBtn(x), el('span', '', x)); const lp = sec.linepics && sec.linepics[k]; if (lp) { const im = el('img', 'lineimg'); im.src = lp; im.alt = ''; r.append(im); } l.append(r); });
        if (sec.link) l.append(ytButton(sec.link));
        box.append(l);
      }
      if (sec.dialogue) {
        const wrap = el('div', 'dlg');
        const play = el('button', 'btn small', '▶ Play the conversation'); play.type = 'button'; play.onclick = () => speakDialogue(sec.dialogue, sec.voices || {}); wrap.append(play, stopBtn());
        const d = el('details', 'script'); d.append(el('summary', '', 'Show the listening script'));
        sec.dialogue.forEach(([who, txt]) => { const r = el('div', 'line'); const b = el('button', 'spk', '🔊'); b.type = 'button'; b.setAttribute('aria-label', 'Listen to ' + who);
          b.onclick = () => playSeq([[(sec.voices || {})[who] || 'f', txt]]); r.append(b, el('span', '', sec.nonames ? txt : who + ': ' + txt)); d.append(r); });
        wrap.append(d); box.append(wrap);
      }
      if (sec.speak) {
        const b = el('button', 'btn small', '🔊 Play the listening script'); b.type = 'button'; b.onclick = () => playSeq(sec.speak.map(x => [null, x])); box.append(b, stopBtn());
        if (sec.script) { const d = el('details', 'script'); d.append(el('summary', '', 'Show the listening script')); d.append(el('div', 'passage', sec.script)); box.append(d); }
      }
      if (sec.link && !sec.lines) { const w = el('div', 'secyt'); w.append(ytButton(sec.link)); box.append(w); }
      if (sec.review) box.append(reviewCard());
      if (sec.family) box.append(familyCard());
      if (sec.note) box.append(el('p', 'secnote', sec.note));
      sec.items.forEach((it, ii) => box.append(renderItem(it, idOf(ti, si, ii), ii + 1)));
      view.append(box);
    });
    const foot = el('div', 'tfoot');
    const retry = el('button', 'btn ghost', '↻ Retry this tutorial'); retry.type = 'button';
    retry.onclick = () => {
      if (!retry.dataset.sure) { retry.dataset.sure = 1; retry.textContent = 'Tap again to clear this tutorial'; setTimeout(() => { delete retry.dataset.sure; retry.textContent = '↻ Retry this tutorial'; }, 3500); return; }
      Object.keys(S.ans).forEach(k => k.startsWith(`t${ti}.`) && delete S.ans[k]); save(); render();
    };
    const next = el('button', 'btn', ti + 1 < T.length ? `Next: Tutorial ${ti + 2} →` : 'See my results ★'); next.type = 'button'; next.onclick = () => go(ti + 1);
    view.append(tutResult(ti));
    foot.append(retry); if (ONLY == null) foot.append(next); view.append(foot);
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); } catch (e) { const ta = el('textarea'); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); } catch (x) {} ta.remove(); }
  }
  function tutText(ti) {
    const t = T[ti], s = tutStats(ti);
    return [`Name: ${S.name.trim() || '(no name)'}`, `Tutorial ${t.n}${t.sub ? ' – ' + t.sub : ''}`, `Score: ${fmt(s.mark)}/${MAX}`].join('\n');
  }
  function tutResult(ti) {
    const t = T[ti], s = tutStats(ti), card = el('section', 'sec resultcard tutres');
    card.append(el('h3', '', `My mark – Tutorial ${t.n}`));
    const nm = el('div', 'namebox'); const lb = el('label', '', 'Student name'); lb.htmlFor = 'nm' + ti; nm.append(lb);
    const inp = el('input', 'nameinp'); inp.id = 'nm' + ti; inp.type = 'text'; inp.placeholder = 'Write your full name'; inp.value = S.name; inp.autocomplete = 'name';
    inp.oninput = () => { S.name = inp.value; save(); }; nm.append(inp); card.append(nm);
    const g = gradeOf(s.pct), big = el('div', 'big');
    big.innerHTML = `<div class="pct">${fmt(s.mark)}<small>/${MAX}</small></div><div class="grade ${g === 'F' ? 'gF' : ''}">${g}</div>`;
    big.id = 'tutbig'; card.append(big);
    card.append(el('p', 'sub', `${s.correct} correct out of ${s.total} scored questions · ${s.answered} answered`));
    if (s.answered < s.total) card.append(el('p', 'warnnote', `${s.total - s.answered} question(s) not answered yet. They count as zero.`));
    const act = el('div', 'actions');
    const copy = el('button', 'btn', '📋 Copy my mark'); copy.type = 'button';
    copy.onclick = async () => { await copyText(tutText(ti)); toast('Copied. Paste it into Telegram, email or Blackboard.'); };
    act.append(copy);
    if (!PREVIEW) {
      const share = el('button', 'btn', '📤 Share'); share.type = 'button';
      share.onclick = async () => { if (navigator.share) { try { await navigator.share({ title: H.course + ' – Tutorial ' + t.n, text: tutText(ti) }); } catch (e) {} } else copy.click(); };
      act.append(share);
      if (ONLY == null) {
        const lk = el('button', 'btn ghost', '🔗 Copy link of this tutorial'); lk.type = 'button';
        lk.onclick = async () => { await copyText(linkFor(ti)); toast('Link copied. Send it to your students.'); };
        act.append(lk);
      }
    }
    card.append(act); return card;
  }
  function refreshTutRes() {
    const ti = ONLY != null ? ONLY : S.tab, old = $('.tutres'); if (!old || ti >= T.length) return;
    old.replaceWith(tutResult(ti));
  }
  function updateProg() {
    const p = $('#prog'); if (!p) return; const st = tutStats(ONLY != null ? ONLY : S.tab); if (S.tab >= T.length && ONLY == null) return;
    p.innerHTML = `<div class="bar"><i style="width:${st.total ? st.answered / st.total * 100 : 0}%"></i></div><span>${st.answered}/${st.total} answered · ${st.correct} correct</span>`;
  }

  function reviewCard() {
    const d = el('div', 'review');
    d.append(el('p', 'intro', 'Press play to hear the whole alphabet or the numbers. You can also tap a letter or a number to hear it.'));
    const L = el('div', 'chips'); 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(c => { const b = el('button', 'chip', c + ' ' + c.toLowerCase()); b.type = 'button'; b.onclick = () => speak(c); L.append(b); });
    const N = el('div', 'chips nums'); for (let i = 1; i <= 100; i++) { const b = el('button', 'chip', String(i)); b.type = 'button'; b.onclick = () => speak(String(i)); N.append(b); }
    const fileBtn = (label, src) => { const b = el('button', 'btn small', label); b.type = 'button'; b.onclick = () => { stopAll(); const au = new Audio(src); curAudio = au; au.play().catch(() => toast('Audio could not be played.')); }; return b; };
    d.append(fileBtn('▶ Play the alphabet (A–Z)', 'audio/letters.mp3'), stopBtn(), L, el('p', 'intro', 'Numbers 1–100'), fileBtn('▶ Play numbers 1–100', 'audio/numbers.mp3'), stopBtn(), N); return d;
  }
  function familyCard() {
    const d = el('div', 'family');
    [['👩', 'mother'], ['👨', 'father'], ['👦', 'brother'], ['👧', 'sister'], ['👵', 'grandmother'], ['👴', 'grandfather'], ['👩', 'aunt'], ['👨', 'uncle']].forEach(([e, w]) => {
      const b = el('button', 'fam'); b.type = 'button'; b.innerHTML = `<span class="e">${e}</span><span>${w}</span>`; b.onclick = () => speak(w); d.append(b);
    });
    return d;
  }

  /* ---------- items ---------- */
  function splitStem(it, idx) {
    let q = it.q || '', badge = it.n;
    if (badge) return { q, badge };
    const m = q.match(/^(\d+)\.(\s+|$)/);
    if (m) { if (!badge) badge = m[1]; q = q.slice(m[0].length); }
    if (badge && q.startsWith(badge + ': ')) q = q.slice(badge.length + 2);
    if (!badge) badge = String(idx);
    return { q, badge };
  }
  function renderItem(it, id, idx) {
    const a = S.ans[id], card = el('div', 'q'), { q, badge } = splitStem(it, idx);
    card.append(el('div', 'qn', badge));
    const body = el('div', 'qb'); card.append(body);
    const row = el('div', 'qrow');
    if (q) { const p = el('p', 'qt', q); row.append(p); }
    if (it.say) row.append(speakBtn(it.say, 'Listen to the word'));
    if (row.childNodes.length) body.append(row);
    if (it.hint) body.append(el('p', 'qhint', it.hint));
    if (it.pic) body.append(picture(it.pic, 'Picture for question'));
    if (it.t === 'ex') { body.append(el('p', 'ex', 'Example answer: ' + it.ans)); card.classList.add('example'); return card; }
    const fb = el('div', 'fb'); fb.setAttribute('aria-live', 'polite');
    const done = (ok, val) => {
      const ti = parseInt(id.slice(1), 10), was = complete(ti), wasAll = tutStats(ti).correct === tutStats(ti).total;
      S.ans[id] = { ok, val }; save(); buildTabs(); updateProg(); refreshTutRes();
      const st = tutStats(ti);
      if (!was && complete(ti)) {
        if (st.correct === st.total) starPop(T[ti].n);
        else if (ONLY == null && ti + 1 < T.length) toast('✅ Tutorial ' + T[ti].n + ' finished. Tutorial ' + T[ti + 1].n + ' is now open.');
        if (st.correct === st.total && ONLY == null && ti + 1 < T.length) setTimeout(() => toast('🔓 Tutorial ' + T[ti + 1].n + ' is now open.'), 2600);
      }
    };

    if (it.t === 'mc') {
      const opts = el('div', 'opts' + (it.opts.length <= 2 ? ' two' : '') + (it.iconOnly ? ' icons' : ''));
      const letters = 'abcd';
      const btns = it.opts.map((o, i) => {
        const b = el('button', 'opt'); b.type = 'button'; if (it.rtl) b.dir = 'rtl';
        const l = el('span', 'let', letters[i]);
        const label = el('span', 'olabel');
        if (it.optx) { const x = it.optx[i]; if (String(x).startsWith('img:')) { const im = el('img', 'oimg'); im.src = x.slice(4); im.alt = ''; im.loading = 'lazy'; label.append(im); } else label.append(el('span', 'oemo', x)); }
        if (!it.iconOnly) label.append(document.createTextNode((it.optx ? ' ' : '') + o));
        else b.setAttribute('aria-label', (it.optalt && it.optalt[i]) || o);
        b.append(l, label); b.onclick = () => pick(i); opts.append(b); return b;
      });
      const lock = sel => {
        btns.forEach((b, i) => { b.disabled = true; if (isScored(it)) { if (i === it.a) b.classList.add('right'); else if (i === sel) b.classList.add('wrong'); } else if (i === sel) b.classList.add('chosen'); });
        if (isScored(it)) {
          const ok = sel === it.a;
          const ans = it.iconOnly ? ((it.optalt && it.optalt[it.a]) || '') : it.opts[it.a];
          fb.className = 'fb ' + (ok ? 'good' : 'bad');
          let extra = '';
          if (!ok && !it.iconOnly && typeof ans === 'string' && typeof it.opts[sel] === 'string' && ans !== it.opts[sel] && ans.toLowerCase() === it.opts[sel].toLowerCase()) {
            const needCap = ans[0] === ans[0].toUpperCase() && it.opts[sel][0] !== it.opts[sel][0].toUpperCase();
            extra = needCap ? ' — A sentence must start with a capital letter, so write “' + ans + '”.' : ' — This word is in the middle of the sentence, so it starts with a small letter: “' + ans + '”.';
          }
          fb.textContent = (ok ? '✓ Correct!' : '✗ Not quite. Correct answer: ' + ans) + extra + (it.why ? ' — ' + it.why : '');
          if (it.sayAfter) { fb.append(' '); fb.append(speakBtn(it.sayAfter, 'Listen to the word')); }
        } else {
          fb.className = 'fb info';
          fb.textContent = it.personal ? '✓ Saved. This is your own answer, so it is not scored.' : '✓ Answer saved. Your teacher will confirm this one. It is not counted in your score yet.';
        }
      };
      function pick(i) { done(isScored(it) ? i === it.a : null, i); lock(i); }
      body.append(opts); if (a) lock(a.val);
    } else if (it.t === 'mc2') { /* two blanks: choose both answers in the same question */
      const val = a && a.val ? a.val.slice() : [null, null], wrap = el('div', 'twoparts');
      const groups = it.parts.map((pt, pi) => {
        const g = el('div', 'part'); g.append(el('div', 'plabel', pt.label)); const opts = el('div', 'opts');
        const btns = pt.opts.map((o, i) => { const b = el('button', 'opt'); b.type = 'button'; b.append(el('span', 'let', 'abcd'[i]), el('span', 'olabel', o)); b.onclick = () => choose(pi, i); opts.append(b); return b; });
        g.append(opts); wrap.append(g); return { btns, pt };
      });
      const paint = () => {
        groups.forEach(({ btns, pt }, pi) => { const sel = val[pi]; btns.forEach((b, i) => { b.disabled = sel !== null; b.classList.remove('right', 'wrong');
          if (sel !== null) { if (i === pt.a) b.classList.add('right'); else if (i === sel) b.classList.add('wrong'); } }); });
        if (val[0] !== null && val[1] !== null) { const ok = val.every((v, k) => v === it.parts[k].a);
          fb.className = 'fb ' + (ok ? 'good' : 'bad'); fb.textContent = ok ? '✓ Correct!' : '✗ Not quite. Correct answers: ' + it.parts.map(x => x.opts[x.a]).join(' / '); }
      };
      const choose = (pi, i) => { val[pi] = i; const full = val[0] !== null && val[1] !== null; done(full ? val.every((v, k) => v === it.parts[k].a) : null, val.slice()); paint(); };
      body.append(wrap); paint();
    } else if (it.t === 'fill') { /* typed answer, checked instantly */
      const norm = (x, strict) => { let v = String(x).replace(/[’‘`]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
        if (!strict) v = v.toLowerCase().replace(/[.!?,;:]/g, '').replace(/\s+/g, ' ').trim().replace(/^(a|an|the) /, ''); return v; };
      const strip = v => { if (!it.prefix) return v; const p = it.prefix.toLowerCase(); return v.toLowerCase().startsWith(p + ' ') ? v.slice(p.length).trim() : v; };
      const check = v => it.ans.some(x => norm(x, it.strict) === norm(strip(v), it.strict) || norm(x, it.strict) === norm(v, it.strict));
      const inp = el('input', 'blank wide'); inp.type = 'text'; inp.placeholder = 'Write your answer here…'; inp.setAttribute('aria-label', 'Your answer');
      inp.autocomplete = 'off'; inp.autocapitalize = 'off'; inp.spellcheck = false;
      const btn = el('button', 'btn small', 'Check'); btn.type = 'button';
      const lock = (v, ok) => { inp.value = v; inp.disabled = true; btn.remove(); inp.classList.add(ok ? 'right' : 'wrong');
        fb.className = 'fb ' + (ok ? 'good' : 'bad'); fb.textContent = ok ? '✓ Correct!' : '✗ Not quite. Correct answer: ' + it.ans[0]; if (it.sayAfter) { fb.append(' '); fb.append(speakBtn(it.sayAfter, 'Listen to the word')); } };
      const go1 = () => { const v = inp.value.trim(); if (!v) return; const ok = check(v); done(ok, v); lock(v, ok); };
      btn.onclick = go1; inp.onkeydown = e => { if (e.key === 'Enter') go1(); };
      body.append(inp, btn); if (a) lock(a.val, a.ok);
    } else { /* open writing */
      const inp = it.short ? el('input', 'blank wide') : el('textarea', 'free');
      if (!it.short) inp.rows = 3; else inp.type = 'text';
      inp.placeholder = 'Write here…'; inp.setAttribute('aria-label', 'Your answer'); inp.autocomplete = 'off'; inp.spellcheck = false;
      const btn = el('button', 'btn small', 'Save'); btn.type = 'button';
      const lock = v => { inp.value = v; inp.disabled = true; btn.remove(); fb.className = 'fb info'; fb.textContent = '✓ Saved.' + (it.model ? ' Model answer: ' + it.model + (/[.!?]$/.test(it.model.trim()) ? '' : '.') : ' Your teacher will check this answer.') + ' It is not scored.'; };
      btn.onclick = () => { if (!inp.value.trim()) return; done(null, inp.value.trim()); lock(inp.value.trim()); };
      body.append(inp, btn); if (a) lock(a.val);
    }
    body.append(fb); return card;
  }

  /* ---------- results ---------- */
  const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  function resultsText() {
    const o = overall(), L = [];
    L.push(`Name: ${S.name.trim() || '(no name)'}`, '');
    T.forEach((t, i) => { const s = tutStats(i); L.push(`Tutorial ${t.n}${t.sub ? ' – ' + t.sub : ''}: ${fmt(s.mark)}/${MAX}`); });
    L.push('', `Total score: ${fmt(o.marks)}/${o.maxMarks}`);
    return L.join('\n');
  }
  function renderResults() {
    view.innerHTML = '';
    const o = overall(), card = el('section', 'sec resultcard');
    card.append(el('h2', '', 'My results'));
    const nm = el('div', 'namebox'); nm.append(el('label', '', 'Student name')); nm.firstChild.htmlFor = 'nm';
    const inp = el('input', 'nameinp'); inp.id = 'nm'; inp.type = 'text'; inp.placeholder = 'Write your full name'; inp.value = S.name; inp.autocomplete = 'name';
    inp.oninput = () => { S.name = inp.value; save(); const pn = $('#pname'); if (pn) pn.textContent = S.name; };
    nm.append(inp); card.append(nm);
    const pr = el('p', 'printonly'); pr.innerHTML = '<b id="pname"></b> · ' + today(); card.append(pr); $('#pname', card).textContent = S.name;

    const g = gradeOf(o.pct), big = el('div', 'big');
    big.innerHTML = `<div class="pct">${o.pct}<small>%</small></div><div class="grade ${g === 'F' ? 'gF' : ''}">${g}</div>`;
    card.append(big, el('p', 'sub', `${fmt(o.marks)} marks out of ${o.maxMarks} (each tutorial is out of ${MAX}) · ${o.answered}/${o.total} questions answered`));
    if (o.answered < o.total) card.append(el('p', 'warnnote', `You still have ${o.total - o.answered} unanswered question(s). They count as zero until you answer them.`));
    if (o.held) card.append(el('p', 'infonote', `${o.held} listening or writing answer(s) are waiting for your teacher and are not in the score.`));

    const list = el('div', 'tbars');
    T.forEach((t, i) => {
      const s = tutStats(i), r = el('button', 'trow'); r.type = 'button';
      r.innerHTML = `<span class="tl">Tutorial ${t.n}<em>${t.sub || ''}</em></span><span class="tb"><i class="${s.pct >= 60 ? 'ok' : 'low'}" style="width:${s.pct}%"></i></span><span class="ts">${fmt(s.mark)}/${MAX}</span>`;
      r.onclick = () => go(i); list.append(r);
    });
    card.append(list);
    const scale = el('details', 'scale'); scale.append(el('summary', '', 'Grade scale'), el('p', '', 'A+ 95–100 · A 90–94 · B+ 85–89 · B 80–84 · C+ 75–79 · C 70–74 · D+ 65–69 · D 60–64 · F below 60')); card.append(scale);

    if (!PREVIEW) {
      const lk = el('details', 'scale'); lk.append(el('summary', '', 'Links to send each tutorial alone'));
      T.forEach((t, i) => { const r = el('div', 'linkrow'); r.append(el('span', '', `Tutorial ${t.n}`));
        const b = el('button', 'btn small', 'Copy link'); b.type = 'button'; b.onclick = async () => { await copyText(linkFor(i)); toast('Link copied for Tutorial ' + t.n); }; r.append(b); lk.append(r); });
      card.append(lk);
    }
    const act = el('div', 'actions');
    const copy = el('button', 'btn', '📋 Copy results'); copy.type = 'button';
    copy.onclick = async () => { const t = resultsText();
      try { await navigator.clipboard.writeText(t); } catch (e) { const ta = el('textarea'); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); } catch (x) {} ta.remove(); }
      toast('Copied. Paste it into Telegram, email or Blackboard.'); };
    act.append(copy);
    if (!PREVIEW) {
      const share = el('button', 'btn', '📤 Share'); share.type = 'button';
      share.onclick = async () => { const t = resultsText(); if (navigator.share) { try { await navigator.share({ title: H.course + ' – Results', text: t }); } catch (e) {} } else copy.click(); };
      const print = el('button', 'btn', '🖨️ Print / save PDF'); print.type = 'button'; print.onclick = () => window.print();
      act.append(share, print);
    }
    const reset = el('button', 'btn danger', '↺ Reset all'); reset.type = 'button';
    reset.onclick = () => {
      if (!reset.dataset.sure) { reset.dataset.sure = 1; reset.textContent = 'Tap again to delete everything'; setTimeout(() => { delete reset.dataset.sure; reset.textContent = '↺ Reset all'; }, 3500); return; }
      S = { name: '', tab: T.length, ans: {} }; save(); render();
    };
    act.append(reset); card.append(act); view.append(card);
  }

  /* ---------- install ---------- */
  let deferred; const ib = $('#install');
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; if (ib) ib.hidden = false; });
  if (ib) ib.onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; ib.hidden = true; };
  window.addEventListener('appinstalled', () => { if (ib) ib.hidden = true; });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  const hint = $('#ioshint');
  if (hint && ios && !standalone && !PREVIEW) { hint.hidden = false; $('#ioshint button').onclick = () => { hint.hidden = true; }; }
  if (!PREVIEW && 'serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

  if (S.tab > T.length || S.tab < 0) S.tab = 0;
  if (ONLY == null && S.tab < T.length && !unlocked(S.tab)) { let f = 0; while (f + 1 < T.length && unlocked(f + 1)) f++; S.tab = f; }
  function buildAbout() {
    const old = $('#about'); if (old) old.remove();
    const d = el('details', 'about'); d.id = 'about'; d.append(el('summary', '', 'ℹ️ About this app'), el('p', '', ABOUT));
    let first = true; try { first = !localStorage.getItem('ngl111-about'); localStorage.setItem('ngl111-about', '1'); } catch (e) {}
    d.open = first; $('#head').after(d);
  }
  buildHeader(); buildAbout(); render();
})();
