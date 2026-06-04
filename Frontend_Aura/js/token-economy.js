/* AURA — Token Economy simulator logic */
(function () {
  auraMountShell('token-economy');
  const g = (k) => AuraI18n.get(k);
  const $ = (s) => document.querySelector(s);

  const API = window.AURA_API_BASE || 'http://localhost:3000';
  const POOL_COLORS = ['#B8FF4D', '#8FCC3D', '#C8A96A', '#7FB6FF', '#3F6B4A'];
  const POOL_LABELS = ['te_p_community', 'te_p_airdrop', 'te_p_creator', 'te_p_partner', 'te_p_buffer'];
  const POOL_PCTS   = [50, 20, 15, 10, 5];

  let state = {
    totalSupply: 1000000, ratio: 1, mode: 'offchain',
    topFans: 50, avgAirdrop: 1000, monthlyBudget: 5000,
    simResult: null
  };
  let readiness = null;

  /* --- mock fallback --- */
  function mockReadiness() {
    return {
      readiness: { score: 28, label: 'Keep tokenization off-chain for now' },
      economy: {
        totalSupply: 1000000, tokenizationMode: 'offchain',
        communityRewardsPool: 500000, launchAirdropPool: 200000,
        creatorReserve: 150000, partnerRewardsPool: 100000, campaignBufferPool: 50000,
        isTransferable: false, isSpeculative: false, pointsToTokenRatio: 1,
        redemptionPressure: 12, estimatedLiability: 70.9,
        disclaimer: 'This is a loyalty economy simulation, not an investment product.'
      },
      validation: { valid: true, errors: [], warnings: ['Creator reserve is above 15% — consider allocating more to community rewards.'] }
    };
  }

  /* --- fetch readiness from API --- */
  async function loadReadiness() {
    try {
      const res = await fetch(API + '/api/token-economy/demo');
      if (res.ok) {
        const json = await res.json();
        if (json.success) return json.data;
      }
    } catch (_) {}
    return mockReadiness();
  }

  function computePoolData(supply) {
    return POOL_PCTS.map((pct, i) => ({
      label: g(POOL_LABELS[i]), pct, value: Math.round(supply * pct / 100), color: POOL_COLORS[i]
    }));
  }

  /* --- render score ring --- */
  function renderScoreRing(score) {
    const R = 80, C = 2 * Math.PI * R;
    const off = C - (C * Math.min(score, 100) / 100);
    const color = score >= 75 ? 'var(--lime)' : score >= 45 ? 'var(--warn)' : 'var(--neg)';
    const label = score >= 75 ? 'Ready for on-chain simulation'
                : score >= 45 ? 'Loyalty engine needs more activity'
                : 'Keep tokenization off-chain for now';
    $('#teRing').innerHTML = `
      <div class="big-ring">
        <svg width="200" height="200" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="${R}" fill="none" stroke="rgba(232,220,200,.1)" stroke-width="10"/>
          <circle cx="100" cy="100" r="${R}" fill="none" stroke="${color}" stroke-width="10"
            stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"
            style="filter:drop-shadow(0 0 8px ${color === 'var(--lime)' ? 'rgba(184,255,77,.6)' : 'rgba(200,169,106,.5)'});transition:stroke-dashoffset 1.3s var(--ease)"
            id="ringArc"/>
        </svg>
        <div class="v"><span class="tnum">${score}</span><small>/100</small></div>
      </div>`;
    const eyebrowColor = score >= 75 ? 'var(--lime)' : score >= 45 ? 'var(--warn)' : 'var(--neg)';
    $('#ringLabel').style.color = eyebrowColor;
    $('#ringLabel').textContent = label;
    requestAnimationFrame(() => {
      const arc = document.getElementById('ringArc');
      if (arc) arc.style.strokeDashoffset = off;
    });
  }

  /* --- donut chart for pool allocations --- */
  function renderPoolDonut(pools) {
    const size = 140, r = 52, cx = size/2, cy = size/2, C = 2 * Math.PI * r, sw = 18;
    let off = 0;
    const segs = pools.map(p => {
      const len = p.pct / 100 * C;
      const dash = `${len} ${C - len}`;
      const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.color}" stroke-width="${sw}" stroke-dasharray="${dash}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})" style="transition:stroke-dasharray .9s var(--ease)"/>`;
      off += len; return el;
    }).join('');
    $('#poolDonut').innerHTML = `
      <div class="donut" style="position:relative;flex:none">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--ink-500)" stroke-width="${sw}"/>
          ${segs}
        </svg>
        <div class="center" style="position:absolute;inset:0;display:grid;place-items:center;text-align:center">
          <b style="font-family:var(--display);font-size:14px;color:var(--cream);display:block">${pools.length}</b>
          <span style="font-size:10px;color:var(--t-lo);font-family:var(--mono)">POOLS</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;flex:1">
        ${pools.map(p => `
          <div style="display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--t-mid)">
            <span style="width:10px;height:10px;border-radius:3px;background:${p.color};flex:none"></span>
            <span style="flex:1">${p.label}</span>
            <span style="font-family:var(--mono);color:var(--cream);font-size:12px">${p.pct}%</span>
            <span style="color:var(--t-lo);font-size:11px">${(p.value/1000).toFixed(0)}K</span>
          </div>`).join('')}
      </div>`;
  }

  /* --- simulate --- */
  async function runSimulation() {
    const btn = $('#simBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> <span>${g('te_simulating')}</span>`;
    state.totalSupply = parseInt($('#supplyInput').value) || 1000000;
    state.topFans = parseInt($('#topFansInput').value) || 50;
    state.avgAirdrop = parseInt($('#avgAirdropInput').value) || 1000;
    state.monthlyBudget = parseInt($('#monthlyBudgetInput').value) || 5000;

    let simData = null;
    try {
      const res = await fetch(API + '/api/token-economy/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalSupply: state.totalSupply, topFanCount: state.topFans, averageAirdrop: state.avgAirdrop, monthlyRewardBudget: state.monthlyBudget })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) simData = json.data;
      }
    } catch (_) {}

    if (!simData) {
      const poolSize = Math.round(state.totalSupply * 0.2);
      const communityPool = Math.round(state.totalSupply * 0.5);
      const required = state.topFans * state.avgAirdrop;
      const months = state.monthlyBudget > 0 ? Math.floor(communityPool / state.monthlyBudget) : 0;
      simData = {
        airdropSim: { requiredTokens: required, poolSize, enoughPool: required <= poolSize, remainingPool: Math.max(0, poolSize - required), message: required <= poolSize ? 'Launch airdrop fits inside the configured pool.' : 'Airdrop exceeds the launch pool.' },
        rewardsSim: { monthlyRewardBudget: state.monthlyBudget, poolSize: communityPool, monthsCovered: months, recommendation: months < 6 ? 'Community rewards pool may drain too quickly.' : 'Community rewards pool supports a solid runway.' }
      };
    }
    state.simResult = simData;
    renderSimResults(simData);
    btn.disabled = false;
    btn.innerHTML = `<span>${g('te_simulate')}</span>`;
  }

  function renderSimResults(sim) {
    const ok = sim.airdropSim.enoughPool;
    const months = sim.rewardsSim.monthsCovered;
    const req = (sim.airdropSim.requiredTokens / 1000).toFixed(0);
    const pool = (sim.airdropSim.poolSize / 1000).toFixed(0);
    const monLabel = g('te_months');
    $('#simResults').innerHTML = `
      <div style="border-top:1px solid var(--line);padding-top:18px;margin-top:4px">
        <div class="eyebrow no-rule" style="margin-bottom:14px"><span>${g('te_airdrop_t')}</span></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:13.5px;color:var(--t-mid)">Required tokens</span>
          <span style="font-family:var(--display);font-size:16px;color:var(--cream)">${req}K</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <span style="font-size:13.5px;color:var(--t-mid)">Pool available</span>
          <span style="font-family:var(--display);font-size:16px;color:var(--cream)">${pool}K</span>
        </div>
        <div class="alert ${ok ? 'pos' : 'warn'}" style="font-size:13px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ok ? '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>' : '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'}  </svg>
          <span>${ok ? g('te_airdrop_ok') + ' — ' + sim.airdropSim.message : g('te_airdrop_nok') + ' — ' + sim.airdropSim.message}</span>
        </div>
        <div style="margin-top:16px;border-top:1px solid var(--line);padding-top:16px">
          <div class="eyebrow no-rule" style="margin-bottom:12px"><span>${g('te_rewards_t')}</span></div>
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
            <span style="font-family:var(--display);font-size:36px;font-weight:600;color:var(--lime)">${months}</span>
            <span style="color:var(--t-mid);font-size:14px">${monLabel}</span>
          </div>
          <p style="font-size:13px;color:var(--t-lo)">${sim.rewardsSim.recommendation}</p>
        </div>
      </div>`;
  }

  /* --- risk display --- */
  function renderRisk(validation, economy) {
    const pressure = economy ? (economy.redemptionPressure || 0) : 12;
    const liability = economy ? (economy.estimatedLiability || 70).toFixed(2) : '70.90';
    const errors = validation ? validation.errors : [];
    const warnings = validation ? validation.warnings : ['Creator reserve is above 15%.'];
    const issues = [...errors, ...warnings];
    $('#riskPanel').innerHTML = `
      <div class="panel-head">
        <div><h3>${g('te_risk_t')}</h3></div>
        <span class="pill ${issues.length === 0 ? 'lime' : 'gold'}">${issues.length === 0 ? 'Low risk' : issues.length + ' issue' + (issues.length > 1 ? 's' : '')}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="kpi"><div class="kpi-label">${g('te_pressure')}</div><div class="kpi-value tnum">${pressure}<span class="unit">%</span></div></div>
        <div class="kpi"><div class="kpi-label">${g('te_liability')}</div><div class="kpi-value tnum">€${liability}</div></div>
      </div>
      ${issues.length === 0
        ? `<div class="alert pos" style="font-size:13px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg><span>${g('te_valid_ok')}</span></div>`
        : issues.map((msg, i) => `
          <div class="alert ${i < errors.length ? 'warn' : 'info'}" style="font-size:13px;margin-bottom:8px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <span>${msg}</span>
          </div>`).join('')}
      <p class="faint" style="font-size:12px;margin-top:14px;border-top:1px solid var(--line);padding-top:12px">${g('te_disclaimer')}</p>`;
  }

  async function init() {
    AuraI18n.apply();
    // bind mode chips
    document.querySelectorAll('[data-mode]').forEach(el =>
      el.addEventListener('click', () => {
        document.querySelectorAll('[data-mode]').forEach(m => m.classList.remove('on'));
        el.classList.add('on');
        state.mode = el.getAttribute('data-mode');
      }));
    const data = await loadReadiness();
    readiness = data;
    const score = data.readiness ? data.readiness.score : 28;
    renderScoreRing(score);
    const pools = computePoolData(state.totalSupply);
    renderPoolDonut(pools);
    renderRisk(data.validation, data.economy);
    $('#simBtn').addEventListener('click', runSimulation);
    AuraI18n.apply();
  }
  init();
  AuraI18n.onChange(() => {
    const pools = computePoolData(state.totalSupply);
    renderPoolDonut(pools);
    if (state.simResult) renderSimResults(state.simResult);
    AuraI18n.apply();
  });
})();
