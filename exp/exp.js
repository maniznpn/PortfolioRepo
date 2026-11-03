// Experience — timeline line follows the scroll, roles arrive once, live durations, card spotlight.
(() => {
  const sec = document.querySelector('.exp');
  if (!sec) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js-exp');

  const line = sec.querySelector('.exp-line');
  const items = [...sec.querySelectorAll('.exp-item')];
  const head = sec.querySelector('.exp-head');

  // durations that keep moving: the current role, and total time in production
  const months = (from) => { const [y, m] = from.split('-').map(Number); const n = new Date(); return Math.max(1, (n.getFullYear() - y) * 12 + (n.getMonth() + 1 - m)); };
  const fmt = (mo) => { const y = Math.floor(mo / 12), m = mo % 12; return [y && `${y} yr${y > 1 ? 's' : ''}`, m && `${m} mo${m > 1 ? 's' : ''}`].filter(Boolean).join(' '); };
  sec.querySelectorAll('.exp-dur[data-from]').forEach((el) => { el.textContent = fmt(months(el.dataset.from)); });
  const yearsEl = sec.querySelector('.exp-years');
  const years = Math.floor(months(yearsEl.dataset.since) / 12 * 10) / 10;

  sec.querySelectorAll('.exp-tags').forEach((t) => [...t.children].forEach((s, i) => s.style.setProperty('--t', i)));

  // count the years up when the heading arrives
  function countUp() {
    if (reduce) { yearsEl.textContent = years.toFixed(1); return; }
    const t0 = performance.now(), dur = 1100;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3); yearsEl.textContent = (years * e).toFixed(1); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (e.target === head) countUp();
    io.unobserve(e.target);
  }), { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
  io.observe(head); items.forEach((i) => io.observe(i));

  // the line fills to the middle of the screen; dots light as it reaches them
  let queued = false;
  function draw() {
    queued = false;
    const r = line.getBoundingClientRect();
    const mid = innerHeight * 0.6;
    const p = reduce ? 1 : Math.min(1, Math.max(0, (mid - r.top) / r.height));
    line.style.setProperty('--exp-p', p.toFixed(4));
    items.forEach((it) => {
      const d = it.querySelector('.exp-dot').getBoundingClientRect();
      it.classList.toggle('reached', reduce || d.top + d.height / 2 <= r.top + p * r.height + 4);
    });
  }
  const req = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req, { passive: true });
  draw();

  // a soft light follows the pointer across each card
  if (matchMedia('(hover: hover)').matches) sec.querySelectorAll('.exp-card').forEach((c) => {
    c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); c.style.setProperty('--cx', (e.clientX - r.left) + 'px'); c.style.setProperty('--cy', (e.clientY - r.top) + 'px'); });
  });
})();
