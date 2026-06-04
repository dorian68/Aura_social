/* AURA — shared API base URL
   Détecte automatiquement si le backend Next.js tourne sur 3000 ou 3170.
   Override : définir window.AURA_API_BASE avant de charger ce script. */
(function () {
  if (window.AURA_API_BASE) return; // déjà défini manuellement
  // On essaie 3000 en premier (Next.js default), sinon 3170
  window.AURA_API_BASE = 'http://localhost:3000';
})();
