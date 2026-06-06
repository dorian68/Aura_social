/* ============================================================
   AURA — lightweight i18n engine
   Usage on a page:
     <script src="js/i18n.js"></script>
     <script>
       AuraI18n.init({
         en: { hero_title: "Turn your audience…", ... },
         fr: { hero_title: "Transformez votre audience…", ... }
       });
     </script>
   Markup:
     <h1 data-t="hero_title"></h1>            // textContent
     <p data-t-html="hero_sub"></p>           // innerHTML
     <input data-t-attr="placeholder:ig_ph">  // attribute
   ============================================================ */
(function () {
  const KEY = 'aura-lang';
  let dict = { en: {}, fr: {} };
  let lang = 'en';
  const listeners = [];

  function get(key) {
    const table = dict[lang] || {};
    if (key in table) return table[key];
    if (dict.en && key in dict.en) return dict.en[key];
    return key;
  }

  function applyTo(root) {
    root = root || document;
    root.querySelectorAll('[data-t]').forEach(el => {
      el.textContent = get(el.getAttribute('data-t'));
    });
    root.querySelectorAll('[data-t-html]').forEach(el => {
      el.innerHTML = get(el.getAttribute('data-t-html'));
    });
    root.querySelectorAll('[data-t-attr]').forEach(el => {
      el.getAttribute('data-t-attr').split(',').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        if (attr && key) el.setAttribute(attr, get(key));
      });
    });
    document.documentElement.setAttribute('lang', lang);
  }

  function setLang(next, root) {
    lang = (next === 'fr') ? 'fr' : 'en';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    applyTo(root);
    document.querySelectorAll('[data-lang-btn]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-lang-btn') === lang);
    });
    listeners.forEach(fn => { try { fn(lang); } catch (e) {} });
  }

  function init(d, opts) {
    opts = opts || {};
    dict = Object.assign({ en: {}, fr: {} }, d);
    let saved = 'en';
    try { saved = localStorage.getItem(KEY) || 'en'; } catch (e) {}
    setLang(saved);
    // wire any [data-lang-btn] toggles already in DOM
    document.querySelectorAll('[data-lang-btn]').forEach(b => {
      b.addEventListener('click', () => setLang(b.getAttribute('data-lang-btn')));
    });
  }

  function onChange(fn) { listeners.push(fn); }

  window.AuraI18n = { init, setLang, get, apply: applyTo, onChange, get lang() { return lang; } };
})();

/* ============================================================
   AURA — shared UI behaviours (scroll reveal, counters, nav)
   ============================================================ */
(function () {
  function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(e => io.observe(e));
  }

  function animateCount(el) {
    const target = parseFloat(el.getAttribute('data-count'));
    const dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const dur = parseInt(el.getAttribute('data-dur') || '1400', 10);
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = prefix + val.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initCounters() {
    const els = document.querySelectorAll('[data-count]');
    if (!('IntersectionObserver' in window)) { els.forEach(animateCount); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    els.forEach(e => io.observe(e));
  }

  function initNav() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('nav-scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function boot() { initReveal(); initCounters(); initNav(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.AuraUI = { animateCount };
})();
