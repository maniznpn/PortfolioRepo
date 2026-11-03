// Mobile navigation: on small screens the header links move into a Menu panel.
(() => {
  const nav = document.querySelector('header nav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a')];
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'nav-toggle';
  btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'nav-panel');
  btn.innerHTML = '<span>Menu</span><i aria-hidden="true"></i>';
  const panel = document.createElement('div');
  panel.id = 'nav-panel'; panel.className = 'nav-panel'; panel.setAttribute('aria-label', 'Site');
  links.forEach((a) => panel.appendChild(a.cloneNode(true)));
  nav.appendChild(btn); nav.parentElement.appendChild(panel);
  document.documentElement.classList.add('js-nav');
  const label = btn.querySelector('span');
  const set = (open) => {
    btn.setAttribute('aria-expanded', String(open)); panel.classList.toggle('open', open);
    label.textContent = open ? 'Close' : 'Menu';
    panel.inert = !open;
  };
  set(false);
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) { set(false); btn.focus(); } });
  addEventListener('pointerdown', (e) => { if (panel.classList.contains('open') && !panel.contains(e.target) && !btn.contains(e.target)) set(false); });
  addEventListener('scroll', () => { if (panel.classList.contains('open')) set(false); }, { passive: true });
  // transparent over the hero, black after the first scroll
  const root = document.documentElement;
  let solid = null;
  const paint = () => { const s = scrollY > 8; if (s !== solid) { solid = s; root.classList.toggle('nav-solid', s); } };
  addEventListener('scroll', paint, { passive: true }); paint();
  matchMedia('(min-width: 701px)').addEventListener('change', (m) => { if (m.matches) set(false); });
})();
