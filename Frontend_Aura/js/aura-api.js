/* AURA — shared API base URL
   Détecte automatiquement si le backend Next.js tourne sur 3000 ou 3170.
   Override : définir window.AURA_API_BASE avant de charger ce script. */
(function () {
  if (!window.AURA_API_BASE) {
    // On essaie 3000 en premier (Next.js default), sinon 3170
    window.AURA_API_BASE = 'http://localhost:3000';
  }

  /* Origine PUBLIQUE pour l'OAuth Instagram (doit matcher le redirect_uri
     enregistré côté Meta). La popup OAuth s'ouvre ici, pas sur l'API locale.
     Priorité : window.AURA_OAUTH_BASE déjà défini > override localStorage
     ('aura_oauth_base') > tunnel actif ci-dessous.
     ⚠️ URL ngrok ci-dessous = tunnel courant (éphémère). Pour la remplacer sans
     ré-éditer ce fichier : localStorage.setItem('aura_oauth_base', 'https://...'). */
  if (!window.AURA_OAUTH_BASE) {
    var override = null;
    try { override = localStorage.getItem('aura_oauth_base'); } catch (e) {}
    window.AURA_OAUTH_BASE = override || 'https://overreach-pagan-sliceable.ngrok-free.dev';
  }
})();
