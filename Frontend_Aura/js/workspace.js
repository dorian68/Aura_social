/* AURA — Workspace / Platform health logic */
(function () {
  auraMountShell('workspace');
  const g = (k) => AuraI18n.get(k);
  const $ = (s) => document.querySelector(s);

  const API = window.AURA_API_BASE || 'http://localhost:3000';

  const STATUS_COLORS = {
    ready: 'var(--lime)', mock_ready: '#7FB6FF', missing_config: 'var(--warn)',
    error: 'var(--neg)', disabled: 'var(--t-lo)'
  };
  const STATUS_LABELS = {
    ready: 'ws_status_ready', mock_ready: 'ws_status_mock',
    missing_config: 'ws_status_missing', error: 'ws_status_error', disabled: 'ws_status_disabled'
  };
  const MODE_LABELS = {
    real: 'ws_mode_real', mock: 'ws_mode_mock',
    simulation: 'ws_mode_sim', local: 'ws_mode_local', future: 'ws_mode_future'
  };

  /* --- mock fallback data --- */
  function mockSnapshot() {
    return {
      workspace: { id: 'workspace_aura_demo', name: 'Aura Prototype Workspace', slug: 'aura-demo', plan: 'prototype', status: 'active', createdAt: new Date().toISOString() },
      connectedAccounts: [],
      integrations: [
        { key: 'meta_login', label: 'Meta Login', status: 'mock_ready', mode: 'mock', configured: false, safeMode: false, missingConfig: ['APP_ID', 'APP_SECRET'], notes: ['Mock mode is active.'] },
        { key: 'instagram_public_discovery', label: 'Instagram Public Discovery', status: 'mock_ready', mode: 'mock', configured: false, safeMode: false, missingConfig: [], notes: ['Mock mode is active.'] },
        { key: 'loyalty_engine', label: 'Loyalty Engine', status: 'ready', mode: 'local', configured: true, safeMode: true, missingConfig: [], notes: ['8 fans, 24 transactions.'] },
        { key: 'b2b_agent', label: 'B2B Expansion Agent', status: 'mock_ready', mode: 'simulation', configured: true, safeMode: true, missingConfig: [], notes: ['4 mock businesses.'] },
        { key: 'google_places', label: 'Google Places', status: 'missing_config', mode: 'future', configured: false, safeMode: true, missingConfig: ['GOOGLE_PLACES_API_KEY'], notes: ['No real API call in MVP.'] },
        { key: 'stripe_payments', label: 'Stripe Payments', status: 'missing_config', mode: 'future', configured: false, safeMode: true, missingConfig: ['STRIPE_SECRET_KEY'], notes: ['Simulated only.'] },
        { key: 'blockchain_contracts', label: 'Blockchain Contracts', status: 'ready', mode: 'local', configured: true, safeMode: true, missingConfig: [], notes: ['ABIs loaded. No live chain.'] },
        { key: 'local_persistence', label: 'Local Persistence', status: 'ready', mode: 'local', configured: true, safeMode: true, missingConfig: [], notes: ['JSON state files.'] }
      ],
      recentAuditEvents: []
    };
  }

  async function fetchSnapshot() {
    try {
      const res = await fetch(API + '/api/workspace/state');
      if (res.ok) {
        const json = await res.json();
        if (json.success) return json.data;
      }
    } catch (_) {}
    return mockSnapshot();
  }

  async function fetchAudit() {
    try {
      const res = await fetch(API + '/api/workspace/audit');
      if (res.ok) {
        const json = await res.json();
        if (json.success) return json.data;
      }
    } catch (_) {}
    return { events: [] };
  }

  function computeScore(integrations) {
    if (!integrations || !integrations.length) return 0;
    const ready = integrations.filter(i => i.status === 'ready' || i.status === 'mock_ready').length;
    return Math.round(ready / integrations.length * 100);
  }

  function renderKPIs(snapshot) {
    const score = computeScore(snapshot.integrations);
    const ready = (snapshot.integrations || []).filter(i => i.status === 'ready' || i.status === 'mock_ready').length;
    const issues = (snapshot.integrations || []).filter(i => i.status === 'error' || i.status === 'missing_config').length;
    const accounts = (snapshot.connectedAccounts || []).length;
    const color = score >= 80 ? 'var(--lime)' : score >= 50 ? 'var(--warn)' : 'var(--neg)';
    $('#wsKpis').innerHTML = `
      <div class="kcard">
        <div class="kl">${g('ws_score')}</div>
        <div class="kv tnum" style="color:${color}">${score}<small style="font-size:.5em;color:var(--t-lo)">/100</small></div>
        <div class="kfoot"><span class="pill ${score >= 80 ? 'lime' : ''}" style="font-size:11px">${score >= 80 ? 'Healthy' : score >= 50 ? 'Degraded' : 'Critical'}</span></div>
      </div>
      <div class="kcard">
        <div class="kl">${g('ws_integrations')}</div>
        <div class="kv tnum">${ready}<small style="font-size:.5em;color:var(--t-lo)">${snapshot.integrations ? ' / ' + snapshot.integrations.length : ''}</small></div>
        <div class="kfoot"><span class="faint">ready</span></div>
      </div>
      <div class="kcard">
        <div class="kl">${g('ws_connected')}</div>
        <div class="kv tnum">${accounts}</div>
        <div class="kfoot"><span class="faint">accounts</span></div>
      </div>
      <div class="kcard">
        <div class="kl">${g('ws_issues')}</div>
        <div class="kv tnum ${issues > 0 ? 'lime' : ''}" style="${issues > 0 ? 'color:var(--warn)' : ''}">${issues}</div>
        <div class="kfoot"><span class="faint">need attention</span></div>
      </div>`;
  }

  function statusDot(status) {
    const c = STATUS_COLORS[status] || 'var(--t-lo)';
    return `<span style="width:8px;height:8px;border-radius:50%;background:${c};box-shadow:0 0 6px ${c};flex:none;display:inline-block"></span>`;
  }

  function renderIntegrations(integrations) {
    if (!integrations || !integrations.length) return;
    $('#intGrid').innerHTML = integrations.map(ig => {
      const statusLabel = g(STATUS_LABELS[ig.status] || 'ws_status_disabled');
      const modeLabel = g(MODE_LABELS[ig.mode] || 'ws_mode_local');
      const hasIssues = ig.missingConfig && ig.missingConfig.length > 0;
      return `
        <div class="int-card" style="display:flex;align-items:center;gap:14px;padding:14px;border-radius:var(--r-md);border:1px solid var(--line);background:linear-gradient(180deg,var(--glass-2),transparent);transition:border-color .2s" onmouseover="this.style.borderColor='var(--line-strong)'" onmouseout="this.style.borderColor='var(--line)'">
          <span style="flex:none">${statusDot(ig.status)}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;color:var(--cream)">${ig.label}</div>
            ${hasIssues ? `<div style="font-size:12px;color:var(--warn);margin-top:2px">Missing: ${ig.missingConfig.slice(0,2).join(', ')}</div>` : `<div style="font-size:12px;color:var(--t-lo);margin-top:2px">${ig.notes && ig.notes[0] ? ig.notes[0] : ''}</div>`}
          </div>
          <div style="text-align:right;flex:none">
            <div style="font-size:12px;font-weight:700;font-family:var(--mono);color:${STATUS_COLORS[ig.status] || 'var(--t-lo)'};">${statusLabel}</div>
            <div style="font-size:11px;color:var(--t-lo);margin-top:2px">${modeLabel}</div>
          </div>
        </div>`;
    }).join('');
  }

  function renderAccounts(accounts) {
    const el = $('#accountsList');
    if (!accounts || accounts.length === 0) {
      el.innerHTML = `<p class="faint" style="font-size:13px;padding:12px 0">${g('ws_empty_accounts')}</p>`;
      return;
    }
    el.innerHTML = accounts.map(a => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--forest),var(--ink-600));border:1px solid var(--line);display:grid;place-items:center;flex:none;font-family:var(--display);font-size:14px;color:var(--lime)">${(a.displayName||'A')[0]}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600;color:var(--cream)">${a.displayName}</div>
          <div style="font-size:12px;color:var(--t-lo)">${a.username || ''} · ${a.provider}</div>
        </div>
        <span style="font-size:12px;font-weight:700;font-family:var(--mono);color:${STATUS_COLORS[a.status]||'var(--t-lo)'}">${a.status}</span>
      </div>`).join('');
  }

  function renderAudit(events) {
    const el = $('#auditList');
    if (!events || events.length === 0) {
      el.innerHTML = `<p class="faint" style="font-size:13px;padding:12px 0">${g('ws_no_audit')}</p>`;
      return;
    }
    const SEVERITY_COLORS = { info: 'var(--t-lo)', warn: 'var(--warn)', error: 'var(--neg)' };
    el.innerHTML = events.slice(0, 8).map(e => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:13px 0;border-bottom:1px solid var(--line)">
        <span style="width:8px;height:8px;border-radius:50%;background:${SEVERITY_COLORS[e.severity]||'var(--t-lo)'};flex:none;margin-top:5px;box-shadow:0 0 5px currentColor"></span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--cream)">${e.action}</div>
          <div style="font-size:12.5px;color:var(--t-mid);margin-top:2px;line-clamp:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.message}</div>
        </div>
        <span style="font-family:var(--mono);font-size:11px;color:var(--t-lo);white-space:nowrap;flex:none">${new Date(e.createdAt).toLocaleTimeString()}</span>
      </div>`).join('');
  }

  async function load() {
    const btn = $('#refreshBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:16px;height:16px"></span> <span>${g('ws_refreshing')}</span>`;

    const [snapshot, auditData] = await Promise.all([fetchSnapshot(), fetchAudit()]);
    const events = auditData.events || snapshot.recentAuditEvents || [];

    renderKPIs(snapshot);
    renderIntegrations(snapshot.integrations);
    renderAccounts(snapshot.connectedAccounts);
    renderAudit(events);
    AuraI18n.apply();

    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> <span>${g('ws_refresh')}</span>`;
  }

  function init() {
    AuraI18n.apply();
    $('#refreshBtn').addEventListener('click', load);
    load();
  }
  init();
  AuraI18n.onChange(() => { load(); });
})();
