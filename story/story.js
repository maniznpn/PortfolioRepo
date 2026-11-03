// Developer Journey — one full screen per stage.
//
// Moving between screens
// - Mouse wheel / trackpad: one gesture moves exactly one screen. While that move runs, and until the
//   gesture's momentum has died down, further wheel events are swallowed so they cannot push the page
//   back and forth across a boundary (which would restart a screen's animations).
// - Touch: one swipe moves one screen.
// - Keyboard, scrollbar, anchor links: scroll freely; when the page comes to rest between two screens
//   it settles on the nearer one in the direction of travel.
// - Autoplay: while the reader rests on a screen, the story moves on after that screen has played.
//   Any input takes over; the Pause/Play button switches it off and on.
// Each screen's animation is CSS keyed off data-stage; the character's beats are timed here.
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
  // how long each screen holds before autoplay moves on (ms)
  const DWELL = [2800, 2800, 3600, 3000, 2800, 3300, 4000];

  let stage = -2;            // screen currently shown
  let settled = -1;          // screen the page last came to rest on (-1 above the story, 8 below)
  let beatTimers = [];
  let queued = false, listening = false;
  let auto = !reduce.matches, autoT = 0;
  let moving = null;         // { target, until } while a programmatic move runs
  let lastWheel = 0, lastMag = 0, idleT = 0, touchY = null, quietUntil = 0, lastMoveWheel = 0, lastMagBeforeMove = 0;

  const metrics = () => {
    const H = pin.offsetHeight;
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    const start = track.getBoundingClientRect().top + scrollY - top; // scrollY at screen 0
    return { H, start, pos: (scrollY - start) / H };
  };
  const inStory = (pos) => pos > -0.02 && pos < LAST + 0.02;

  /* ---------- what is shown ---------- */
  function setPose(p, late) {
    if (track.dataset.pose !== p) track.dataset.pose = p;
    track.toggleAttribute('data-late', !!late);
  }

  function enter(s) {
    stage = s;
    track.dataset.stage = s;
    rail.forEach((b, i) => {
      b.classList.toggle('done', i <= s);
      if (i === s) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
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
    if (!moving) { if (pos < -0.02) settled = -1; else if (pos > LAST + 0.02) settled = LAST + 1; }
    const pre = pos < -0.2;
    track.toggleAttribute('data-pre', pre);
    if (pre) {
      if (stage !== -1) { stage = -1; beatTimers.forEach(clearTimeout); beatTimers = []; track.dataset.stage = 0; setPose('thinking'); }
      track.style.setProperty('--f', 0); track.style.setProperty('--fa', 0);
      return;
    }

    // which screen: during a move, show its destination once we are past halfway; otherwise the
    // nearest screen, with hysteresis so the page resting near a boundary cannot flicker between two
    let s = stage < 0 ? Math.round(c) : stage;
    if (moving) { if (Math.abs(c - moving.target) < 0.5) s = moving.target; }
    else if (Math.abs(c - stage) > 0.6 || stage < 0) s = Math.round(c);
    const f = c - s;
    track.style.setProperty('--f', Math.max(-.5, Math.min(.5, f)).toFixed(3));
    track.style.setProperty('--fa', Math.min(.5, Math.abs(f)).toFixed(3));
    if (s !== stage) enter(s);

    if (moving && Math.abs(pos - moving.target) < 0.004) arrive();
  }
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };

  /* ---------- moving ---------- */
  function goTo(s) {
    s = Math.max(0, Math.min(LAST, s));
    cancelAuto();
    const { H, start, pos } = metrics();
    if (Math.abs(pos - s) < 0.004) { moving = null; settled = s; schedule(); return; }
    moving = { target: s, until: performance.now() + 1400 };
    scrollTo({ top: Math.round(start + s * H), behavior: reduce.matches ? 'instant' : 'smooth' });
    clearTimeout(idleT); idleT = setTimeout(checkArrival, 1450);
  }
  function arrive() {
    if (!moving) return;
    settled = moving.target;
    moving = null;
    quietUntil = performance.now() + 300; // let the swipe's momentum die out before the next screen
    schedule();
  }
  function checkArrival() {
    if (!moving) return;
    const { pos } = metrics();
    if (Math.abs(pos - moving.target) < 0.02) arrive();
    else { moving = null; settle(); } // something interrupted the move: settle from where we are
  }

  // the page came to rest without a wheel gesture (keys, scrollbar, a link): finish on a screen
  function settle() {
    if (moving) return;
    const { pos } = metrics();
    if (pos < -0.02) { settled = -1; cancelAuto(); return; }
    if (pos > LAST + 0.02) { settled = LAST + 1; cancelAuto(); return; }
    const near = Math.round(pos);
    if (Math.abs(pos - near) < 0.01) { settled = near; schedule(); return; }
    let target;
    if (settled < 0) target = Math.floor(pos);
    else if (settled > LAST) target = Math.ceil(pos);
    else { const d = pos - settled; target = d > 0.08 ? Math.ceil(pos) : d < -0.08 ? Math.floor(pos) : near; }
    goTo(target);
  }

  // one wheel gesture = one screen
  function onWheel(e) {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // pinch-zoom, sideways
    const { pos } = metrics();
    if (!inStory(pos)) return;
    const down = e.deltaY > 0;
    const now = performance.now();
    const mag = Math.abs(e.deltaY);
    // a new gesture starts after a pause, or when the deltas jump up again (momentum only decays)
    const isNew = (now - lastWheel > 260 && now > quietUntil) || (mag > lastMag * 1.8 && mag > 14);
    lastWheel = now; lastMag = mag;
    // leaving the story at either end: let the page scroll normally
    if (!moving && ((pos >= LAST - 0.02 && down) || (pos <= 0.02 && !down))) return;
    e.preventDefault();
    if (moving) {                          // a fresh swipe during a move chains to the next screen
      if (mag > lastMagBeforeMove * 1.8 && mag > 14 || now - lastMoveWheel > 350) { lastMoveWheel = now; goTo(moving.target + (down ? 1 : -1)); }
      lastMoveWheel = now; lastMagBeforeMove = mag;
      return;
    }
    if (!isNew) return;                    // swallow the rest of this gesture
    lastMoveWheel = now; lastMagBeforeMove = mag;
    if (Math.abs(e.deltaY) < 4) return;   // a stray tick
    if (settled < 0 && down) goTo(Math.floor(pos));            // arriving from above: first screen
    else if (settled > LAST && !down) goTo(Math.ceil(pos));   // arriving from below: last screen
    else goTo(from(pos) + (down ? 1 : -1));
  }
  // the screen a step is counted from: where we came to rest, or the screen just reached from outside
  function from(pos) {
    if (settled >= 0 && settled <= LAST && Math.abs(pos - settled) < 0.5) return settled;
    return Math.round(pos);
  }

  // one swipe = one screen
  function onTouchStart(e) { touchY = e.touches[0].clientY; }
  function onTouchMove(e) {
    if (touchY === null) return;
    const { pos } = metrics();
    if (!inStory(pos)) return;
    const dy = touchY - e.touches[0].clientY; // > 0 = swiping up = going down the page
    if (!moving && ((pos >= LAST - 0.02 && dy > 0) || (pos <= 0.02 && dy < 0))) return;
    e.preventDefault();
    if (moving || Math.abs(dy) < 36) return;
    if (settled < 0 && dy > 0) goTo(Math.floor(pos));
    else if (settled > LAST && dy < 0) goTo(Math.ceil(pos));
    else goTo(from(pos) + (dy > 0 ? 1 : -1));
    touchY = null;
  }
  function onTouchEnd() { touchY = null; }

  function onScroll() {
    request();
    if (moving) return;
    if (performance.now() - lastWheel > 300) {           // not a wheel gesture: settle once it rests
      clearTimeout(idleT); idleT = setTimeout(settle, 180);
    }
    if (track.hasAttribute('data-auto')) cancelAuto();
  }

  /* ---------- autoplay ---------- */
  function cancelAuto() { clearTimeout(autoT); track.removeAttribute('data-auto'); }
  function schedule() {
    cancelAuto();
    if (!auto || !listening || document.hidden || moving || settled < 0 || settled >= LAST) return;
    const d = DWELL[settled];
    track.style.setProperty('--dwell', d + 'ms');
    void track.offsetWidth; // restart the rail's countdown
    track.setAttribute('data-auto', '');
    autoT = setTimeout(() => goTo(settled + 1), d);
  }
  function setAuto(on) {
    auto = on;
    toggle.setAttribute('aria-pressed', String(on));
    toggle.textContent = on ? 'Pause' : 'Play';
    toggle.setAttribute('aria-label', on ? 'Pause autoplay' : 'Play the journey automatically');
    if (on) schedule(); else cancelAuto();
  }

  /* ---------- wiring ---------- */
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !listening) {
      listening = true;
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('wheel', onWheel, { passive: false });
      addEventListener('touchstart', onTouchStart, { passive: true });
      addEventListener('touchmove', onTouchMove, { passive: false });
      addEventListener('touchend', onTouchEnd, { passive: true });
      request();
    } else if (!e.isIntersecting && listening) {
      listening = false;
      removeEventListener('scroll', onScroll);
      removeEventListener('wheel', onWheel);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchmove', onTouchMove);
      removeEventListener('touchend', onTouchEnd);
      cancelAuto();
    }
  }, { rootMargin: '100px 0px' }).observe(track);
  addEventListener('resize', request, { passive: true });

  rail.forEach((b) => b.addEventListener('click', () => goTo(+b.dataset.go)));
  toggle.addEventListener('click', () => setAuto(!auto));
  // leave the story at any point: jump straight to the section after it
  skip.addEventListener('click', () => {
    cancelAuto(); moving = null; settled = LAST + 1;
    const next = track.closest('section').nextElementSibling;
    const top = next ? next.getBoundingClientRect().top + scrollY - 72 : track.getBoundingClientRect().bottom + scrollY;
    scrollTo({ top, behavior: 'instant' });
    if (next) { next.setAttribute('tabindex', '-1'); next.focus({ preventScroll: true }); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAuto(); else schedule(); });

  { const { pos } = metrics(); settled = pos < -0.02 ? -1 : pos > LAST + 0.02 ? LAST + 1 : Math.round(pos); }
  setAuto(auto);
  update();
})();
