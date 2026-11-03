// Hero — role cycle, pointer light and card tilt, request tracer runs.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // intro: shown on every page load (the class is set by a tiny script in <head> so nothing flashes)
  const root = document.documentElement;
  // (in film mode the film controller plays the intro as its first scene instead)
  if (root.classList.contains('intro-on') && !root.classList.contains('film')) {
    let done = false;
    const leave = () => {
      if (done) return; done = true;
      root.classList.add('intro-out');
      setTimeout(() => { root.classList.remove('intro-on', 'intro-out'); document.querySelector('.intro')?.remove(); }, 900);
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => removeEventListener(t, leave));
    };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => addEventListener(t, leave, { passive: true }));
    setTimeout(leave, 2600);
  }

  // role cycle: swap the second half of the role line every few seconds
  const cyc = hero.querySelector('.role-cycle');
  if (cyc && !reduce) {
    const words = cyc.dataset.words.split('|');
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      cyc.classList.add('out');
      setTimeout(() => { i = (i + 1) % words.length; cyc.textContent = words[i]; cyc.classList.remove('out'); }, 260);
    }, 2600);
  }

  // pointer: move the light and tilt the tracer card a few degrees
  const light = hero.querySelector('.hero-light');
  const card = hero.querySelector('.tr-card');
  if (!reduce && matchMedia('(hover: hover)').matches) {
    let raf = 0, ev = null;
    hero.addEventListener('pointermove', (e) => {
      ev = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const lr = light.getBoundingClientRect();
        light.style.setProperty('--mx', (ev.clientX - lr.left) + 'px');
        light.style.setProperty('--my', (ev.clientY - lr.top) + 'px');
        const cr = card.getBoundingClientRect();
        const x = (ev.clientX - (cr.left + cr.width / 2)) / cr.width;
        const y = (ev.clientY - (cr.top + cr.height / 2)) / cr.height;
        card.style.setProperty('--ry', (Math.max(-1, Math.min(1, x)) * 6).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (Math.max(-1, Math.min(1, -y)) * 5).toFixed(2) + 'deg');
      });
    });
    hero.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
  }

  // tracer: run once on arrival, again every few seconds while visible, and on "Send request"
  const tracer = hero.querySelector('.tracer');
  const send = hero.querySelector('.tr-send');
  if (!tracer || reduce) return;
  let loop = 0, visible = false;
  const run = () => { tracer.classList.remove('run'); void tracer.offsetWidth; tracer.classList.add('run'); };
  const start = () => { clearInterval(loop); loop = setInterval(() => { if (visible && !document.hidden) run(); }, 7000); };
  send.addEventListener('click', () => { run(); start(); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(tracer);
  setTimeout(run, 400);
  start();
})();
