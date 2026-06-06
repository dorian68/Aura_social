/* AURA — dashboard copy (reference-matched) */
(function () {
  const page = {
    en: {
      d_title: "Dashboard", d_hello: "Welcome back",
      d_sub: "Here's what's happening with your community.",
      d_range: "Live snapshot", d_export: "Export",
      /* KPIs (union of both sets) */
      k1_l: "Superfan Score", k1_v: "—", k1_u: "/100", k1_tag: "",
      k2_l: "Token Readiness", k2_v: "—", k2_u: "/100", k2_tag: "",
      k3_l: "Est. Monthly Revenue", k3_v: "—", k3_d: "",
      k4_l: "Fan Pass Holders", k4_v: "—", k4_d: "",
      k5_l: "Reward Claims", k5_v: "—", k5_d: "",
      k6_l: "Community Growth", k6_v: "—", k6_d: "",
      d_vs: "vs last month",
      /* revenue */
      rev_t: "Revenue Potential", rev_sub: "Based on your community",
      rev_v: "—", rev_per: "/month", rev_sim: "Simulation",
      /* funnel */
      fn_t: "Superfan Funnel",
      fn_1: "Total Followers", fn_1v: "—",
      fn_2: "Engaged", fn_2v: "—",
      fn_3: "Active Fans", fn_3v: "—",
      fn_4: "Superfans", fn_4v: "—",
      /* top post */
      tp_t: "Top Performing Post", tp_all: "View all posts",
      /* checklist */
      cl_t: "Launch Checklist", cl_done: "completed",
      cl_1: "Define your fan pass", cl_2: "Create rewards", cl_3: "Design tiers", cl_4: "Prepare airdrop",
      cl_5: "Write launch script", cl_6: "Create landing page", cl_7: "Announce to audience", cl_8: "Launch & track",
      /* rewards */
      rw_t: "Rewards Performance", rw_sub: "Top claimed rewards", rw_all: "View all rewards", rw_claims: "claims",
      rw_1: "Backstage Access", rw_2: "Exclusive Content", rw_3: "Merch Discount", rw_4: "Private Discord",
      /* airdrop */
      ad_t: "Airdrop Simulator", ad_pool: "Total Airdrop Pool", ad_btn: "Simulate Airdrop",
      ad_1: "Superfans", ad_2: "Active Fans", ad_3: "Engaged Fans", ad_4: "Community",
      ad_running: "Distributing…", ad_done: "Airdrop simulated"
    },
    fr: {
      d_title: "Dashboard", d_hello: "Bon retour",
      d_sub: "Voici ce qui se passe dans votre communauté.",
      d_range: "Aperçu en direct", d_export: "Exporter",
      k1_l: "Superfan Score", k1_v: "—", k1_u: "/100", k1_tag: "",
      k2_l: "Maturité token", k2_v: "—", k2_u: "/100", k2_tag: "",
      k3_l: "Revenu mensuel est.", k3_v: "—", k3_d: "",
      k4_l: "Détenteurs de pass", k4_v: "—", k4_d: "",
      k5_l: "Récompenses réclamées", k5_v: "—", k5_d: "",
      k6_l: "Croissance communauté", k6_v: "—", k6_d: "",
      d_vs: "vs mois dernier",
      rev_t: "Revenu potentiel", rev_sub: "Basé sur votre communauté",
      rev_v: "—", rev_per: "/mois", rev_sim: "Simulation",
      fn_t: "Tunnel superfan",
      fn_1: "Followers totaux", fn_1v: "—",
      fn_2: "Engagés", fn_2v: "—",
      fn_3: "Fans actifs", fn_3v: "—",
      fn_4: "Superfans", fn_4v: "—",
      tp_t: "Post le plus performant", tp_all: "Voir tous les posts",
      cl_t: "Checklist de lancement", cl_done: "complétées",
      cl_1: "Définir votre fan pass", cl_2: "Créer les récompenses", cl_3: "Concevoir les paliers", cl_4: "Préparer l'airdrop",
      cl_5: "Écrire le script de lancement", cl_6: "Créer la landing page", cl_7: "Annoncer à l'audience", cl_8: "Lancer & suivre",
      rw_t: "Performance des récompenses", rw_sub: "Récompenses les plus réclamées", rw_all: "Voir toutes les récompenses", rw_claims: "réclamations",
      rw_1: "Accès backstage", rw_2: "Contenu exclusif", rw_3: "Réduction merch", rw_4: "Discord privé",
      ad_t: "Simulateur d'airdrop", ad_pool: "Pool d'airdrop total", ad_btn: "Simuler l'airdrop",
      ad_1: "Superfans", ad_2: "Fans actifs", ad_3: "Fans engagés", ad_4: "Communauté",
      ad_running: "Distribution…", ad_done: "Airdrop simulé"
    }
  };
  AuraI18n.init({
    en: Object.assign({}, AURA_PRODUCT_COPY.en, page.en),
    fr: Object.assign({}, AURA_PRODUCT_COPY.fr, page.fr)
  });
})();
