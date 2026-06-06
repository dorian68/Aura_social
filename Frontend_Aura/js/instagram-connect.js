/* ============================================================
   AURA — Instagram Connect Widget
   2-click OAuth : open popup → approve → done.
   Stores { connectionId, igUserId, username, followersCount }
   in localStorage under 'aura_ig_connection'.
   Fires window custom event 'aura:ig:connected' on success.
   ============================================================ */
(function () {
  const API      = window.AURA_API_BASE || 'http://localhost:3000';
  const STORE_KEY = 'aura_ig_connection';
  const TTL_MS    = 30 * 24 * 60 * 60 * 1000; // 30 days — aligned with server META_CONNECTION_TTL_HOURS (default 720h)

  // OAuth must run on the PUBLIC origin registered with Meta (the tunnel host),
  // not on the local API origin — otherwise Instagram's redirect_uri won't match.
  // Resolution order: explicit window.AURA_OAUTH_BASE → /api/meta/config frontendUrl
  // (only works same-origin or with CORS) → the API origin. The popup itself is a
  // top-level navigation + postMessage, so it needs no CORS regardless.
  let OAUTH_BASE = API;
  if (window.AURA_OAUTH_BASE) {
    try { OAUTH_BASE = new URL(window.AURA_OAUTH_BASE).origin; } catch {}
  }
  function loadOAuthBase() {
    if (window.AURA_OAUTH_BASE) return Promise.resolve(); // explicit override wins
    return fetch(API + '/api/meta/config')
      .then((r) => r.json())
      .then((j) => {
        const fu = j && j.data && j.data.frontendUrl;
        if (fu) { try { OAUTH_BASE = new URL(fu).origin; } catch {} }
      })
      .catch(() => {});
  }
  function oauthOrigin() {
    try { return new URL(OAUTH_BASE).origin; } catch { return null; }
  }

  /* ── Stored connection helpers ─────────────────────────── */
  function saveConnection(data) {
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  }
  function loadConnection() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw);
      if (Date.now() - (c.savedAt || 0) > TTL_MS) { localStorage.removeItem(STORE_KEY); return null; }
      return c;
    } catch { return null; }
  }
  function clearConnection() {
    localStorage.removeItem(STORE_KEY);
  }

  /* ── OAuth popup ───────────────────────────────────────── */
  let activePopup = null;
  let popupWatch  = null;

  function openOAuthPopup() {
    const w = 520, h = 660;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
    // Pass our own origin so the popup (served from API) can postMessage back to us
    // even when this page is served from a different origin than the API.
    const startUrl = OAUTH_BASE + '/api/auth/meta/start?mode=private&origin=' + encodeURIComponent(window.location.origin);
    const popup = window.open(
      startUrl,
      'aura_ig_oauth',
      `width=${w},height=${h},left=${left},top=${top},toolbar=0,scrollbars=1,status=0`
    );
    if (!popup) {
      setError('Pop-up blocked — please allow pop-ups for this site and try again.');
      setLoading(false);
      return null;
    }
    activePopup = popup;
    // If the user closes the popup before completing, reset the button.
    if (popupWatch) clearInterval(popupWatch);
    popupWatch = setInterval(() => {
      if (popup.closed) {
        clearInterval(popupWatch);
        popupWatch = null;
        activePopup = null;
        setLoading(false);
      }
    }, 600);
    return popup;
  }

  function closePopup() {
    if (popupWatch) { clearInterval(popupWatch); popupWatch = null; }
    if (activePopup && !activePopup.closed) { try { activePopup.close(); } catch {} }
    activePopup = null;
  }

  /* ── postMessage listener (set up once) ───────────────── */
  let listenerActive = false;
  function ensureListener() {
    if (listenerActive) return;
    listenerActive = true;
    window.addEventListener('message', (e) => {
      // The message comes from the OAuth popup, served from the public OAuth origin
      // (the tunnel host) or, in pure-local setups, the API origin.
      const allowed = [oauthOrigin(), (function () { try { return new URL(API).origin; } catch { return null; } })()];
      if (!allowed.includes(e.origin)) return;
      if (!e.data || typeof e.data !== 'object') return;

      if (e.data.type === 'META_AUTH_ERROR') {
        closePopup();
        setLoading(false);
        const err = e.data.error || {};
        setError(err.message || 'Instagram Login failed.', err.code);
        window.dispatchEvent(new CustomEvent('aura:ig:error', { detail: err }));
        return;
      }

      if (e.data.type !== 'META_AUTH_SUCCESS') return;
      const conn = e.data.data;
      if (!conn || !conn.connectionId || !conn.accounts?.length) {
        closePopup();
        setLoading(false);
        setError('Instagram Login returned no usable account.');
        return;
      }
      const account = conn.accounts[0];
      const stored = {
        connectionId:     conn.connectionId,
        igUserId:         account.igUserId,
        username:         account.username,
        name:             account.name,
        followersCount:   account.followersCount,
        profilePictureUrl: account.profilePictureUrl,
        authProvider:     account.authProvider,
      };
      closePopup();
      clearError();
      saveConnection(stored);
      window.dispatchEvent(new CustomEvent('aura:ig:connected', { detail: stored }));
      renderConnectWidget();
    });
  }

  /* ── Widget HTML ───────────────────────────────────────── */
  const STYLE = `
    #aura-ig-widget { font-family:'Inter',system-ui,sans-serif; }
    .aig-btn {
      display:inline-flex; align-items:center; gap:9px; height:40px; padding:0 18px;
      border-radius:999px; font-size:13.5px; font-weight:700; cursor:pointer;
      transition:all .2s; white-space:nowrap; border:none;
    }
    .aig-btn-connect {
      background:linear-gradient(135deg,#B8FF4D,#8FCC3D);
      color:#0A1206; box-shadow:0 0 20px -4px rgba(184,255,77,.5);
    }
    .aig-btn-connect:hover { transform:translateY(-1px); box-shadow:0 0 28px -4px rgba(184,255,77,.7); }
    .aig-btn-connect svg { width:16px;height:16px; }
    .aig-chip {
      display:inline-flex; align-items:center; gap:8px; height:40px; padding:0 14px 0 10px;
      border-radius:999px; background:rgba(184,255,77,.08);
      border:1px solid rgba(184,255,77,.28); color:var(--lime,#B8FF4D);
      font-size:13px; font-weight:600;
    }
    .aig-avatar {
      width:26px;height:26px;border-radius:50%;
      background:linear-gradient(135deg,#12382b,#1c5040);
      border:1.5px solid rgba(184,255,77,.3);
      display:grid;place-items:center;font-size:12px;color:#B8FF4D;font-weight:700;
      overflow:hidden; flex:none;
    }
    .aig-avatar img { width:100%;height:100%;object-fit:cover; }
    .aig-disconnect {
      margin-left:6px; width:18px;height:18px; border-radius:50%;
      background:rgba(255,255,255,.1); display:grid;place-items:center;
      cursor:pointer; transition:background .2s; flex:none;
    }
    .aig-disconnect:hover { background:rgba(224,122,77,.3); }
    .aig-disconnect svg { width:10px;height:10px; color:rgba(255,247,232,.6); }
    .aig-loading { opacity:.5; pointer-events:none; }
    .aig-error {
      margin-top:6px; max-width:280px; font-size:11.5px; line-height:1.4;
      color:#ffb9a3; background:rgba(224,122,77,.12);
      border:1px solid rgba(224,122,77,.3); border-radius:8px; padding:6px 9px;
    }
    .aig-error b { color:#ffd6c6; font-weight:700; }
  `;

  /* ── UI state helpers ──────────────────────────────────── */
  let currentError = null; // { message, code }
  let loading = false;

  function setLoading(on) {
    loading = on;
    const btn = document.querySelector('#aura-ig-widget #aig-connect-btn');
    if (btn) btn.classList.toggle('aig-loading', on);
  }
  function setError(message, code) {
    currentError = { message, code: code || null };
    renderConnectWidget();
  }
  function clearError() {
    if (!currentError) return;
    currentError = null;
    renderConnectWidget();
  }
  function errorHtml() {
    if (!currentError) return '';
    const code = currentError.code ? `<b>${currentError.code}</b> · ` : '';
    return `<div class="aig-error">${code}${currentError.message}</div>`;
  }

  function renderConnectWidget() {
    const host = document.getElementById('aura-ig-widget');
    if (!host) return;
    const conn = loadConnection();

    if (!conn) {
      host.innerHTML = `
        <style>${STYLE}</style>
        <button class="aig-btn aig-btn-connect${loading ? ' aig-loading' : ''}" id="aig-connect-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="2" y="2" width="20" height="20" rx="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/>
          </svg>
          Connect Instagram
        </button>
        ${errorHtml()}`;
      host.querySelector('#aig-connect-btn').addEventListener('click', () => {
        ensureListener();
        clearError();
        setLoading(true);
        openOAuthPopup();
      });
    } else {
      const initial = (conn.username || conn.name || 'I')[0].toUpperCase();
      host.innerHTML = `
        <style>${STYLE}</style>
        <div class="aig-chip">
          <div class="aig-avatar">
            ${conn.profilePictureUrl
              ? `<img src="${conn.profilePictureUrl}" alt="">`
              : initial}
          </div>
          <span>@${conn.username || conn.name}${conn.followersCount ? ' · ' + formatFollowers(conn.followersCount) : ''}</span>
          <div class="aig-disconnect" id="aig-disconnect" title="Disconnect">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
        </div>`;
      host.querySelector('#aig-disconnect').addEventListener('click', () => {
        clearConnection();
        window.dispatchEvent(new CustomEvent('aura:ig:disconnected'));
        renderConnectWidget();
      });
    }
  }

  function formatFollowers(n) {
    if (!n) return '';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }

  /* ── Public API ────────────────────────────────────────── */
  window.AuraIGConnect = {
    getConnection: loadConnection,
    clear:         clearConnection,
    render:        renderConnectWidget,
    formatFollowers,
  };

  /* ── Auto-init when DOM ready ──────────────────────────── */
  function init() {
    loadOAuthBase(); // resolve the public OAuth origin before the user clicks
    ensureListener();
    renderConnectWidget();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
