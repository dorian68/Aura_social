/* AURA - shared runtime endpoints.
   Override with window.AURA_API_BASE / window.AURA_OAUTH_BASE before loading,
   or localStorage keys aura_api_base / aura_oauth_base. */
(function () {
  if (!window.AURA_API_BASE) {
    var apiOverride = null;
    try {
      apiOverride = localStorage.getItem('aura_api_base');
      // Evict stale localhost:3000 entries — server moved to :3009.
      if (apiOverride && apiOverride.includes('localhost:3000')) {
        localStorage.removeItem('aura_api_base');
        apiOverride = null;
      }
    } catch (e) {}
    window.AURA_API_BASE = apiOverride || (window.location.hostname === 'localhost'
      ? 'http://localhost:3009'
      : window.location.origin);
  }

  if (!window.AURA_OAUTH_BASE) {
    var override = null;
    try { override = localStorage.getItem('aura_oauth_base'); } catch (e) {}
    window.AURA_OAUTH_BASE = override || window.AURA_API_BASE;
  }
})();
