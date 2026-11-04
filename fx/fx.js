// Text effects for the sections around the journey: words rise out of masks, sentences resolve
// word by word from a blur, key technologies light up with a sweeping underline, project tags type
// themselves out, and the contact email resolves letter by letter from the centre.
// Everything is split once here; CSS plays it when a scene becomes active (or a card arrives).
(() => {
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const KEY = /^(\.NET|ASP\.NET|EF|Core|Gitea|Actions|zero-downtime|IIS|RESTful|HemScreen|IzoneV2|RabbitMQ|MongoDB|PostgreSQL|microservices|Docker|Saga|Jenkins|CI\/CD|multi-DbContext)$/i;
  const bare = (w) => w.replace(/^[(“"']+|[)”"'.,;:!?]+$/g, '');

  // a sentence → words; keys get marked; the original text stays readable to screen readers
  function words(el, keys) {
    if (!el || el.dataset.fx) return;
    const text = el.textContent.trim();
    el.dataset.fx = 'words';
    el.innerHTML = `<span class="sr-only">${esc(text)}</span><span aria-hidden="true">` +
      text.split(/\s+/).map((w, i) => `<span class="dw${keys && KEY.test(bare(w)) ? ' key' : ''}" style="--i:${i}">${esc(w)}</span>`).join(' ') + '</span>';
  }
  // a heading → words that rise out of their own masks
  function rise(el) {
    if (!el || el.dataset.fx) return;
    const text = el.textContent.trim();
    el.dataset.fx = 'rise'; el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map((w, i) => `<span class="fw" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');
  }
  // a short label → characters that type in, followed by a cursor
  function type(el) {
    if (!el || el.dataset.fx) return;
    const text = el.textContent.trim();
    el.dataset.fx = 'type'; el.setAttribute('aria-label', text);
    let n = 0; // characters grouped per word, so a tag wraps between words, never inside one
    el.innerHTML = text.split(' ').map((w) => {
      const word = `<span class="tw">${[...w].map((c) => `<span class="tc" aria-hidden="true" style="--c:${n++}">${esc(c)}</span>`).join('')}</span>`;
      n++; return word;
    }).join(' ') + `<span class="tcur" aria-hidden="true" style="--c:${text.length}"></span>`;
  }
  // a single line → letters that resolve from the centre outward
  function centre(el) {
    if (!el || el.dataset.fx) return;
    const text = el.textContent.trim(), mid = (text.length - 1) / 2;
    el.dataset.fx = 'centre'; el.setAttribute('aria-label', text);
    el.innerHTML = [...text].map((c, i) => `<span class="cl" aria-hidden="true" style="--d:${Math.abs(i - mid).toFixed(1)}">${esc(c)}</span>`).join('');
  }

  // section headings
  document.querySelectorAll('#experience h2, #projects > h2, #skills > h2, #message h2').forEach(rise);
  words(document.querySelector('.msg-sub'));
  // experience: the summary, then every bullet with its key terms
  words(document.querySelector('.exp-sum'));
  document.querySelectorAll('.exp-card ul').forEach((ul) => [...ul.children].forEach((li, l) => { li.style.setProperty('--l', l); words(li, true); }));
  // projects: title, description with key terms, tags typed
  document.querySelectorAll('#projects .grid article').forEach((a, n) => {
    a.style.setProperty('--n', n);
    const h = a.querySelector('h3'); if (h) rise(h);
    words(a.querySelector('p'), true);
    type(a.querySelector('b'));
  });
  // contact: a real tagline line, and the email resolving from the centre
  const foot = document.querySelector('footer');
  if (foot && !foot.querySelector('.ft-tag')) {
    const t = document.createElement('p'); t.className = 'ft-tag'; t.textContent = "Let's build something reliable.";
    foot.prepend(t); words(t);
    centre(foot.querySelector(':scope > a'));
  }
  // without the film (phones, tablets), each section plays its entrance the first time it scrolls into view
  if (!document.documentElement.classList.contains('film') && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('scene-on'); io.unobserve(e.target); } }), { threshold: 0.18 });
    document.querySelectorAll('main > section:not(#journey), footer').forEach((s) => io.observe(s));
  }
  document.documentElement.classList.add('fx-ready');
})();
