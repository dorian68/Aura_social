/* AURA — B2B Growth Engine logic */
(function () {
  auraMountShell('b2b');
  const g = (k) => AuraI18n.get(k);
  const $ = (s) => document.querySelector(s);

  const API = window.AURA_API_BASE || 'http://localhost:3000';
  const LOCATIONS = [
    { v: 'Fort-de-France', k: 'b2b_loc1' }, { v: 'Pointe-à-Pitre', k: 'b2b_loc2' },
    { v: 'Basse-Terre', k: 'b2b_loc3' }, { v: 'Paris', k: 'b2b_loc4' },
    { v: 'Lyon', k: 'b2b_loc5' }, { v: 'Bordeaux', k: 'b2b_loc6' }
  ];
  const CATS = [
    { v: 'restaurant', k: 'b2b_cat1' }, { v: 'beauty', k: 'b2b_cat2' },
    { v: 'fashion', k: 'b2b_cat3' }, { v: 'gym', k: 'b2b_cat4' },
    { v: 'hotel', k: 'b2b_cat5' }, { v: 'event_venue', k: 'b2b_cat6' }
  ];
  const BUDGETS = [100, 200, 500, 1000];

  let sel = { location: 'Fort-de-France', category: 'restaurant', budget: 200 };
  let result = null;

  /* --- mock fallback data --- */
  function mockResult(location, category, budget) {
    const bizNames = {
      restaurant: ['Le Grain de Sel', 'Chez Mireille', 'Le Ti Punch', 'Café Créole'],
      beauty: ['Beauty Studio Antilles', 'Lumière Spa', 'Élégance', 'Tonic Studio'],
      fashion: ['Boutique Tropik', 'Mode Caraïbe', 'Le Studio', 'Chic Antilles'],
      gym: ['FitLife Club', 'Muscle & Santé', 'Force Caraïbe', 'Urban Gym'],
      hotel: ['Hotel Batelière', 'Karibea Resort', 'Le Squash Hotel', 'Martinique Hostel'],
      event_venue: ['Palais des Congrès', 'Jardins de l\'Eden', 'Villa Créole', 'Le Meridien']
    };
    const names = bizNames[category] || bizNames.restaurant;
    const businesses = names.map((name, i) => ({
      id: 'biz_' + i, name, category,
      address: ['12 Rue de la République', '4 Avenue des Caraïbes', '88 Boulevard du Général', '3 Place Schoelcher'][i],
      city: location, rating: (4.1 + i * 0.2).toFixed(1), reviewCount: 80 + i * 40, source: 'mock_google_places'
    }));
    const scores = businesses.map((b, i) => ({ businessId: b.id, overallScore: (7.8 - i * 0.3).toFixed(1), audienceLocationFit: 9 - i, categoryFit: 8 - i }));
    const bestBiz = businesses[0];
    const fanBudget = Math.round(budget * 0.7);
    const commission = Math.round(budget * 0.3);
    return {
      run: { id: 'run_' + Date.now(), status: 'completed', location, businessesDiscovered: businesses.length, opportunitiesGenerated: businesses.length - 1, revenuePotential: commission },
      businesses, scores,
      bestOpportunity: { title: `${bestBiz.name} × Creator Campaign`, proposedBudget: budget, platformCommission: commission, fanRewardBudget: fanBudget, estimatedReach: 4800, targetSegment: 'Superfans + Active Fans' },
      pitch: { subject: `Partnership proposal — ${bestBiz.name} × your community`, message: `Hello ${bestBiz.name} team,\n\nI'm a creator with ${12}K highly engaged local followers in ${location}.\n\nI'd like to propose a commission-based fan campaign:\n• Budget: €${budget}\n• Your offer to my fans: exclusive promo or discount\n• Fan reward pool: €${fanBudget} in loyalty points\n• Platform commission: €${commission} (Aura)\n\nThis targets my Superfans and Active Fans — your ideal local audience.\n\nInterested?`, tone: 'warm', channel: 'email', approvalRequired: true },
      campaignEconomics: { campaignBudget: budget, fanRewardBudget: fanBudget, platformCommission: commission }
    };
  }

  /* --- render --- */
  function renderSelectors() {
    // location chips
    $('#locChips').innerHTML = LOCATIONS.map(l =>
      `<div class="opt ${sel.location === l.v ? 'on' : ''}" data-loc="${l.v}">${g(l.k)}</div>`).join('');
    document.querySelectorAll('[data-loc]').forEach(el =>
      el.addEventListener('click', () => { sel.location = el.getAttribute('data-loc'); renderSelectors(); }));
    // category chips
    $('#catChips').innerHTML = CATS.map(c =>
      `<div class="opt ${sel.category === c.v ? 'on' : ''}" data-cat="${c.v}">${g(c.k)}</div>`).join('');
    document.querySelectorAll('[data-cat]').forEach(el =>
      el.addEventListener('click', () => { sel.category = el.getAttribute('data-cat'); renderSelectors(); }));
    // budget chips
    $('#budgetChips').innerHTML = BUDGETS.map(b =>
      `<div class="opt ${sel.budget === b ? 'on' : ''}" data-bgt="${b}">€${b}</div>`).join('');
    document.querySelectorAll('[data-bgt]').forEach(el =>
      el.addEventListener('click', () => { sel.budget = +el.getAttribute('data-bgt'); renderSelectors(); }));
  }

  function renderEmpty() {
    $('#b2bResults').innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 30px">
        <div class="orb" style="width:72px;height:72px;margin:0 auto 20px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,rgba(184,255,77,.15),transparent 70%);border:1px solid rgba(184,255,77,.2)">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" stroke-width="1.6"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
        </div>
        <p class="muted" style="max-width:28em;margin:0 auto">${g('b2b_empty')}</p>
      </div>`;
  }

  function renderKPIs(r) {
    const kpis = [
      { l: g('b2b_kpi1'), v: r.run.businessesDiscovered, u: '', lime: false },
      { l: g('b2b_kpi2'), v: r.run.opportunitiesGenerated, u: '', lime: false },
      { l: g('b2b_kpi3'), v: '€' + r.campaignEconomics.platformCommission, u: '', lime: true },
      { l: g('b2b_kpi4'), v: '€' + r.campaignEconomics.fanRewardBudget, u: '', lime: false }
    ];
    return kpis.map(k => `
      <div class="kcard">
        <div class="kl">${k.l}</div>
        <div class="kv tnum ${k.lime ? 'lime' : ''}">${k.v}</div>
        <div class="kfoot"><span class="pill gold" style="font-size:11px">${g('b2b_sim')}</span></div>
      </div>`).join('');
  }

  function renderBusinesses(businesses, scores) {
    const scoreMap = {};
    scores.forEach(s => { scoreMap[s.businessId] = s; });
    return `
      <div class="panel" style="grid-column:1/-1">
        <div class="panel-head">
          <div><h3>${g('b2b_biz_t')}</h3><div class="sub">${g('b2b_source')}</div></div>
          <span class="pill gold">${g('b2b_sim')}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:0">
          ${businesses.map((b, i) => {
            const score = scoreMap[b.id];
            const pct = Math.round((score ? parseFloat(score.overallScore) : 7) * 10);
            return `
            <div class="b2b-row" style="display:flex;align-items:center;gap:14px;padding:13px 0;border-bottom:${i < businesses.length - 1 ? '1px solid var(--line)' : 'none'}">
              <div class="b2b-av" style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--forest),var(--ink-600));border:1px solid var(--line);display:grid;place-items:center;flex:none;font-family:var(--display);font-size:14px;color:var(--lime);">${b.name[0]}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:14px;font-weight:600;color:var(--cream)">${b.name}</div>
                <div style="font-size:12px;color:var(--t-lo)">${b.address}</div>
              </div>
              <span class="pill" style="font-size:11.5px;text-transform:capitalize">${b.category}</span>
              <div style="text-align:right;min-width:60px">
                <div style="font-family:var(--mono);font-size:13px;color:var(--lime);font-weight:700">${score ? score.overallScore : '7.8'}<span style="color:var(--t-faint)">/10</span></div>
                <div style="font-size:11px;color:var(--t-lo)">${g('b2b_fit')}</div>
              </div>
              <div style="width:54px;height:6px;border-radius:var(--r-pill);background:var(--ink-500);overflow:hidden;flex:none">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--lime-dim),var(--lime));border-radius:var(--r-pill)"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function renderOpportunityAndPitch(r) {
    const opp = r.bestOpportunity;
    const pitch = r.pitch;
    return `
      <div class="panel">
        <div class="panel-head">
          <div><h3>${g('b2b_opp_t')}</h3></div>
          <span class="pill gold">${g('b2b_sim')}</span>
        </div>
        <div style="margin-bottom:18px">
          <div style="font-size:16px;font-weight:600;color:var(--cream);margin-bottom:4px">${opp.title}</div>
          <div style="font-size:13px;color:var(--t-lo)">${opp.targetSegment}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--line);padding-top:16px">
          <div style="display:flex;justify-content:space-between;font-size:13.5px">
            <span class="muted">${g('b2b_budget_total')}</span>
            <span style="font-family:var(--display);font-size:16px;color:var(--cream)">€${opp.proposedBudget}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13.5px">
            <span class="muted">${g('b2b_fan_budget')}</span>
            <span style="font-family:var(--display);font-size:16px;color:var(--lime)">€${opp.fanRewardBudget}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13.5px">
            <span class="muted">${g('b2b_commission')}</span>
            <span style="font-family:var(--display);font-size:16px;color:var(--gold)">€${opp.platformCommission}</span>
          </div>
        </div>
        <div style="margin-top:18px">
          <div style="height:10px;border-radius:var(--r-pill);background:var(--ink-500);overflow:hidden;display:flex">
            <div style="height:100%;width:70%;background:linear-gradient(90deg,var(--lime-dim),var(--lime));border-radius:var(--r-pill) 0 0 var(--r-pill)"></div>
            <div style="height:100%;width:30%;background:linear-gradient(90deg,var(--gold),#a08040);border-radius:0 var(--r-pill) var(--r-pill) 0"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--t-lo)">
            <span>70% fans</span><span>30% Aura</span>
          </div>
        </div>
        <div style="margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="kpi"><div class="kpi-label">Estimated reach</div><div class="kpi-value tnum">${(opp.estimatedReach / 1000).toFixed(1)}<span class="unit">K</span></div></div>
          <div class="kpi"><div class="kpi-label">Target segment</div><div class="kpi-value" style="font-size:13px;line-height:1.3">${opp.targetSegment.split(' + ')[0]}</div></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div><h3>${g('b2b_pitch_t')}</h3><div class="sub">${g('b2b_pitch_approval')}</div></div>
          <span class="badge warn" style="font-size:11px">✓ Review</span>
        </div>
        <div style="font-size:13.5px;font-weight:600;color:var(--cream);margin-bottom:12px">${pitch.subject}</div>
        <div class="pitch-body" style="background:var(--ink-700);border:1px solid var(--line);border-radius:var(--r-md);padding:16px;font-size:13.5px;color:var(--t-mid);line-height:1.7;white-space:pre-wrap;max-height:200px;overflow-y:auto">${pitch.message}</div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:14px">
          <span class="pill" style="font-size:11px">${pitch.channel}</span>
          <span class="pill" style="font-size:11px">${pitch.tone}</span>
          <button class="btn btn-ghost btn-sm" id="copyPitchBtn" style="margin-left:auto">${g('b2b_copy_pitch')}</button>
        </div>
      </div>`;
  }

  function renderResults(r) {
    const kpiHtml = renderKPIs(r);
    const bizHtml = renderBusinesses(r.businesses, r.scores);
    const oppHtml = renderOpportunityAndPitch(r);
    const el = $('#b2bResults');
    el.innerHTML = `
      <div class="kpi-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:14px;grid-column:1/-1">${kpiHtml}</div>
      ${bizHtml}
      ${oppHtml}
    `;
    // bind copy button
    const cpBtn = $('#copyPitchBtn');
    if (cpBtn) {
      cpBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(r.pitch.message).then(() => {
          cpBtn.textContent = g('b2b_copied');
          setTimeout(() => { cpBtn.textContent = g('b2b_copy_pitch'); }, 1600);
        }).catch(() => {});
      });
    }
    AuraI18n.apply();
  }

  async function run() {
    const btn = $('#runBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> <span>${g('b2b_running')}</span>`;

    let data = null;
    try {
      const res = await fetch(API + '/api/b2b-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: sel.location, categories: [sel.category], campaignBudget: sel.budget })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) data = json.data;
      }
    } catch (_) {}

    result = data || mockResult(sel.location, sel.category, sel.budget);
    renderResults(result);
    btn.disabled = false;
    btn.innerHTML = `<span>${g('b2b_run')}</span>`;
  }

  function init() {
    renderSelectors();
    renderEmpty();
    AuraI18n.apply();
    $('#runBtn').addEventListener('click', run);
  }
  init();
  AuraI18n.onChange(() => { renderSelectors(); if (result) renderResults(result); else renderEmpty(); AuraI18n.apply(); });
})();
