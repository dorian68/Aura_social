/* AURA — loyalty builder logic */
(function () {
  auraMountShell('loyalty');
  const g = (k) => AuraI18n.get(k);

  const TIER_PALETTE = [
    { c: '#7FB6FF', glow: 'rgba(127,182,255,.2)' },
    { c: '#B8FF4D', glow: 'rgba(184,255,77,.2)' },
    { c: '#C8A96A', glow: 'rgba(200,169,106,.22)' }
  ];
  // estimated buyers per tier (illustrative, scales the projection)
  const BASE_BUYERS = [320, 140, 26];

  let tiers = [
    { name: g('t1_name'), price: 5, supply: 0, perks: [g('t1_perk1'), g('t1_perk2'), g('t1_perk3')], conds: ['follow'], pal: 0, buyers: BASE_BUYERS[0] },
    { name: g('t2_name'), price: 19, supply: 500, perks: [g('t2_perk1'), g('t2_perk2'), g('t2_perk3'), g('t2_perk4')], conds: ['eng', 'pay'], pal: 1, buyers: BASE_BUYERS[1] },
    { name: g('t3_name'), price: 49, supply: 50, perks: [g('t3_perk1'), g('t3_perk2'), g('t3_perk3'), g('t3_perk4')], conds: ['pay'], pal: 2, buyers: BASE_BUYERS[2] }
  ];
  let selected = 1;
  let previewTier = 1;

  const CONDS = [['follow', 'l_cond_follow'], ['eng', 'l_cond_eng'], ['pay', 'l_cond_pay']];
  const checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';

  function perkPool() { return g('perk_pool').split('|'); }

  function renderEdit() {
    const host = document.getElementById('tiersEdit');
    host.innerHTML = tiers.map((t, i) => {
      const pal = TIER_PALETTE[t.pal % 3];
      return `
      <div class="tier-edit ${i === selected ? 'sel' : ''}" data-i="${i}">
        <div class="tier-edit-head">
          <span class="tier-swatch" style="background:${pal.c}"></span>
          <input class="tier-name-in" value="${t.name}" data-name="${i}">
          <span style="margin-left:auto;display:flex;gap:8px">
            ${tiers.length > 1 ? `<button class="perk" style="padding:6px 10px;cursor:pointer" data-del="${i}"><span class="rm" style="margin:0">✕</span></button>` : ''}
          </span>
        </div>
        <div class="price-row">
          <div class="price-field">
            <div class="label" data-t="l_price">${g('l_price')}</div>
            <div class="price-input"><span>$</span><input type="number" min="0" value="${t.price}" data-price="${i}"><span style="font-size:12px" data-t="l_per_mo">${g('l_per_mo')}</span></div>
          </div>
          <div class="price-field">
            <div class="label" data-t="l_supply">${g('l_supply')}</div>
            <div class="price-input"><input type="number" min="0" value="${t.supply}" placeholder="0" data-supply="${i}"><span style="font-size:12px;white-space:nowrap">${t.supply === 0 ? g('l_unlimited') : ''}</span></div>
          </div>
        </div>
        <div class="label" style="margin-bottom:9px" data-t="l_perks">${g('l_perks')}</div>
        <div class="perk-list">
          ${t.perks.map((p, pi) => `<div class="perk"><span class="ck">${checkSvg}</span><span>${p}</span><span class="rm" data-rmperk="${i}:${pi}">✕</span></div>`).join('')}
        </div>
        <div class="perk-add">
          ${perkPool().filter(p => !t.perks.includes(p)).slice(0, 4).map(p => `<button data-addperk="${i}" data-perk="${p}">+ ${p}</button>`).join('')}
        </div>
        <div class="label" style="margin:16px 0 9px" data-t="l_unlock">${g('l_unlock')}</div>
        <div class="cond-row">
          ${CONDS.map(([id, k]) => `<span class="cond-chip ${t.conds.includes(id) ? 'on' : ''}" data-cond="${i}:${id}">${g(k)}</span>`).join('')}
        </div>
      </div>`;
    }).join('');
    bindEdit();
  }

  function renderPreviewTabs() {
    document.getElementById('previewTabs').innerHTML = tiers.map((t, i) =>
      `<button class="${i === previewTier ? 'active' : ''}" data-ptab="${i}">${t.name}</button>`).join('');
    document.querySelectorAll('[data-ptab]').forEach(b =>
      b.addEventListener('click', () => { previewTier = +b.getAttribute('data-ptab'); renderPreviewTabs(); renderPreview(); }));
  }

  function renderPreview() {
    const t = tiers[Math.min(previewTier, tiers.length - 1)];
    const pal = TIER_PALETTE[t.pal % 3];
    document.getElementById('fanPreview').innerHTML = `
      <div class="fan-pass" style="--tier-c:${pal.c};--tier-glow:${pal.glow}">
        <div class="pp-top">
          <span class="pp-tier">${t.name} · ${g('l_current')}</span>
          <img src="../assets/aura-logo.png" width="26" height="26" alt="">
        </div>
        <div class="pp-price">$${t.price}<small>${g('l_per_mo')}</small></div>
        ${t.supply > 0 ? `<div class="chip-row"><span class="pill" style="font-size:11px">${t.supply} ${g('l_members')}</span></div>` : ''}
        <ul class="pp-perks">
          ${t.perks.map(p => `<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>${p}</li>`).join('')}
        </ul>
        <button class="btn btn-primary btn-block" style="background:${pal.c};box-shadow:0 0 30px -8px ${pal.c}">${g('l_join')} ${t.name}</button>
      </div>`;
  }

  function updateProjection() {
    // monthly: memberships recur; one-off supply tiers counted as monthly equivalent for the sim
    let total = 0;
    tiers.forEach((t, i) => { total += t.price * (t.buyers || BASE_BUYERS[Math.min(i, 2)] || 50); });
    const el = document.getElementById('projRevenue');
    // Surface the assumption — this is an ESTIMATE based on assumed buyers per tier,
    // not a measured figure.
    const buyersList = tiers.map((t, i) => t.buyers || BASE_BUYERS[Math.min(i, 2)] || 50);
    const totalBuyers = buyersList.reduce((s, n) => s + n, 0);
    if (el && el.parentElement) {
      let note = document.getElementById('projAssumption');
      if (!note) {
        note = document.createElement('div');
        note.id = 'projAssumption';
        note.style.cssText = 'font-size:11.5px;color:var(--t-lo);margin-top:6px;line-height:1.4';
        el.parentElement.appendChild(note);
      }
      note.textContent = `Estimation · suppose ${totalBuyers} acheteurs (${buyersList.join(' / ')} par palier)`;
    }
    const target = total;
    let cur = 0; const t0 = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - t0) / 700);
      cur = target * (1 - Math.pow(1 - p, 3));
      el.textContent = '$' + Math.round(cur).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // fallback (throttled tabs)
    setTimeout(() => { el.textContent = '$' + Math.round(target).toLocaleString('en-US'); }, 800);
  }

  function bindEdit() {
    document.querySelectorAll('.tier-edit').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('input,button,.cond-chip,.rm,[data-addperk]')) return;
        selected = +card.getAttribute('data-i'); renderEdit();
      });
    });
    document.querySelectorAll('[data-name]').forEach(inp =>
      inp.addEventListener('input', () => { tiers[+inp.getAttribute('data-name')].name = inp.value || '—'; renderPreviewTabs(); renderPreview(); }));
    document.querySelectorAll('[data-price]').forEach(inp =>
      inp.addEventListener('input', () => { tiers[+inp.getAttribute('data-price')].price = Math.max(0, +inp.value || 0); renderPreview(); updateProjection(); }));
    document.querySelectorAll('[data-supply]').forEach(inp =>
      inp.addEventListener('input', () => { tiers[+inp.getAttribute('data-supply')].supply = Math.max(0, +inp.value || 0); renderPreview(); }));
    document.querySelectorAll('[data-rmperk]').forEach(x =>
      x.addEventListener('click', () => { const [i, pi] = x.getAttribute('data-rmperk').split(':').map(Number); tiers[i].perks.splice(pi, 1); renderEdit(); renderPreview(); }));
    document.querySelectorAll('[data-addperk]').forEach(b =>
      b.addEventListener('click', () => { const i = +b.getAttribute('data-addperk'); tiers[i].perks.push(b.getAttribute('data-perk')); renderEdit(); renderPreview(); }));
    document.querySelectorAll('[data-cond]').forEach(c =>
      c.addEventListener('click', () => { const [i, id] = c.getAttribute('data-cond').split(':'); const arr = tiers[+i].conds; const idx = arr.indexOf(id); idx >= 0 ? arr.splice(idx, 1) : arr.push(id); renderEdit(); }));
    document.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', (e) => { e.stopPropagation(); const i = +b.getAttribute('data-del'); tiers.splice(i, 1); selected = Math.max(0, selected - (i <= selected ? 1 : 0)); previewTier = Math.min(previewTier, tiers.length - 1); renderAll(); }));
  }

  document.getElementById('addTier').addEventListener('click', () => {
    const pal = tiers.length % 3;
    tiers.push({ name: 'New tier', price: 9, supply: 0, perks: [perkPool()[0]], conds: ['follow'], pal, buyers: 80 });
    selected = tiers.length - 1; renderAll();
  });
  document.getElementById('saveBtn').addEventListener('click', () => {
    const b = document.getElementById('saveBtn');
    b.innerHTML = '✓ ' + g('l_saved'); b.classList.remove('btn-primary'); b.classList.add('btn-gold');
    setTimeout(() => { b.innerHTML = '<span>' + g('l_save') + '</span>'; b.classList.add('btn-primary'); b.classList.remove('btn-gold'); }, 1800);
  });

  function renderAll() { renderEdit(); renderPreviewTabs(); renderPreview(); updateProjection(); AuraI18n.apply(); }
  renderAll();
  AuraI18n.onChange(() => {
    // refresh localized default labels only for untouched? simplest: re-apply static + re-render dynamic structure
    renderEdit(); renderPreviewTabs(); renderPreview(); updateProjection(); AuraI18n.apply();
  });
})();
