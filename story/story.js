// Developer Journey — a scroll-played story that never takes the scroll away.
//
// The page scrolls natively at all times: no wheel or touch interception, no snapping. Each screen
// owns one screen-height of scroll; the screen nearest the viewport is shown, and the in-between
// scroll drives the transition (the scene dips to dark and the caption drifts out, the next one
// rises in). Autoplay: when the reader stops inside the story, it glides on to the next screen after
// that screen has played; any input stops it at once. Each screen's animation is CSS keyed off
// data-stage; the character's beats inside a screen are timed here.
(() => {
  const track = document.querySelector('.journey-track');
  if (!track) return;
  document.documentElement.classList.add('js-journey');

  const pin = track.querySelector('.journey-pin');
  const rail = [...track.querySelectorAll('.journey-rail button[data-go]')];
  const toggle = track.querySelector('.journey-auto');
  const skip = track.querySelector('.journey-skip');
  const LAST = 7;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // [pose, at ms, sets data-late]
  const BEATS = [
    [['thinking', 0], ['excited', 1900, true]],          // idea lands
    [['thinking', 0]],                                   // planning
    [['coding', 0]],                                     // typing
    [['coding', 0], ['debugging', 1000]],                // the error appears
    [['solved', 0], ['excited', 1700]],                  // it clicks, then relief
    [['coding', 0]],                                     // tests run
    [['coding', 0], ['excited', 3500, true]],            // deploy completes
    [['relaxed', 0]]                                     // shipped
  ];
  // how long a screen holds before autoplay moves on (ms, counted from when it arrived)
  const DWELL = [3900, 3900, 4900, 4200, 3900, 4600, 5400];

  // split each title into words so they can rise out of a mask
  track.querySelectorAll('.journey-captions h3').forEach((h) => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map((w, i) => `<span class="jw" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
  });

  let stage = -2, enteredAt = 0, beatTimers = [], queued = false, listening = false;
  let auto = false, autoT = 0, autoScrolling = false, idleT = 0;

  const metrics = () => {
    const H = pin.offsetHeight;
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    const start = track.getBoundingClientRect().top + scrollY - top; // scrollY at screen 0
    return { H, start, pos: (scrollY - start) / H };
  };

  /* ---------- what is shown ---------- */
  function setPose(p, late) {
    if (track.dataset.pose !== p) track.dataset.pose = p;
    track.toggleAttribute('data-late', !!late);
  }

  function enter(s) {
    stage = s; enteredAt = performance.now();
    track.dataset.stage = s;
    rail.forEach((b, i) => {
      b.classList.toggle('done', i <= s);
      if (i === s) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    // a short cinematic cut over the change
    if (!reduce.matches) { track.classList.remove('cut'); void track.offsetWidth; track.classList.add('cut'); }
    beatTimers.forEach(clearTimeout); beatTimers = [];
    const beats = BEATS[s];
    if (reduce.matches) { const [p, , l] = beats[beats.length - 1]; setPose(p, l); return; }
    let late = false;
    beats.forEach(([p, at, l]) => {
      late = late || !!l;
      const lt = late;
      if (at === 0) setPose(p, lt); else beatTimers.push(setTimeout(() => setPose(p, lt), at));
    });
  }

  function update() {
    queued = false;
    const { pos } = metrics();
    const c = Math.min(LAST, Math.max(0, pos));
    track.style.setProperty('--p', (c / LAST).toFixed(4));

    // still scrolling the room into view: hold the first screen until it arrives
    const pre = pos < -0.2;
    track.toggleAttribute('data-pre', pre);
    if (pre) {
      if (stage !== -1) { stage = -1; beatTimers.forEach(clearTimeout); beatTimers = []; track.dataset.stage = 0; setPose('thinking'); }
      track.style.setProperty('--f', 0); track.style.setProperty('--fa', 0);
      return;
    }
    // the nearest screen, with a little hysteresis so resting near a boundary cannot flicker
    let s = stage < 0 ? Math.round(c) : stage;
    if (stage < 0 || Math.abs(c - stage) > 0.56) s = Math.round(c);
    const f = Math.max(-0.5, Math.min(0.5, c - s));
    track.style.setProperty('--f', f.toFixed(3));
    track.style.setProperty('--fa', Math.abs(f).toFixed(3));
    if (s !== stage) enter(s);
  }
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };

  /* ---------- autoplay: glide on when the reader rests ---------- */
  function cancelAuto() { clearTimeout(autoT); track.removeAttribute('data-auto'); }
  function glideTo(s) {
    const { H, start } = metrics();
    autoScrolling = true;
    scrollTo({ top: Math.round(start + Math.max(0, Math.min(LAST, s)) * H), behavior: reduce.matches ? 'instant' : 'smooth' });
  }
  function schedule() {
    cancelAuto();
    if (!auto || !listening || document.hidden) return;
    const { pos } = metrics();
    if (pos < -0.02 || pos >= LAST - 0.02) return;
    const s = Math.round(Math.min(LAST, Math.max(0, pos)));
    const wait = Math.max(900, DWELL[Math.min(s, DWELL.length - 1)] - (performance.now() - enteredAt));
    track.style.setProperty('--dwell', wait + 'ms');
    void track.offsetWidth; // restart the rail's countdown
    track.setAttribute('data-auto', '');
    autoT = setTimeout(() => glideTo(s + 1), wait);
  }
  // the reader took over: stop any autoplay at once (a running smooth scroll is cut by their input)
  const takeOver = () => { autoScrolling = false; cancelAuto(); };

  function onScroll() {
    request();
    track.classList.add('is-scrolling');
    if (!autoScrolling) cancelAuto();
    clearTimeout(idleT);
    idleT = setTimeout(rest, 260);
  }
  // the reader stopped scrolling: if they stopped between two screens, ease onto the nearer one
  // (only after input has gone quiet, and any new input cancels it), then plan the next glide
  // the reader stopped scrolling: never move the page for them — just let the transition settle
  // (the dip and drift fade out and the nearest screen shows whole), then plan autoplay
  function rest() {
    autoScrolling = false;
    track.classList.remove('is-scrolling');
    schedule();
  }


  function setAuto(on) {
    auto = on;
    toggle.setAttribute('aria-pressed', String(on));
    toggle.textContent = on ? 'Pause' : 'Play';
    toggle.setAttribute('aria-label', on ? 'Pause autoplay' : 'Play the journey automatically');
    if (on) schedule(); else cancelAuto();
  }

  /* ---------- film mode: the page-wide film controller drives the stages instead of the scroll ---------- */
  if (document.documentElement.classList.contains('film')) {
    track.removeAttribute('data-pre');
    track.style.setProperty('--f', 0); track.style.setProperty('--fa', 0);
    window.FilmJourney = {
      count: LAST + 1,
      dwell: DWELL.concat([4800]),
      go(s, force) {
        s = Math.max(0, Math.min(LAST, s));
        track.style.setProperty('--p', (s / LAST).toFixed(4));
        if (force || s !== stage) enter(s);
      }
    };
    enter(0);
    return;
  }

  /* ---------- arrows: step the stages by hand ---------- */
  const nav = document.createElement('div');
  nav.className = 'journey-arrows';
  nav.innerHTML = '<button type="button" class="ja-prev" aria-label="Previous stage"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z"/></svg></button>' +
    '<button type="button" class="ja-next" aria-label="Next stage"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 5.4 10 4l8 8-8 8-1.4-1.4 6.6-6.6z"/></svg></button>';
  pin.appendChild(nav);
  nav.querySelector('.ja-prev').addEventListener('click', () => { cancelAuto(); glideTo(Math.max(0, stage) - 1); });
  nav.querySelector('.ja-next').addEventListener('click', () => {
    cancelAuto();
    if (stage >= LAST) { skip.click(); return; }
    glideTo(Math.max(0, stage) + 1);
  });

  /* ---------- wiring ---------- */
  const inputs = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !listening) {
      listening = true;
      addEventListener('scroll', onScroll, { passive: true });
      inputs.forEach((t) => addEventListener(t, takeOver, { passive: true }));
      request(); schedule();
    } else if (!e.isIntersecting && listening) {
      listening = false;
      removeEventListener('scroll', onScroll);
      inputs.forEach((t) => removeEventListener(t, takeOver));
      cancelAuto();
    }
  }, { rootMargin: '100px 0px' }).observe(track);
  addEventListener('resize', request, { passive: true });

  rail.forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); cancelAuto(); glideTo(+b.dataset.go); }));
  toggle.addEventListener('pointerdown', (e) => e.stopPropagation());
  toggle.addEventListener('click', () => setAuto(!auto));
  skip.addEventListener('click', () => {
    cancelAuto();
    const next = track.closest('section').nextElementSibling;
    const top = next ? next.getBoundingClientRect().top + scrollY - 72 : track.getBoundingClientRect().bottom + scrollY;
    scrollTo({ top, behavior: 'instant' });
    if (next) { next.setAttribute('tabindex', '-1'); next.focus({ preventScroll: true }); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAuto(); else schedule(); });

  setAuto(auto);
  update();
})();
