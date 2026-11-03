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
  // see-through arrows at the screen's edges, on every scene (inside the journey they step its stages)
  const arrows = document.createElement('div');
  arrows.className = 'film-arrows';
  arrows.innerHTML =
    `<button type="button" class="fa-prev" aria-label="Previous">${icon('M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z')}</button>` +
    `<button type="button" class="fa-next" aria-label="Next">${icon('M8.6 5.4 10 4l8 8-8 8-1.4-1.4 6.6-6.6z')}</button>`;
  document.body.appendChild(arrows);
  const segs = [...bar.querySelectorAll('.fb-seg')];
  const label = bar.querySelector('.fb-label');
  const playBtn = bar.querySelector('.fb-play');

  /* ---------- state ---------- */
  let cur = -1, elapsed = 0, dur = 1, paused = reduce, last = performance.now(), panMax = 0, jStage = -1;
  // manualPan: the visitor scrolled this scene by hand; held: paused on purpose (Pause button, or typing)
  let manualPan = false, held = reduce, resumeT = 0, edgeAt = 0;

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
    cur = i; elapsed = 0; jStage = -1; manualPan = false;
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
    if (s.pan && panMax > 8 && !manualPan) {
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

  // one step: the next journey stage while inside the journey, otherwise the next scene
  function step(dir) {
    leave();
    const s = scenes[cur];
    if (s.journey && FJ()) {
      const times = journeyTimes(); const st = jStage + dir;
      if (st >= 0 && st <= times.length - 2) { elapsed = times[st] + 1; jStage = st; FJ().go(st); return; }
    }
    show(cur + dir, 'jump');
  }

  /* ---------- wiring ---------- */
  arrows.querySelector('.fa-prev').addEventListener('click', () => step(-1));
  arrows.querySelector('.fa-next').addEventListener('click', () => step(1));
  bar.querySelector('.fb-prev').addEventListener('click', () => { leave(); show(elapsed > 1500 ? cur : cur - 1, 'jump'); });
  bar.querySelector('.fb-next').addEventListener('click', () => { leave(); show(cur + 1, 'jump'); });
  playBtn.addEventListener('click', () => { if (paused) { held = false; clearTimeout(resumeT); bar.classList.remove('waiting'); setPaused(false); } else hold(true); });
  segs.forEach((b) => b.addEventListener('click', () => { leave(); show(+b.dataset.i, 'jump'); }));
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input,textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
    else if (e.key === ' ' && !(e.target.closest && e.target.closest('button,a'))) { e.preventDefault(); playBtn.click(); }
  });
  // in-page links jump to their scene
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const i = scenes.findIndex((s) => s.id === id || (id === '' && s.id === 'top'));
    if (i >= 0) { e.preventDefault(); leave(); show(i, 'jump'); }
  });
  // a swipe or wheel flick moves between scenes too (the page itself never scrolls) — also over the
  // message form; only a long message box that can still scroll that way keeps the gesture
  const innerScroll = (t, d) => {
    const ta = t.closest && t.closest('textarea');
    if (!ta || ta.scrollHeight <= ta.clientHeight + 1) return false;
    return d > 0 ? ta.scrollTop + ta.clientHeight < ta.scrollHeight - 1 : ta.scrollTop > 0;
  };
  // the visitor took the controls: hold the autoplay (Play resumes it) and let go of any field in the scene
  // after a few quiet seconds the film carries on by itself, unless it was paused on purpose
  const IDLE = 5000;
  function scheduleResume() {
    clearTimeout(resumeT);
    if (held) return;
    bar.classList.add('waiting');
    resumeT = setTimeout(() => {
      bar.classList.remove('waiting');
      if (held || document.querySelector('.msg-form:focus-within')) return;
      if (manualPan) elapsed = Math.max(elapsed, dur - 6000); // they read it by hand: linger, then move on
      setPaused(false);
    }, IDLE);
  }
  function hold(on) { held = on; clearTimeout(resumeT); bar.classList.remove('waiting'); setPaused(on ? true : paused); if (!on) scheduleResume(); }
  const leave = () => { setPaused(true); scheduleResume(); const a = document.activeElement; if (a && a.closest && a.closest('main,footer') && a.blur) a.blur(); };
  let wheelLock = 0, touchY = null;
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || innerScroll(e.target, e.deltaY)) return;
    const sc = scenes[cur].el;
    if (reduce && sc.scrollHeight > sc.clientHeight) return; // let reduced-motion readers scroll a long scene
    const now = performance.now();
    if (now < wheelLock) return;
    // a long scene scrolls by hand first; at its end, the next flick moves on
    const s = scenes[cur];
    if (s.pan && panMax > 8 && Math.abs(e.deltaY) > 0) {
      const curPan = parseFloat(sc.style.getPropertyValue('--pan')) || 0;
      const can = e.deltaY > 0 ? curPan > -panMax + 1 : curPan < -1;
      if (can) {
        manualPan = true; leave();
        const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
        sc.style.setProperty('--pan', Math.max(-panMax, Math.min(0, curPan - d)).toFixed(1) + 'px');
        if (s.id === 'experience') dispatchEvent(new Event('scroll'));
        edgeAt = now; return;
      }
      if (now - edgeAt < 450) { edgeAt = now; return; } // still the same swipe's momentum
    }
    if (Math.abs(e.deltaY) < 30) return;
    wheelLock = now + 900; step(e.deltaY > 0 ? 1 : -1);
  }, { passive: true });
  addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (touchY === null) return;
    const dy = touchY - e.changedTouches[0].clientY; touchY = null;
    if (Math.abs(dy) > 60 && !e.target.closest('.film-bar') && !innerScroll(e.target, dy)) step(dy > 0 ? 1 : -1);
  }, { passive: true });

  // other parts of the page (the message form) can hold the film while someone is typing
  window.Film = { hold, pause: () => setPaused(true), play: () => setPaused(false), next: () => { leave(); show(cur + 1, 'jump'); }, go: (id) => { const i = scenes.findIndex((s) => s.id === id); if (i >= 0) show(i, 'jump'); } };

  root.classList.add('film-ready');
  setPaused(paused);
  if (reduce) { intro && (intro.style.display = 'none'); root.classList.remove('intro-on'); show(1); }
  else show(0);
  requestAnimationFrame((t) => { last = t; frame(t); });
})();
