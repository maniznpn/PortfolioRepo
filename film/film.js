// Film mode — plays the whole portfolio as one looping clip on a fixed screen.
// Scenes: intro → hero → journey (its 8 stages) → experience → projects → skills → contact → loop.
// Controls: previous / play-pause / next, a progress bar per scene (click to jump), ← → and Space,
// and every in-page link (#journey, #projects …) jumps to its scene.
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('film')) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);

  const intro = $('.intro');
  const hero = $('main > .hero');
  const scenes = [
    { id: 'intro', label: 'Intro', el: hero, dur: 2800, intro: true },
    { id: 'top', label: 'Hero', el: hero, dur: 6500, pan: true },
    { id: 'journey', label: 'Journey', el: $('#journey'), journey: true },
    { id: 'experience', label: 'Experience', el: $('#experience'), dur: 7000, pan: true, reveal: '.exp-head,.exp-item' },
    { id: 'projects', label: 'Projects', el: $('#projects'), dur: 6500, pan: true },
    { id: 'skills', label: 'Skills', el: $('#skills'), dur: 7000, pan: true, reveal: '.sk-card' },
    { id: 'message', label: 'Say hello', el: $('#message'), dur: 9000 },
    { id: 'contact', label: 'Contact', el: $('footer'), dur: 6000 }
  ].filter((s) => s.el);

  const FJ = () => window.FilmJourney;
  const journeyTimes = () => { // when each journey stage starts, inside the journey scene
    const d = FJ() ? FJ().dwell : [3000, 3000, 3600, 3000, 2800, 3300, 4000, 3600];
    let t = 0; return d.map((x) => { const at = t; t += x; return at; }).concat([t]);
  };

  /* ---------- controls ---------- */
  const bar = document.createElement('div');
  bar.className = 'film-bar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Portfolio film controls');
  const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  bar.innerHTML =
    `<button type="button" class="fb-prev" aria-label="Previous scene">${icon('M6 5h2v14H6zM19 5v14L9 12z')}</button>` +
    `<button type="button" class="fb-play" aria-label="Pause">${icon('M7 5h4v14H7zM13 5h4v14h-4z').replace('<svg', '<svg class="i-pause"')}${icon('M8 5v14l11-7z').replace('<svg', '<svg class="i-play"')}</button>` +
    `<button type="button" class="fb-next" aria-label="Next scene">${icon('M16 5h2v14h-2zM5 5v14l10-7z')}</button>` +
    `<div class="fb-track">${scenes.map((s, i) => `<button type="button" class="fb-seg" data-i="${i}" aria-label="Go to ${s.label}"><i></i><span>${s.label}</span></button>`).join('')}</div>` +
    `<span class="fb-label" aria-live="polite"></span>`;
  document.body.appendChild(bar);
  const segs = [...bar.querySelectorAll('.fb-seg')];
  const label = bar.querySelector('.fb-label');
  const playBtn = bar.querySelector('.fb-play');

  /* ---------- state ---------- */
  let cur = -1, elapsed = 0, dur = 1, paused = reduce, last = performance.now(), panMax = 0, jStage = -1;

  function restartAnimations(el) {
    const all = [el, ...el.querySelectorAll('*')];
    all.forEach((n) => { n.style.animation = 'none'; });
    void el.offsetWidth;
    all.forEach((n) => { n.style.animation = ''; });
  }
  function sceneDuration(s) {
    if (s.journey) return journeyTimes().slice(-1)[0];
    let d = s.dur;
    if (s.pan && !reduce) { // long scenes pan down like a camera: hold, travel, hold
      s.el.style.setProperty('--pan', '0px');
      panMax = Math.max(0, s.el.scrollHeight - s.el.clientHeight);
      if (panMax > 8) d = Math.max(d, 2200 + Math.min(panMax / 0.08, 13000) + 2600);
    } else panMax = 0;
    return d;
  }

  function show(i, how) {
    i = (i + scenes.length) % scenes.length;
    const prev = scenes[cur], next = scenes[i];
    // the intro lives over the hero, so they share the hero element
    if (prev && prev.el !== next.el) {
      prev.el.classList.remove('scene-on'); prev.el.classList.add('scene-off');
      setTimeout(() => prev.el.classList.remove('scene-off'), 750);
    }
    cur = i; elapsed = 0; jStage = -1;
    if (next.intro) {
      intro.style.display = '';
      root.classList.remove('intro-out'); root.classList.add('intro-on');
      restartAnimations(intro);
      hero.classList.add('scene-on'); restartAnimations(hero); hero.style.setProperty('--pan', '0px');
    } else if (prev && prev.intro && next.el === hero) {
      root.classList.add('intro-out');                     // the intro wipes away over the hero
      setTimeout(() => { if (!scenes[cur].intro) root.classList.remove('intro-on', 'intro-out'); }, 900);
    } else {
      root.classList.remove('intro-on', 'intro-out');
      next.el.classList.remove('scene-off'); next.el.classList.add('scene-on');
      if (how !== 'keep') restartAnimations(next.el);
    }
    if (next.reveal) { // start the timeline / cards empty, then reveal them as the camera reaches them
      next.el.querySelectorAll(next.reveal).forEach((n) => n.classList.remove('in'));
      void next.el.offsetWidth;
    }
    if (next.journey && FJ()) { FJ().go(0, true); jStage = 0; }
    dur = sceneDuration(next);
    segs.forEach((s, k) => { s.classList.toggle('done', k < i); s.classList.toggle('on', k === i); s.style.setProperty('--k', k < i ? 1 : 0); });
    label.textContent = next.label;
    if (next.el.focus && how === 'jump') { next.el.setAttribute('tabindex', '-1'); next.el.focus({ preventScroll: true }); }
  }

  function frame(now) {
    const dt = Math.min(100, now - last); last = now;
    const s = scenes[cur];
    if (!paused && !document.hidden) elapsed += dt;
    const k = Math.min(1, elapsed / dur);
    segs[cur].style.setProperty('--k', k.toFixed(4));
    // camera pan for long scenes
    if (s.pan && panMax > 8) {
      const t = Math.min(1, Math.max(0, (elapsed - 2200) / (dur - 4800)));
      const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      s.el.style.setProperty('--pan', (-panMax * e).toFixed(1) + 'px');
      if (s.id === 'experience') dispatchEvent(new Event('scroll')); // the timeline line follows the camera
    }
    if (s.reveal) s.el.querySelectorAll(s.reveal).forEach((n) => { if (!n.classList.contains('in') && n.getBoundingClientRect().top < innerHeight * 0.9) n.classList.add('in'); });
    // journey stages inside the journey scene
    if (s.journey && FJ()) {
      const times = journeyTimes(); let st = 0;
      while (st < times.length - 2 && elapsed >= times[st + 1]) st++;
      if (st !== jStage) { jStage = st; FJ().go(st); }
    }
    if (elapsed >= dur) show(cur + 1);
    requestAnimationFrame(frame);
  }

  function setPaused(p) {
    paused = p;
    bar.classList.toggle('paused', p);
    playBtn.setAttribute('aria-label', p ? 'Play' : 'Pause');
  }

  /* ---------- wiring ---------- */
  bar.querySelector('.fb-prev').addEventListener('click', () => show(elapsed > 1500 ? cur : cur - 1, 'jump'));
  bar.querySelector('.fb-next').addEventListener('click', () => show(cur + 1, 'jump'));
  playBtn.addEventListener('click', () => setPaused(!paused));
  segs.forEach((b) => b.addEventListener('click', () => show(+b.dataset.i, 'jump')));
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); show(cur + 1, 'jump'); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(cur - 1, 'jump'); }
    else if (e.key === ' ' && !(e.target.closest && e.target.closest('button,a'))) { e.preventDefault(); setPaused(!paused); }
  });
  // in-page links jump to their scene
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const i = scenes.findIndex((s) => s.id === id || (id === '' && s.id === 'top'));
    if (i >= 0) { e.preventDefault(); show(i, 'jump'); }
  });
  // a swipe or wheel flick moves between scenes too (the page itself never scrolls)
  let wheelLock = 0, touchY = null;
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || (e.target.closest && e.target.closest('.msg-form'))) return;
    const sc = scenes[cur].el;
    if (reduce && sc.scrollHeight > sc.clientHeight) return; // let reduced-motion readers scroll a long scene
    const now = performance.now();
    if (Math.abs(e.deltaY) < 30 || now < wheelLock) return;
    wheelLock = now + 900; show(cur + (e.deltaY > 0 ? 1 : -1), 'jump');
  }, { passive: true });
  addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (touchY === null) return;
    const dy = touchY - e.changedTouches[0].clientY; touchY = null;
    if (Math.abs(dy) > 60 && !e.target.closest('.film-bar') && !e.target.closest('.msg-form')) show(cur + (dy > 0 ? 1 : -1), 'jump');
  }, { passive: true });

  // other parts of the page (the message form) can hold the film while someone is typing
  window.Film = { pause: () => setPaused(true), play: () => setPaused(false), go: (id) => { const i = scenes.findIndex((s) => s.id === id); if (i >= 0) show(i, 'jump'); } };

  root.classList.add('film-ready');
  setPaused(paused);
  if (reduce) { intro && (intro.style.display = 'none'); root.classList.remove('intro-on'); show(1); }
  else show(0);
  requestAnimationFrame((t) => { last = t; frame(t); });
})();
