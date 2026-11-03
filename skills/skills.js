// Technical skills — load logos (falling back to text badges), stagger tiles in, card spotlight.
(() => {
  const sec = document.querySelector('.skills');
  if (!sec) return;
  document.documentElement.classList.add('js-skills');

  // show each logo only once it has loaded; a failed one keeps its text badge
  const cache = {};
  sec.querySelectorAll('.sk-ico[data-logo]').forEach((el) => {
    const url = new URL(el.dataset.logo, document.baseURI).href;
    const p = cache[url] || (cache[url] = new Promise((ok, no) => { const im = new Image(); im.onload = ok; im.onerror = no; im.src = url; }));
    p.then(() => { el.style.setProperty('--logo', `url("${url}")`); el.classList.add('has-logo'); }, () => {});
  });

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  sec.querySelectorAll('.sk-card').forEach((c) => io.observe(c));

  if (matchMedia('(hover: hover)').matches) sec.querySelectorAll('.sk-card').forEach((c) => {
    c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); c.style.setProperty('--cx', (e.clientX - r.left) + 'px'); c.style.setProperty('--cy', (e.clientY - r.top) + 'px'); });
  });
})();
