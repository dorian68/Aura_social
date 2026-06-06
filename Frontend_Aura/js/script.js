/* AURA — launch script generator logic */
(function () {
  auraMountShell('script');
  const g = (k) => AuraI18n.get(k);
  const $ = (s) => document.querySelector(s);

  let sel = { offer: 'g_offer1', platform: 'g_pl1', tone: 'warm', goal: 'g_gl1' };
  let variants = [], curVar = 0;

  const OFFERS = [['g_offer1'], ['g_offer2'], ['g_offer3'], ['g_offer4']];
  const PLATS = [['g_pl1'], ['g_pl2'], ['g_pl3'], ['g_pl4']];
  const TONES = [['warm', 'g_tn1'], ['hype', 'g_tn2'], ['calm', 'g_tn3']];
  const GOALS = [['g_gl1'], ['g_gl2'], ['g_gl3']];

  function optBtns(host, items, key, isPair) {
    $(host).innerHTML = items.map(it => {
      const val = isPair ? it[0] : it[0];
      const label = isPair ? g(it[1]) : g(it[0]);
      const on = sel[key] === val;
      return `<div class="opt ${on ? 'on' : ''}" data-key="${key}" data-val="${val}">${label}</div>`;
    }).join('');
  }
  function renderOpts() {
    optBtns('#offerOpts', OFFERS, 'offer', false);
    optBtns('#platformOpts', PLATS, 'platform', false);
    optBtns('#toneOpts', TONES, 'tone', true);
    optBtns('#goalOpts', GOALS, 'goal', false);
    document.querySelectorAll('.opt').forEach(o =>
      o.addEventListener('click', () => { sel[o.getAttribute('data-key')] = o.getAttribute('data-val'); renderOpts(); }));
  }

  function pick(arr, seed) { return arr[seed % arr.length]; }

  function buildVariant(seed) {
    const lang = AuraI18n.lang;
    const T = window.AURA_SCRIPTS[lang] || window.AURA_SCRIPTS.en;
    const name = ($('#offerName').value || g('g_name_ph').replace(/^e\.g\.\s*|^ex\.\s*/, '')).trim();
    const price = ($('#offerPrice').value || '$19').trim();
    const hook = pick(T.hooks[sel.offer], seed);
    let body = T.body[sel.tone].replace(/\{name\}/g, name).replace(/\{price\}/g, price);
    const cta = pick(T.cta[sel.goal], seed + 1);
    return { hook, body, cta };
  }

  function renderVariant() {
    const v = variants[curVar];
    const full = `${v.hook}\n\n${v.body}\n\n${v.cta}`;
    $('#scriptOut').innerHTML = `
      <div class="script-body fade">
        <div class="block"><div class="block-label">${g('g_hook')}</div><p>${v.hook}</p></div>
        <div class="block body"><div class="block-label gold">${g('g_body')}</div><p>${v.body}</p></div>
        <div class="block"><div class="block-label">${g('g_cta')}</div><p>${v.cta}</p></div>
        <div class="row between" style="border-top:1px solid var(--line);padding-top:14px">
          <span class="faint mono" style="font-size:12px">${full.length} ${g('g_count')}</span>
          <span class="pill" style="font-size:11px">${g(sel.platform)}</span>
        </div>
      </div>`;
    $('#copyBtn').dataset.text = full;
  }

  function renderVarTabs() {
    const tabs = $('#varTabs');
    tabs.classList.remove('hide');
    tabs.innerHTML = variants.map((_, i) => `<button class="${i === curVar ? 'active' : ''}" data-var="${i}">${i + 1}</button>`).join('');
    tabs.querySelectorAll('[data-var]').forEach(b =>
      b.addEventListener('click', () => { curVar = +b.getAttribute('data-var'); renderVarTabs(); renderVariant(); }));
  }

  function generate() {
    const btn = $('#genBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${g('g_generating')}`;
    $('#scriptOut').innerHTML = `<div class="gen-loading"><span class="spinner" style="width:30px;height:30px"></span><p class="muted">${g('g_generating')}</p></div>`;
    $('#varTabs').classList.add('hide');
    setTimeout(() => {
      const base = Date.now() % 7;
      variants = [buildVariant(base), buildVariant(base + 2), buildVariant(base + 4)];
      curVar = 0;
      renderVarTabs(); renderVariant();
      btn.disabled = false; btn.innerHTML = `<span>${g('g_regenerate')}</span>`;
      $('#copyBtn').classList.remove('hide');
    }, 1100);
  }

  $('#genBtn').addEventListener('click', generate);
  $('#copyBtn').addEventListener('click', () => {
    const txt = $('#copyBtn').dataset.text || '';
    navigator.clipboard?.writeText(txt).catch(() => {});
    const b = $('#copyBtn'); b.textContent = '✓ ' + g('g_copied');
    setTimeout(() => b.textContent = g('g_copy'), 1500);
  });

  function init() { renderOpts(); AuraI18n.apply(); }
  init();
  AuraI18n.onChange(() => {
    renderOpts(); AuraI18n.apply();
    if (variants.length) { variants = variants.map((_, i) => buildVariant((Date.now() % 7) + i * 2)); renderVariant(); }
  });
})();
