/* AURA — analyzer flow logic
   REAL DATA ONLY. Analyzes the OAuth-connected Instagram account via the official
   Graph API (/api/dashboard/instagram-stats). No fabricated/sample numbers, no
   scraping — only the consented connected account. Metrics Instagram does not
   expose are shown as "—" rather than invented. */
(function () {
  auraMountShell('analyzer');
  AuraI18n.apply();

  const API = window.AURA_API_BASE || 'http://localhost:3000';
  const $ = (s) => document.querySelector(s);
  const stageInput = $('#stageInput'), stageLoad = $('#stageLoad'), stageResults = $('#stageResults');

  function getConn() {
    const c = window.AuraIGConnect && window.AuraIGConnect.getConnection && window.AuraIGConnect.getConnection();
    return (c && c.connectionId && c.igUserId) ? c : null;
  }
  function fmt(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }
  const DASH = '—';

  // The analyzer targets the OAuth-connected account only (the one we are legally
  // authorized to analyze). Free-text creator search is intentionally absent until
  // Business Discovery is configured — no fake/sample lookups.
  function renderInputStage() {
    const target = $('#analyzeTarget');
    if (!target) return;
    const conn = getConn();
    if (conn) {
      target.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:16px">
          <div style="display:inline-flex;align-items:center;gap:9px;font-size:14.5px;color:var(--cream);background:rgba(184,255,77,.07);border:1px solid rgba(184,255,77,.25);border-radius:999px;padding:8px 16px">
            <span style="width:8px;height:8px;border-radius:50%;background:#B8FF4D;box-shadow:0 0 7px rgba(184,255,77,.7)"></span>
            <span>Compte connecté : <b>@${conn.username || conn.igUserId}</b></span>
          </div>
          <button class="btn btn-primary" id="analyzeBtn" style="min-width:220px">Analyser mon compte</button>
        </div>`;
      const btn = $('#analyzeBtn');
      if (btn) btn.addEventListener('click', start);
    } else {
      target.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:16px">
          <p class="muted" style="max-width:30em">Connecte ton Instagram pour analyser <b>ton compte</b> avec la vraie API Graph officielle — aucune donnée inventée.</p>
          <div id="aura-ig-widget"></div>
        </div>`;
      if (window.AuraIGConnect && window.AuraIGConnect.render) window.AuraIGConnect.render();
    }
  }

  async function start() {
    const conn = getConn();
    if (!conn) { renderNotConnected(); return; }

    // real loading state while we hit the Graph API
    stageInput.classList.add('hide');
    stageResults.classList.add('hide');
    stageLoad.classList.remove('hide');
    $('#loadHandle').textContent = '@' + (conn.username || conn.igUserId);
    renderLoadingSteps();

    try {
      const res = await fetch(
        API + '/api/dashboard/instagram-stats'
          + '?connectionId=' + encodeURIComponent(conn.connectionId)
          + '&igUserId='     + encodeURIComponent(conn.igUserId)
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || json.success === false) {
        const msg = (json && json.error && (json.error.message || json.error.code)) || ('HTTP ' + res.status);
        renderError(msg);
        return;
      }
      showResults(buildProfile(json.data, conn));
    } catch (e) {
      renderError((e && e.message) || 'Network error.');
    }
  }

  /* Map the REAL Graph API response onto the result view model.
     Unavailable metrics → DASH (never fabricated). Revenue is an explicit,
     labelled projection (kept under the existing "Simulation" pills). */
  function buildProfile(d, conn) {
    const p = d.profile || {};
    const ov = d.overview || {};
    const posts = d.topPosts || [];
    const reachUnavailable = (d.warnings || []).some(w => ['reach', 'impressions'].includes(w.metric));

    const followers = Number(p.followersCount || 0);
    const eng = Number(ov.average_engagement_rate || 0);
    const saveRate = Number(ov.save_rate || 0);
    const reachRate = Number(ov.reach_rate || 0);
    const score = Number(d.readinessScore || 0);
    const monthly = d.revenue && d.revenue.realistic ? d.revenue.realistic.monthlyRevenue : null;

    // real per-post aggregates (likes/comments ARE exposed even when reach isn't)
    const totalLikes = posts.reduce((s, x) => s + (Number(x.likes) || 0), 0);
    const totalComments = posts.reduce((s, x) => s + (Number(x.comments) || 0), 0);

    // breakdown bars from real metrics; clamp 0..100; DASH-driving metrics → 0
    const breakdown = [
      clamp(eng * 10),                                  // engagement
      reachUnavailable ? 0 : clamp(reachRate),          // reach rate
      clamp(saveRate * 10),                             // save rate
      clamp(Math.min(100, (Number(p.mediaCount) || 0) * 4)), // posting volume
      clamp(score),                                     // token readiness
    ];

    // projection series (SIMULATION — labelled in UI). 0 if no revenue model.
    const target = Number(monthly) || 0;
    const rev = [0.15, 0.3, 0.48, 0.66, 0.83, 1].map(f => +(f * target).toFixed(1));

    return {
      handle: p.username || conn.username || conn.igUserId,
      initial: (p.username || 'i')[0].toUpperCase(),
      pfp: p.profilePictureUrl || '',
      cat: 'Compte connecté · Instagram Graph API',
      followers: fmt(followers),
      posts: String(p.mediaCount != null ? p.mediaCount : DASH),
      following: DASH, // Instagram Graph API does not expose following count
      score: Math.round(score),
      eng: eng ? +eng.toFixed(1) : 0,
      likes: posts.length ? fmt(totalLikes) : DASH,
      comments: posts.length ? fmt(totalComments) : DASH,
      potential: saveRate ? +saveRate.toFixed(1) : (eng ? +eng.toFixed(1) : 0),
      readiness: score >= 85 ? 'A+' : score >= 70 ? 'A' : score >= 50 ? 'B+' : 'B',
      revenue: target ? '$' + fmt(target) : DASH,
      breakdown: breakdown,
      rev: rev,
      topPosts: posts,
      reachUnavailable: reachUnavailable,
      mock: Boolean(d.mock),
    };
  }
  function clamp(n) { return Math.max(0, Math.min(100, Math.round(Number(n) || 0))); }

  const LOAD_STEPS = ['a_step1','a_step2','a_step3','a_step4','a_step5','a_step6'];
  // Indeterminate progress shown WHILE the real Graph API request is in flight.
  // It does not drive results — showResults() is called by start() on the response.
  function renderLoadingSteps() {
    const stepsEl = $('#loadSteps');
    if (stepsEl) stepsEl.innerHTML = LOAD_STEPS.map(k =>
      `<div class="load-step active" data-step="${k}">
         <span class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></span>
         <span data-t="${k}">${AuraI18n.get(k)}</span>
       </div>`).join('');
    const arc = $('#loadArc'), pct = $('#loadPct');
    if (pct) pct.textContent = '…';
    if (arc) { arc.style.strokeDashoffset = 110; arc.style.transition = 'stroke-dashoffset .9s var(--ease)'; }
  }

  function renderNotConnected() {
    stageInput.classList.add('hide');
    stageLoad.classList.add('hide');
    stageResults.classList.remove('hide');
    stageResults.classList.add('fade-in');
    stageResults.innerHTML = `
      <div class="card glow" style="max-width:520px;margin:40px auto;text-align:center;padding:34px">
        <h2 class="h-lg" style="font-size:22px;margin-bottom:10px">Connecte ton compte Instagram</h2>
        <p class="muted" style="margin-bottom:20px">L'analyse utilise l'<b>API Instagram Graph officielle</b> sur ton compte connecté — aucune donnée inventée. Connecte-toi pour voir tes vraies statistiques.</p>
        <div id="aura-ig-widget" style="display:flex;justify-content:center;margin-bottom:18px"></div>
        <a href="dashboard.html" class="btn btn-line btn-sm">Aller au dashboard</a>
      </div>`;
    if (window.AuraIGConnect && window.AuraIGConnect.render) window.AuraIGConnect.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderError(msg) {
    stageLoad.classList.add('hide');
    stageResults.classList.remove('hide');
    stageResults.classList.add('fade-in');
    stageResults.innerHTML = `
      <div class="card" style="max-width:560px;margin:40px auto;text-align:center;padding:30px;border-color:rgba(224,122,77,.35)">
        <h2 class="h-lg" style="font-size:20px;margin-bottom:10px;color:#ffb9a3">Analyse impossible</h2>
        <p class="muted" style="margin-bottom:18px">L'API Instagram a renvoyé : <b style="color:#ffd6c6">${String(msg)}</b></p>
        <p class="faint" style="font-size:12.5px;margin-bottom:18px">Ta session de connexion a peut-être expiré (≈ 60 min). Reconnecte ton compte et réessaie.</p>
        <button class="btn btn-ghost btn-sm" id="retryBtn">Réessayer</button>
      </div>`;
    const r = $('#retryBtn');
    if (r) r.addEventListener('click', start);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showResults(p) {
    stageLoad.classList.add('hide');
    stageResults.classList.remove('hide');
    stageResults.classList.add('fade-in');
    const g = (k) => AuraI18n.get(k);
    const off = 502 - (502 * p.score / 100);
    const realBadge = p.mock
      ? `<span class="pill gold">Mode mock</span>`
      : `<span class="pill lime dot">Live · Instagram Graph API</span>`;
    const reachNote = p.reachUnavailable
      ? `<p class="faint" style="font-size:12px;margin-top:6px;color:#e0b66a">⚠ Reach / impressions / saves indisponibles pour ces posts (publiés avant le passage en compte pro — l'API Instagram ne les fournit pas). Valeurs réelles affichées : "—".</p>`
      : '';
    stageResults.innerHTML = `
      <div class="res-head">
        <div class="res-pfp">${p.pfp ? `<img src="${p.pfp}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">` : p.initial}</div>
        <div style="flex:1;min-width:200px">
          <div class="row gap-12" style="flex-wrap:wrap">
            <h2 class="h-lg" style="font-size:26px">@${p.handle}</h2>
            <span class="pill lime dot">${p.readiness} · ${g('m_readiness')}</span>
            ${realBadge}
          </div>
          <p class="muted" style="margin-top:4px">${p.cat}</p>
          ${reachNote}
          <div class="row gap-24" style="margin-top:12px;flex-wrap:wrap">
            <span><b style="font-family:var(--display);font-size:18px;color:var(--cream)">${p.followers}</b> <span class="faint" style="font-size:13px">${g('r_followers')}</span></span>
            <span><b style="font-family:var(--display);font-size:18px;color:var(--cream)">${p.posts}</b> <span class="faint" style="font-size:13px">${g('r_posts')}</span></span>
            <span><b style="font-family:var(--display);font-size:18px;color:var(--cream)">${p.following}</b> <span class="faint" style="font-size:13px">${g('r_following')}</span></span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" id="againBtn">${g('r_again')}</button>
      </div>

      <div class="res-grid">
        <div class="stack gap-16">
          <div class="card score-panel glow">
            <div class="big-ring">
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(232,220,200,.1)" stroke-width="11"/>
                <circle cx="100" cy="100" r="80" fill="none" stroke="var(--lime)" stroke-width="11" stroke-linecap="round" stroke-dasharray="502" stroke-dashoffset="502" style="filter:drop-shadow(0 0 8px rgba(184,255,77,.6));transition:stroke-dashoffset 1.3s var(--ease)" id="bigArc"/>
              </svg>
              <div class="v"><span class="tnum">${p.score}</span><small>/100</small></div>
            </div>
            <div class="eyebrow no-rule" style="justify-content:center;margin-bottom:8px"><span>${g('r_score_label')}</span></div>
            <p class="muted" style="max-width:24em;margin:0 auto">${g('r_score_caption')}</p>
          </div>

          <div class="card">
            <div class="eyebrow gold no-rule" style="margin-bottom:18px"><span>${g('r_breakdown')}</span></div>
            ${['r_b1','r_b2','r_b3','r_b4','r_b5'].map((k, i) => `
              <div class="bd-row">
                <span style="font-size:14px;color:var(--t-mid)">${g(k)}</span>
                <div class="row gap-12">
                  <div class="bar"><span style="width:0%" data-fill="${p.breakdown[i]}"></span></div>
                  <b class="tnum" style="font-family:var(--display);font-size:15px;color:var(--cream);min-width:28px;text-align:right">${p.breakdown[i]}</b>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <div class="stack gap-16">
          <div class="card">
            <div class="eyebrow no-rule" style="margin-bottom:18px"><span>${g('r_metrics')}</span></div>
            <div class="metric-grid">
              <div class="kpi"><div class="kpi-label">${g('m_eng')}</div><div class="kpi-value tnum">${p.eng}<span class="unit">%</span></div></div>
              <div class="kpi"><div class="kpi-label">${g('m_likes')}</div><div class="kpi-value tnum">${p.likes}</div></div>
              <div class="kpi"><div class="kpi-label">${g('m_comments')}</div><div class="kpi-value tnum">${p.comments}</div></div>
              <div class="kpi"><div class="kpi-label">${g('m_potential')}</div><div class="kpi-value tnum hl">${p.potential}<span class="unit">%</span></div></div>
              <div class="kpi"><div class="kpi-label">${g('m_revenue')}</div><div class="kpi-value tnum hl">${p.revenue}</div></div>
              <div class="kpi"><div class="kpi-label">${g('m_readiness')}</div><div class="kpi-value hl-gold">${p.readiness}</div></div>
            </div>
          </div>

          <div class="card rec-card">
            <div class="row between" style="margin-bottom:8px">
              <div class="eyebrow no-rule"><span>${g('r_rec_title')}</span></div>
              <span class="pill gold">${g('r_sim')}</span>
            </div>
            <div class="rec-step"><span class="n">1</span><div><b style="color:var(--cream)">${g('r_rec1_t')}</b><p class="muted" style="font-size:13.5px;margin-top:2px">${g('r_rec1_d')}</p></div></div>
            <div class="rec-step"><span class="n">2</span><div><b style="color:var(--cream)">${g('r_rec2_t')}</b><p class="muted" style="font-size:13.5px;margin-top:2px">${g('r_rec2_d')}</p></div></div>
            <div class="rec-step"><span class="n">3</span><div><b style="color:var(--cream)">${g('r_rec3_t')}</b><p class="muted" style="font-size:13.5px;margin-top:2px">${g('r_rec3_d')}</p></div></div>
          </div>
        </div>
      </div>

      <div class="res-grid" style="margin-top:18px">
        <div class="card">
          <div class="row between" style="margin-bottom:6px">
            <div class="eyebrow no-rule"><span>${g('r_rev_title')}</span></div>
            <span class="pill gold">${g('r_sim')}</span>
          </div>
          <p class="faint" style="font-size:12.5px;margin-bottom:18px">${g('r_rev_caption')}</p>
          <div class="bars" style="height:160px">
            ${(() => { const mx = Math.max(1, ...p.rev); return p.rev.map((v, i) => `<div class="bar ${i < 4 ? 'muted' : ''}" style="height:0%" data-bar="${Math.round(v / mx * 100)}"></div>`).join(''); })()}
          </div>
          <div class="row between" style="margin-top:10px;font-size:11.5px;color:var(--t-lo)" class="mono">
            ${p.rev.map((v, i) => `<span class="mono" style="flex:1;text-align:center">$${v}K</span>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="eyebrow gold no-rule" style="margin-bottom:6px"><span>${g('r_posts_title')}</span></div>
          <p class="faint" style="font-size:12.5px;margin-bottom:18px">${g('r_posts_caption')}</p>
          <div class="post-grid">
            ${(p.topPosts && p.topPosts.length
              ? p.topPosts.slice(0, 4).map((tp, i) => {
                  const thumb = tp.thumbnailUrl ? `style="background-image:url('${tp.thumbnailUrl}');background-size:cover;background-position:center"` : '';
                  const likes = tp.likes != null ? fmt(tp.likes) : '—';
                  return `<a class="post-th ${i === 0 ? 'top' : ''}" ${thumb} ${tp.permalink ? `href="${tp.permalink}" target="_blank" rel="noreferrer"` : ''}><span class="e">♥ ${likes}</span></a>`;
                }).join('')
              : `<div class="post-th"><span class="e faint">Aucun post</span></div>`)}
          </div>
          <div class="stack gap-12" style="margin-top:18px">
            <a href="dashboard.html" class="btn btn-primary btn-block">${g('r_cta_dash')}</a>
            <a href="loyalty.html" class="btn btn-line btn-block">${g('r_cta_build')}</a>
          </div>
        </div>
      </div>
    `;
    // animate fills
    requestAnimationFrame(() => {
      $('#bigArc').style.strokeDashoffset = off;
      stageResults.querySelectorAll('[data-fill]').forEach(s => s.style.width = s.getAttribute('data-fill') + '%');
      stageResults.querySelectorAll('[data-bar]').forEach(b => b.style.height = b.getAttribute('data-bar') + '%');
    });
    const again = $('#againBtn');
    if (again) again.addEventListener('click', () => {
      stageResults.classList.add('hide');
      stageLoad.classList.add('hide');
      stageInput.classList.remove('hide');
      renderInputStage();
      window.scrollTo({ top: 0 });
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ─── Boot ─── */
  // AuraIGConnect is injected asynchronously by product-shell.js. Re-render the
  // entry CTA until it's available so an existing connection is detected (no
  // false "not connected" flash).
  function bootInputStage(attempt) {
    renderInputStage();
    if (!window.AuraIGConnect && attempt < 12) setTimeout(() => bootInputStage(attempt + 1), 250);
  }
  bootInputStage(0);
  AuraI18n.onChange(() => { AuraI18n.apply(); });
  // Re-render the entry CTA when the user connects/disconnects elsewhere.
  window.addEventListener('aura:ig:connected', () => { stageResults.classList.add('hide'); stageLoad.classList.add('hide'); stageInput.classList.remove('hide'); renderInputStage(); });
  window.addEventListener('aura:ig:disconnected', () => { stageResults.classList.add('hide'); stageLoad.classList.add('hide'); stageInput.classList.remove('hide'); renderInputStage(); });
})();
