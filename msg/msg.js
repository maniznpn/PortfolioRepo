// Say hello — a one-question-at-a-time message form that emails you through Web3Forms.
//
// SETUP: paste your Web3Forms access key below (get one free at https://web3forms.com — enter the
// email address that should receive messages and the key arrives in that inbox). The key is meant
// to live in front-end code. Until a key is set, "Send" opens the visitor's email app instead.
const WEB3FORMS_ACCESS_KEY = 'e2a61d83-6cc1-4f08-a143-a6392e286f5b';
const FALLBACK_EMAIL = 'neupanem01@gmail.com';

(() => {
  const sec = document.querySelector('#message');
  if (!sec) return;
  const form = sec.querySelector('.msg-form');
  const steps = [...form.querySelectorAll('.msg-step')];
  const dots = [...sec.querySelectorAll('.msg-dots li')];
  const err = form.querySelector('.msg-err');
  const next = form.querySelector('.msg-next'), back = form.querySelector('.msg-back'), send = form.querySelector('.msg-send');
  const done = sec.querySelector('.msg-done');
  const hasKey = WEB3FORMS_ACCESS_KEY && !/YOUR_/.test(WEB3FORMS_ACCESS_KEY);
  sec.classList.add('js-msg'); form.classList.add('js-msg');
  let at = 0;

  // questions rise in word by word, like the section headings
  steps.forEach((s) => {
    const q = s.querySelector('.msg-q'); const t = q.textContent.trim();
    q.innerHTML = `<span class="sr-only">${t}</span>` + t.split(/\s+/).map((w, i) => `<span class="fw" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
  });

  // while someone is writing, hold the film on this scene
  const hold = () => { if (window.Film) window.Film.hold(true); };
  form.addEventListener('focusin', hold); form.addEventListener('input', hold);
  // done with the form: the film may carry on after a quiet moment
  form.addEventListener('focusout', () => setTimeout(() => { if (!form.contains(document.activeElement) && window.Film) window.Film.hold(false); }, 0));

  // not writing today: move on without sending anything
  sec.querySelector('.msg-skip').addEventListener('click', () => {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (window.Film && window.Film.next) { window.Film.next(); return; }
    const nxt = sec.nextElementSibling || document.querySelector('footer');
    if (nxt) scrollTo({ top: nxt.getBoundingClientRect().top + scrollY - 72, behavior: 'smooth' });
  });

  function go(i, focus = true) {
    at = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, k) => s.classList.toggle('on', k === at));
    dots.forEach((d, k) => d.classList.toggle('on', k <= at));
    form.toggleAttribute('data-first', at === 0);
    form.toggleAttribute('data-last', at === steps.length - 1);
    err.textContent = '';
    if (focus) { const f = steps[at].querySelector('input:checked, input, textarea'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 60); }
  }

  function check(i) {
    const s = steps[i];
    if (i === 0 && !form.querySelector('input[name="topic"]:checked')) return 'Pick one, so I know how to read it.';
    const f = s.querySelector('.msg-in');
    if (!f) return '';
    const v = f.value.trim();
    if (!v) return f.name === 'message' ? 'Write a few words first.' : 'This one is needed.';
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'That email doesn’t look complete — check it?';
    if (f.name === 'message' && v.length < 5) return 'A little more, please.';
    return '';
  }
  const advance = () => { const e = check(at); if (e) { err.textContent = e; return false; } go(at + 1); return true; };

  next.addEventListener('click', advance);
  back.addEventListener('click', () => go(at - 1));
  // picking a topic moves straight on
  form.querySelectorAll('input[name="topic"]').forEach((r) => r.addEventListener('change', () => setTimeout(() => go(1), 260)));
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const ta = e.target.tagName === 'TEXTAREA';
    if (ta && !(e.metaKey || e.ctrlKey)) return; // new line in the message
    e.preventDefault();
    if (at < steps.length - 1) advance(); else form.requestSubmit();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    for (let i = 0; i < steps.length; i++) { const m = check(i); if (m) { go(i); err.textContent = m; return; } }
    if (form.elements.botcheck.checked) return;
    const data = {
      topic: form.querySelector('input[name="topic"]:checked').value,
      name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), message: form.elements.message.value.trim()
    };
    const subject = `${data.topic} from ${data.name} — manish-neupane.com.np`;

    if (!hasKey) { // not set up yet: hand the message to the visitor's email app
      location.href = `mailto:${FALLBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(data.message + '\n\n— ' + data.name + ' (' + data.email + ')')}`;
      return;
    }
    send.disabled = true; sec.classList.add('sending');
    try {
      const [res] = await Promise.all([
        fetch('https://api.web3forms.com/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ access_key: WEB3FORMS_ACCESS_KEY, subject, from_name: data.name, replyto: data.email, ...data })
        }).then((r) => r.json()),
        new Promise((r) => setTimeout(r, 1400)) // let the packet make its trip
      ]);
      if (!res.success) throw new Error(res.message || 'Not sent');
      sec.querySelector('.msg-who').textContent = data.name.split(' ')[0];
      sec.querySelector('.msg-mail').textContent = data.email;
      sec.classList.remove('sending'); sec.classList.add('sent'); done.hidden = false;
      form.reset();
    } catch (x) {
      sec.classList.remove('sending'); send.disabled = false;
      err.innerHTML = `It didn’t go through. <a href="mailto:${FALLBACK_EMAIL}">Email me directly</a> instead?`;
    }
  });

  sec.querySelector('.msg-again').addEventListener('click', () => {
    sec.classList.remove('sent'); done.hidden = true; send.disabled = false; go(0);
  });

  go(0, false);
})();
