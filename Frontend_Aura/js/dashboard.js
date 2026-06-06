/* AURA — dashboard render — HONEST, real-account-driven.
   Shows ONLY the connected Instagram account's real Graph API data. The seeded
   demo loyalty program is never displayed as the user's. Program-specific
   metrics (fan pass holders, reward claims, fan tiers, actual revenue) show an
   honest "not started" empty state until a real program exists. No fabricated
   sparklines / fallback percentages / arbitrary funnel multipliers. */
(function () {
  auraMountShell('dashboard');
  const g = (k) => AuraI18n.get(k);
  const $ = (s) => document.querySelector(s);
  const API = window.AURA_API_BASE || 'http://localhost:3000';

  function formatN(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }
  function setText(sel, txt) { const el = $(sel); if (el) el.textContent = txt; }
  function getConn() {
    const c = window.AuraIGConnect && window.AuraIGConnect.getConnection && window.AuraIGConnect.getConnection();
    return (c && c.connectionId && c.igUserId) ? c : null;
  }

  /* ─── KPI card (no fake sparkline) ─── */
  function kpiCard(label, value, unit, foot, opts) {
    opts = opts || {};
    const footHtml = opts.notStarted
      ? `<span class="badge" style="background:rgba(255,247,232,.06);color:rgba(255,247,232,.45);border:1px solid rgba(255,247,232,.1)">${foot}</span>`
      : opts.sim
        ? `<span class="badge" style="background:rgba(200,169,106,.12);color:#C8A96A;border:1px solid rgba(200,169,106,.3)">${foot}</span>`
        : `<span class="excellent">${foot}</span>`;
    return `<div class="kcard">
      <div class="kl">${label}</div>
      <div class="kv tnum ${opts.lime ? 'lime' : ''}">${value}${unit ? `<small>${unit}</small>` : ''}</div>
      <div class="kfoot">${footHtml}</div>
    </div>`;
  }

  function emptyBlock(msg, ctaText, ctaHref) {
    return `<div style="display:flex;flex-direction:column;gap:10px;align-items:flex-start;justify-content:center;height:100%;min-height:90px;padding:6px 2px">
      <p class="faint" style="font-size:13px;line-height:1.5">${msg}</p>
      ${ctaText ? `<a href="${ctaHref}" class="btn btn-line btn-sm">${ctaText}</a>` : ''}
    </div>`;
  }

  /* ─── Connected: render the real account ─── */
  function renderConnected(d, prog) {
    const p = d.profile || {}, ov = d.overview || {}, eng = d.engagement || {};
    const followers = Number(p.followersCount || 0);
    const monthly   = (d.revenue && d.revenue.realistic) ? Number(d.revenue.realistic.monthlyRevenue || 0) : 0;
    const reachUnavailable = (d.warnings || []).some((w) => ['reach', 'impressions', 'saved'].includes(w.metric));
    const launched  = Boolean(prog && prog.launched);
    const stats     = (prog && prog.stats) || {};
    const counts    = (prog && prog.counts) || {};
    const readiness = Math.round(Number(d.readinessScore || 0));
    const progName  = (prog && prog.program && prog.program.name) || '';

    setText('[data-t="d_hello"]', 'Welcome back, @' + (p.username || p.igUserId || ''));
    setText('[data-t="d_sub"]', launched
      ? `Live Instagram data · loyalty program “${progName}” is active.`
      : "Live Instagram data. Your loyalty program isn't started yet.");

    // KPIs — REAL program values once launched (zeros are honest for a fresh program),
    // "not started" otherwise. Revenue stays a labelled projection; followers are live.
    const ns = { notStarted: true };
    $('#kpiRow').innerHTML = [
      launched ? kpiCard(g('k1_l'), String(readiness), '/100', 'Active', { lime: true }) : kpiCard(g('k1_l'), '—', '', 'Not started', ns),
      launched ? kpiCard(g('k2_l'), String(readiness), '/100', 'Active', { lime: true }) : kpiCard(g('k2_l'), '—', '', 'Not started', ns),
      kpiCard(g('k3_l'), monthly > 0 ? '€' + formatN(monthly) : '€0', '', 'Potential · sim', { sim: true }),
      launched ? kpiCard(g('k4_l'), String(counts.fanPasses || 0), '', 'Active', {}) : kpiCard(g('k4_l'), '0', '', 'Not started', ns),
      launched ? kpiCard(g('k5_l'), String(stats.rewardsRedeemed || 0), '', 'Active', {}) : kpiCard(g('k5_l'), '0', '', 'Not started', ns),
      kpiCard(g('k6_l'), formatN(followers), 'followers', 'live', { lime: true })
    ].join('');

    renderIGBadge(p, ov, eng, reachUnavailable, Boolean(d.mock));
    renderFunnel(followers);

    if (launched) {
      const total = Number(stats.activeFans || 0);
      $('#donut').innerHTML = emptyBlock(total > 0 ? `${total} program members` : 'Program active · no members yet.');
      $('#adLegend').innerHTML = `<p class="faint" style="font-size:12.5px">Program <b style="color:var(--cream)">${progName}</b> is active · ${total} fans · ${counts.rules || 0} earning rules. Members appear as your audience earns points.</p>
        <a href="loyalty.html" class="btn btn-line btn-sm" style="margin-top:10px">Manage program →</a>`;
    } else {
      $('#donut').innerHTML = emptyBlock('No program members yet.');
      $('#adLegend').innerHTML = `<p class="faint" style="font-size:12.5px">Launch your loyalty program to convert followers into ranked fans.</p>
        <button class="btn btn-primary btn-sm" id="launchProgBtn" style="margin-top:10px">Launch loyalty program</button>`;
      const lb = $('#launchProgBtn');
      if (lb) lb.addEventListener('click', () => launchProgram(lb));
    }

    // Rewards — none created yet (real program may have some later).
    $('#rewards').innerHTML = emptyBlock('No rewards created yet.', 'Create a reward →', 'loyalty.html');

    // Revenue chart — projection from real followers (clearly a simulation).
    renderRevenueProjection(monthly);
    setText('[data-t="rev_v"]', monthly > 0 ? '€' + formatN(monthly) : '€0');

    // Top post — real numbers, or honest empty.
    renderTopPost(d.topPosts || []);

    // Airdrop pool — no token program yet.
    setText('#adPool', 'Not started');
  }

  /* ─── Top post panel: real stats or honest empty (no fabricated 8,241 ♥) ─── */
  function renderTopPost(posts) {
    const tp = posts && posts.length ? posts[0] : null;
    const thumb = $('#postThumb'), play = $('#postPlay');
    if (tp) {
      setText('#tpLikes',    tp.likes != null ? formatN(tp.likes) : '—');
      setText('#tpComments', tp.comments != null ? formatN(tp.comments) : '—');
      setText('#tpReach',    tp.reach ? formatN(tp.reach) : '—'); // reach often unavailable pre-pro
      if (thumb && tp.thumbnailUrl) {
        thumb.style.backgroundImage = `url(${tp.thumbnailUrl})`;
        thumb.style.backgroundSize = 'cover';
        thumb.style.backgroundPosition = 'center';
      }
      if (play) play.style.display = (tp.mediaType === 'VIDEO' || tp.mediaType === 'REELS') ? '' : 'none';
    } else {
      ['#tpLikes', '#tpComments', '#tpReach'].forEach((s) => setText(s, '—'));
      if (play) play.style.display = 'none';
      if (thumb) { thumb.style.backgroundImage = 'none'; thumb.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;color:rgba(255,247,232,.4);font-size:12.5px">No posts yet</div>`; }
    }
  }

  function renderIGBadge(p, ov, eng, reachUnavailable, mock) {
    const sub = $('[data-t="d_sub"]');
    if (!sub) return;
    document.getElementById('ig-connected-badge')?.remove();
    const badge = document.createElement('div');
    badge.id = 'ig-connected-badge';
    badge.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:7px 14px;margin-top:10px;font-size:12.5px;color:rgba(255,247,232,.6)';
    const avg = eng.averageLikes != null ? `· ${formatN(eng.averageLikes)} avg ♥ ` : '';
    badge.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:6px">
        <span style="width:7px;height:7px;border-radius:50%;background:#B8FF4D;box-shadow:0 0 6px rgba(184,255,77,.7)"></span>
        Live · Instagram Graph API${mock ? ' (mock)' : ''}
      </span>
      <span>${formatN(p.followersCount || 0)} followers</span>
      <span>${formatN(p.mediaCount || 0)} posts</span>
      <span>${(Number(ov.average_engagement_rate) || 0).toFixed(1)}% engagement ${avg}</span>
      ${reachUnavailable ? `<span style="color:#e0b66a">⚠ reach/impressions unavailable for these posts (pre-pro account)</span>` : ''}`;
    sub.insertAdjacentElement('afterend', badge);
  }

  /* ─── Funnel: real followers, honest empty tiers ─── */
  function renderFunnel(followers) {
    const rows = [
      { label: g('fn_1'), val: formatN(followers) },           // Total followers (real)
      { label: g('fn_2'), val: '—' },                          // Engaged (needs program)
      { label: g('fn_3'), val: '—' },                          // Active fans
      { label: g('fn_4'), val: '—' }                           // Superfans
    ];
    const maxW = 168, h = 44, widths = [100, 74, 50, 26];
    let html = '';
    for (let i = 0; i < rows.length; i++) {
      const tw = widths[i] / 100 * maxW;
      const bw = (widths[i + 1] || widths[i] * 0.55) / 100 * maxW;
      const sh = 0.95 - i * 0.12;
      const ins = (maxW - tw) / 2, insB = (maxW - bw) / 2;
      const muted = i > 0 ? 'opacity:.5' : '';
      html += `<div class="fseg" style="${muted};width:${maxW}px;height:${h}px;background:linear-gradient(180deg,rgba(184,255,77,${sh}),rgba(143,204,61,${sh - .1}));clip-path:polygon(${ins}px 0,${maxW - ins}px 0,${maxW - insB}px 100%,${insB}px 100%)">
        <div class="fmeta"><b>${rows[i].val}</b><span>${rows[i].label}</span></div>
      </div>`;
    }
    $('#funnel').innerHTML = html;
  }

  /* ─── Revenue chart: labelled projection (simulation), not actual ─── */
  const REVX = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
  function renderRevenueProjection(monthlyTarget) {
    const target = Number(monthlyTarget) || 0;
    const REV = [0.15, 0.27, 0.4, 0.52, 0.63, 0.72, 0.8, 0.86, 0.91, 0.95, 0.98, 1].map((f) => +(f * target).toFixed(2));
    const W = 460, H = 170, max = Math.max(...REV, 0.1) * 1.15, pad = 6;
    const xs = (i) => i / (REV.length - 1) * W;
    const ys = (v) => H - pad - (v / max) * (H - pad * 2);
    const pts = REV.map((v, i) => [xs(i), ys(v)]);
    let dLine = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], cx = (x0 + x1) / 2;
      dLine += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
    }
    const dArea = dLine + ` L${W} ${H} L0 ${H} Z`;
    const grid = [0, max * .25, max * .5, max * .75, max].map((v) =>
      `<line x1="0" y1="${ys(v)}" x2="${W}" y2="${ys(v)}" stroke="rgba(232,220,200,.06)" stroke-width="1"/>`).join('');
    const last = pts[REV.length - 1];
    const chart = $('#revChart');
    if (chart) chart.innerHTML = `
      <defs><linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(184,255,77,.35)"/><stop offset="1" stop-color="rgba(184,255,77,0)"/>
      </linearGradient></defs>
      ${grid}
      <path d="${dArea}" fill="url(#revG)"/>
      <path d="${dLine}" fill="none" stroke="var(--lime)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="filter:drop-shadow(0 0 4px rgba(184,255,77,.5))"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="var(--lime)" style="filter:drop-shadow(0 0 5px rgba(184,255,77,.8))"/>`;
    const tip = $('#revTip');
    if (tip) { tip.textContent = target > 0 ? '€' + formatN(target) + ' potential' : 'No revenue yet'; tip.style.left = (last[0] / W * 100) + '%'; tip.style.top = (last[1] / H * 100) + '%'; }
    if ($('#revX')) $('#revX').innerHTML = REVX.map((x) => `<span>${x}</span>`).join('');
  }

  /* ─── Not connected: prompt to connect, no fake data ─── */
  function renderNotConnected() {
    setText('[data-t="d_hello"]', 'Welcome to Aura');
    setText('[data-t="d_sub"]', 'Connect your Instagram to see your real dashboard.');
    document.getElementById('ig-connected-badge')?.remove();

    const dash = ['k1_l', 'k2_l', 'k3_l', 'k4_l', 'k5_l', 'k6_l'];
    $('#kpiRow').innerHTML = dash.map((k) => kpiCard(g(k), '—', '', 'Connect IG', { notStarted: true })).join('');

    $('#funnel').innerHTML = `<div id="aura-ig-widget" style="margin-bottom:12px"></div>${emptyBlock('Connect Instagram to build your funnel from real followers.')}`;
    if (window.AuraIGConnect && window.AuraIGConnect.render) window.AuraIGConnect.render();
    $('#donut').innerHTML = emptyBlock('No data yet.');
    $('#adLegend').innerHTML = '';
    $('#rewards').innerHTML = emptyBlock('Connect Instagram, then launch your loyalty program.', 'Connect →', 'dashboard.html');
    renderRevenueProjection(0);
    setText('[data-t="rev_v"]', '—');
    renderTopPost([]);            // clears the hardcoded 8,241 ♥ / 512 / 231
    setText('#adPool', '—');
  }

  /* ─── Checklist (onboarding, honest: nothing done yet) ─── */
  const CL = [
    { k: 'cl_1', done: false }, { k: 'cl_2', done: false }, { k: 'cl_3', done: false }, { k: 'cl_4', done: false },
    { k: 'cl_5', done: false }, { k: 'cl_6', done: false }, { k: 'cl_7', done: false }, { k: 'cl_8', done: false }
  ];
  const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
  function renderChecklist() {
    const el = $('#checklist'); if (!el) return;
    // First item = connect Instagram, auto-checked when connected.
    CL[0].done = Boolean(getConn());
    el.innerHTML = CL.map((c, i) => `
      <div class="cl-item ${c.done ? 'done' : ''}" data-cl="${i}">
        <span class="cl-check">${check}</span><span class="cl-label">${g(c.k)}</span>
      </div>`).join('');
    updateClProg();
    document.querySelectorAll('[data-cl]').forEach((el) =>
      el.addEventListener('click', () => {
        const i = +el.getAttribute('data-cl');
        CL[i].done = !CL[i].done; el.classList.toggle('done', CL[i].done); updateClProg();
      }));
  }
  function updateClProg() {
    const done = CL.filter((c) => c.done).length;
    setText('#clProg', done + ' / ' + CL.length + ' ' + g('cl_done'));
  }

  /* ─── Airdrop button (clearly a simulation; disabled without a program) ─── */
  function airdrop() {
    const b = $('#airdropBtn'); if (!b) return;
    b.disabled = true; b.textContent = g('ad_running');
    setTimeout(() => {
      b.disabled = false; b.textContent = 'No program yet';
      setTimeout(() => { b.textContent = g('ad_btn'); }, 1600);
    }, 700);
  }

  function connQS() {
    const c = getConn();
    return c ? '?connectionId=' + encodeURIComponent(c.connectionId) + '&igUserId=' + encodeURIComponent(c.igUserId) : '';
  }
  async function fetchIG() {
    if (!getConn()) return null;
    try {
      const r = await fetch(API + '/api/dashboard/instagram-stats' + connQS());
      if (!r.ok) return null;
      const j = await r.json();
      return j.success ? j.data : null;
    } catch { return null; }
  }
  async function fetchCreatorProgram() {
    if (!getConn()) return null;
    try {
      const r = await fetch(API + '/api/loyalty/creator-program' + connQS());
      if (!r.ok) return null;
      const j = await r.json();
      return j.success ? j.data : null;
    } catch { return null; }
  }
  async function launchProgram(btn) {
    const conn = getConn();
    if (!conn) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Launching…'; }
    try {
      const r = await fetch(API + '/api/loyalty/launch-program', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: conn.connectionId, igUserId: conn.igUserId }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || j.success === false) {
        if (btn) { btn.disabled = false; btn.textContent = 'Launch failed — retry'; }
        return;
      }
      init(); // re-render with the now-active program
    } catch {
      if (btn) { btn.disabled = false; btn.textContent = 'Launch failed — retry'; }
    }
  }

  async function init() {
    AuraI18n.apply();
    renderChecklist();
    const ig = await fetchIG();
    if (!ig) { renderNotConnected(); AuraI18n.apply(); return; }
    const prog = await fetchCreatorProgram();
    renderConnected(ig, prog);
    AuraI18n.apply();
  }

  init();
  $('#airdropBtn')?.addEventListener('click', airdrop);
  AuraI18n.onChange(() => { init(); });
  window.addEventListener('aura:ig:connected', () => init());
  window.addEventListener('aura:ig:disconnected', () => { document.getElementById('ig-connected-badge')?.remove(); init(); });
})();
