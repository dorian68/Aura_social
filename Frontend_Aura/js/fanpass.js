/* AURA — Fan Pass studio logic */
(function () {
  auraMountShell('fanpass');
  const g = (k) => AuraI18n.get(k);
  const $ = (s) => document.querySelector(s);

  let state = { name: '', edition: 500, price: 19, art: 'aurora', minted: 0, view: 'fan', launched: false };
  const ARTS = [['aurora', 'f_art1'], ['eclipse', 'f_art2'], ['prism', 'f_art3']];

  function renderArts() {
    $('#artRow').innerHTML = ARTS.map(([id, k]) =>
      `<div class="art-opt art-${id} ${state.art === id ? 'on' : ''}" data-art="${id}"><span>${g(k)}</span></div>`).join('');
    document.querySelectorAll('[data-art]').forEach(a =>
      a.addEventListener('click', () => { state.art = a.getAttribute('data-art'); renderArts(); renderPass(); }));
  }
  function renderViewToggle() {
    $('#viewToggle').innerHTML =
      `<button class="${state.view === 'fan' ? 'active' : ''}" data-view="fan">${g('f_view_fan')}</button>
       <button class="${state.view === 'tech' ? 'active' : ''}" data-view="tech">${g('f_view_tech')}</button>`;
    document.querySelectorAll('[data-view]').forEach(b =>
      b.addEventListener('click', () => {
        state.view = b.getAttribute('data-view'); renderViewToggle();
        $('#fanView').classList.toggle('hide', state.view !== 'fan');
        $('#techView').classList.toggle('hide', state.view !== 'tech');
      }));
  }
  function renderPerks() {
    const perks = ['f_mint_perk1', 'f_mint_perk2', 'f_mint_perk3', 'f_mint_perk4'];
    $('#perkList').innerHTML = perks.map(k =>
      `<li style="display:flex;gap:10px;font-size:14px;color:var(--t-mid);align-items:center"><svg viewBox="0 0 24 24" fill="none" stroke="var(--lime)" stroke-width="2.4" style="width:16px;height:16px;flex:none"><path d="M20 6L9 17l-5-5"/></svg><span>${g(k)}</span></li>`).join('');
  }
  function renderPass() {
    const card = $('#passCard');
    card.className = 'pass-card art-' + state.art;
    $('#pcName').textContent = state.name || g('f_name_v');
    $('#pcPrice').textContent = '$' + state.price;
    $('#pcEdition').textContent = '/ ' + state.edition;
  }
  function renderSupply() {
    const pct = Math.round(state.minted / state.edition * 100);
    $('#mintedCount').textContent = state.minted.toLocaleString('en-US');
    $('#remainCount').innerHTML = (state.edition - state.minted).toLocaleString('en-US') + ' <span data-t="f_remaining">' + g('f_remaining') + '</span>';
    $('#supplyBar').style.width = pct + '%';
    $('#launchRev').textContent = '$' + (state.minted * state.price).toLocaleString('en-US');
    $('#mintedKpi').innerHTML = pct + '<span class="unit">%</span>';
  }
  function addHolder(i) {
    const host = $('#holders');
    if (host.querySelector('.faint')) host.innerHTML = '';
    // Synthetic labels — these are simulated mints, not real buyers.
    const name = 'Sample holder';
    const id = '#' + String(state.minted).padStart(4, '0');
    const row = document.createElement('div');
    row.className = 'holder';
    row.innerHTML = `<span class="hav">S</span><span style="color:var(--cream);font-weight:600;font-size:13.5px">${name}</span><span class="hid">${id}</span>`;
    host.prepend(row);
    while (host.children.length > 6) host.removeChild(host.lastChild);
  }

  function launch() {
    if (state.launched) return;
    state.launched = true;
    const btn = $('#launchBtn');
    btn.disabled = true; btn.textContent = g('f_launching');
    const target = Math.round(state.edition * (0.62 + Math.random() * 0.2));
    const dur = 2600, t0 = performance.now();
    let lastHolder = 0;
    function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      state.minted = Math.round(target * eased);
      renderSupply();
      if (state.minted - lastHolder >= Math.max(1, Math.round(target / 8))) { lastHolder = state.minted; addHolder(state.minted); }
      if (p < 1) requestAnimationFrame(step);
      else finish();
    }
    function finish() {
      state.minted = target; renderSupply(); addHolder(target);
      btn.textContent = '✓ ' + g('f_launched'); btn.classList.remove('btn-primary'); btn.classList.add('btn-gold');
      $('#resetBtn').classList.remove('hide');
    }
    requestAnimationFrame(step);
    setTimeout(() => { if (state.minted < target) finish(); }, dur + 700);
  }
  function reset() {
    state.minted = 0; state.launched = false;
    const btn = $('#launchBtn'); btn.disabled = false; btn.textContent = g('f_launch');
    btn.classList.add('btn-primary'); btn.classList.remove('btn-gold');
    $('#resetBtn').classList.add('hide');
    $('#holders').innerHTML = '<p class="faint" style="font-size:13px">—</p>';
    renderSupply();
  }
  function airdrop() {
    const n = 12;
    const btn = $('#airdropBtn');
    if (state.minted === 0 && $('#holders').querySelector('.faint')) $('#holders').innerHTML = '';
    let i = 0;
    const iv = setInterval(() => {
      state.minted = Math.min(state.edition, state.minted + 1);
      addHolder(state.minted + i); renderSupply(); i++;
      if (i >= n) { clearInterval(iv); btn.textContent = '✓ ' + n + ' ' + g('f_airdropped'); setTimeout(() => btn.textContent = g('f_airdrop_btn'), 1800); }
    }, 110);
  }

  // input bindings
  $('#passName').addEventListener('input', e => { state.name = e.target.value; renderPass(); });
  $('#passEdition').addEventListener('input', e => { state.edition = Math.max(10, +e.target.value || 10); renderPass(); renderSupply(); });
  $('#passPrice').addEventListener('input', e => { state.price = Math.max(0, +e.target.value || 0); renderPass(); renderSupply(); });
  $('#launchBtn').addEventListener('click', launch);
  $('#resetBtn').addEventListener('click', reset);
  $('#airdropBtn').addEventListener('click', airdrop);

  function init() { renderArts(); renderViewToggle(); renderPerks(); renderPass(); renderSupply(); AuraI18n.apply(); }
  init();
  AuraI18n.onChange(() => { renderArts(); renderViewToggle(); renderPerks(); renderPass(); renderSupply(); AuraI18n.apply(); });
})();
