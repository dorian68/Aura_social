/* ============================================================
   AURA — product app shared chrome + copy
   ============================================================ */

/* ---- product copy ---- */
const AURA_PRODUCT_COPY = {
  en: {
    s_workspace: "Workspace", s_grow: "Grow", s_settings: "Settings",
    nav_analyzer: "Analyzer", nav_dashboard: "Dashboard", nav_loyalty: "Loyalty builder",
    nav_fanpass: "Fan Pass studio", nav_token: "Token Economy",
    nav_b2b: "B2B Agent", nav_script: "Launch scripts",
    nav_workspace: "Platform health", nav_components: "Components",
    nav_audience: "Audience", nav_campaigns: "Campaigns", nav_billing: "Billing",
    creator_plan: "Creator Pro", upgrade: "Upgrade",
    sim_banner: "Simulation environment — numbers are projections, the token layer is not live.",
    back_home: "Back to site"
  },
  fr: {
    s_workspace: "Espace", s_grow: "Développer", s_settings: "Réglages",
    nav_analyzer: "Analyseur", nav_dashboard: "Dashboard", nav_loyalty: "Builder fidélité",
    nav_fanpass: "Studio Fan Pass", nav_token: "Économie token",
    nav_b2b: "Agent B2B", nav_script: "Scripts de lancement",
    nav_workspace: "Santé plateforme", nav_components: "Composants",
    nav_audience: "Audience", nav_campaigns: "Campagnes", nav_billing: "Facturation",
    creator_plan: "Creator Pro", upgrade: "Upgrade",
    sim_banner: "Environnement de simulation — les chiffres sont des projections, la couche token n'est pas active.",
    back_home: "Retour au site"
  }
};

const AURA_ICONS = {
  analyzer: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  loyalty: '<path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z"/>',
  fanpass: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>',
  token: '<circle cx="12" cy="12" r="9"/><path d="M9 9h1v6H9M12 9v6M15 9h-3v3h3v3h-3"/>',
  b2b: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/>',
  script: '<path d="M4 4h12l4 4v12H4z"/><path d="M16 4v4h4M8 13h8M8 17h6"/>',
  workspace: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  components: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><circle cx="17" cy="17" r="4"/>',
  audience: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-4 3.5-6 7-6s7 2 7 6"/><path d="M17 11a3.5 3.5 0 100-7"/>',
  campaigns: '<path d="M3 11l18-7v16L3 13z"/><path d="M3 11v4M8 19a2 2 0 01-4 0"/>',
  billing: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'
};

function auraSidebar(active) {
  const c = (k) => (window.AuraI18n ? AuraI18n.get(k) : k);
  const link = (href, icon, key) =>
    `<a href="${href}" class="side-link ${active === key ? 'active' : ''}">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round">${AURA_ICONS[icon]}</svg>
       <span data-t="nav_${key}">${c('nav_' + key)}</span>
     </a>`;
  return `
  <aside class="sidebar">
    <a class="logo-lockup" href="../index.html" style="padding:8px 13px 14px;">
      <img src="../assets/aura-logo.png" width="28" height="28" alt="AURA">
      
    </a>
    <div class="side-section" data-t="s_workspace">${c('s_workspace')}</div>
    ${link('analyzer.html','analyzer','analyzer')}
    ${link('dashboard.html','dashboard','dashboard')}
    ${link('loyalty.html','loyalty','loyalty')}
    ${link('fanpass.html','fanpass','fanpass')}
    ${link('token-economy.html','token','token')}
    <div class="side-section" data-t="s_grow">${c('s_grow')}</div>
    ${link('b2b.html','b2b','b2b')}
    ${link('script.html','script','script')}
    ${link('workspace.html','workspace','workspace')}
    ${link('components.html','components','components')}
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px;padding:10px 8px 4px">
      <!-- Plan/credits card removed: showed a fabricated "Creator Pro" plan and
           "3,1K / 5K credits" with no billing backend. Re-add when wired to real account data. -->
      <div class="lang-toggle" style="align-self:stretch;justify-content:center;display:flex;padding:3px;gap:2px;background:var(--ink-700);border:1px solid var(--line);border-radius:var(--r-pill)">
        <button data-lang-btn="en" style="flex:1;height:28px;border-radius:var(--r-pill);font-size:12px;font-weight:700;color:var(--t-lo);font-family:var(--mono)">EN</button>
        <button data-lang-btn="fr" style="flex:1;height:28px;border-radius:var(--r-pill);font-size:12px;font-weight:700;color:var(--t-lo);font-family:var(--mono)">FR</button>
      </div>
      <a href="../index.html" class="side-link" style="font-size:13px;color:var(--t-lo)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        <span data-t="back_home">${c('back_home')}</span>
      </a>
    </div>
  </aside>`;
}

function auraMountShell(active) {
  const host = document.getElementById('shell');
  host.insertAdjacentHTML('afterbegin', auraSidebar(active));

  // Inject Aura Operator widget after DOM is ready
  function mountOperator() {
    if (document.getElementById('aura-op-root')) return;
    const s = document.createElement('script');
    s.src = '../js/operator-widget.js';
    document.body.appendChild(s);
  }
  // Inject Instagram connect widget
  function mountIGConnect() {
    if (window.AuraIGConnect) return;
    const s = document.createElement('script');
    s.src = '../js/instagram-connect.js';
    document.body.appendChild(s);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { mountOperator(); mountIGConnect(); });
  } else {
    mountOperator();
    mountIGConnect();
  }
}
