/* AURA — Workspace copy */
(function () {
  const page = {
    en: {
      ws_title: "Workspace", ws_head: "Platform health & integrations",
      ws_sub: "Real-time status of all Aura platform integrations, connected accounts and recent activity.",
      ws_refresh: "Refresh", ws_refreshing: "Checking…",
      ws_score: "Health score", ws_integrations: "Integrations",
      ws_connected: "Connected accounts", ws_issues: "Issues",
      ws_int_t: "Integration readiness", ws_accounts_t: "Connected accounts",
      ws_audit_t: "Audit trail", ws_no_audit: "No recent events.",
      ws_status_ready: "Ready", ws_status_mock: "Mock ready",
      ws_status_missing: "Missing config", ws_status_error: "Error",
      ws_status_disabled: "Disabled", ws_mode_real: "Real",
      ws_mode_mock: "Mock", ws_mode_sim: "Simulation", ws_mode_local: "Local",
      ws_mode_future: "Future", ws_sim: "Live data",
      ws_empty_accounts: "No accounts connected yet.",
      ws_plan: "Plan", ws_status_active: "Active"
    },
    fr: {
      ws_title: "Espace de travail", ws_head: "Santé de la plateforme & intégrations",
      ws_sub: "Statut en temps réel de toutes les intégrations Aura, comptes connectés et activité récente.",
      ws_refresh: "Actualiser", ws_refreshing: "Vérification…",
      ws_score: "Score de santé", ws_integrations: "Intégrations",
      ws_connected: "Comptes connectés", ws_issues: "Problèmes",
      ws_int_t: "Maturité des intégrations", ws_accounts_t: "Comptes connectés",
      ws_audit_t: "Journal d'activité", ws_no_audit: "Aucun événement récent.",
      ws_status_ready: "Prêt", ws_status_mock: "Mock prêt",
      ws_status_missing: "Config manquante", ws_status_error: "Erreur",
      ws_status_disabled: "Désactivé", ws_mode_real: "Réel",
      ws_mode_mock: "Mock", ws_mode_sim: "Simulation", ws_mode_local: "Local",
      ws_mode_future: "Futur", ws_sim: "Données live",
      ws_empty_accounts: "Aucun compte connecté.",
      ws_plan: "Plan", ws_status_active: "Actif"
    }
  };
  AuraI18n.init({
    en: Object.assign({}, AURA_PRODUCT_COPY.en, page.en),
    fr: Object.assign({}, AURA_PRODUCT_COPY.fr, page.fr)
  });
})();
