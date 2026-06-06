/* AURA — analyzer copy (EN/FR), merged with product shell copy */
(function () {
  const page = {
    en: {
      a_eyebrow: "Free audit · No password",
      a_title: "Reveal a creator's Superfan Score.",
      a_sub: "Enter any public Instagram handle. AURA turns public posts, likes and comments into business signals in seconds.",
      a_ph: "your.username", a_btn: "Analyze",
      a_note: "Public data only · We never ask for your password.",
      a_load_title: "Reading the community…",
      a_step1: "Fetching public profile",
      a_step2: "Analyzing recent posts & reels",
      a_step3: "Measuring engagement quality",
      a_step4: "Detecting superfan signals",
      a_step5: "Modeling monetization potential",
      a_step6: "Building your launch path",
      /* results */
      r_followers: "Followers", r_posts: "Posts", r_following: "Following",
      r_score_label: "Superfan Score", r_score_caption: "Strong — your community is primed to be activated.",
      r_breakdown: "Score breakdown",
      r_b1: "Engagement quality", r_b2: "Comment depth", r_b3: "Save & share rate",
      r_b4: "Posting consistency", r_b5: "Audience loyalty",
      r_metrics: "Key metrics",
      m_eng: "Engagement rate", m_likes: "Avg. likes", m_comments: "Avg. comments",
      m_potential: "Superfan potential", m_readiness: "Token readiness", m_revenue: "Est. monthly revenue",
      r_rec_title: "Your recommended launch path",
      r_rec1_t: "Launch a Fan Pass at $19", r_rec1_d: "Offer your top 4% exclusive access, drops and a VIP badge.",
      r_rec2_t: "Open a paid community", r_rec2_d: "A $9/mo private space — recurring revenue from your true fans.",
      r_rec3_t: "Run a superfan airdrop", r_rec3_d: "Reward early supporters to spark word-of-mouth and status.",
      r_rev_title: "Revenue projection (30 days)",
      r_rev_caption: "Illustrative projection based on engaged-audience benchmarks.",
      r_posts_title: "Top performing content",
      r_posts_caption: "Your superfans engage most with these formats.",
      r_cta_dash: "Open creator dashboard", r_cta_build: "Build my loyalty program",
      r_again: "Analyze another account",
      r_sim: "Simulation"
    },
    fr: {
      a_eyebrow: "Audit gratuit · Sans mot de passe",
      a_title: "Révélez le Superfan Score d'un créateur.",
      a_sub: "Saisissez n'importe quel compte Instagram public. AURA transforme posts, likes et commentaires publics en signaux business en quelques secondes.",
      a_ph: "votre.pseudo", a_btn: "Analyser",
      a_note: "Données publiques uniquement · Nous ne demandons jamais votre mot de passe.",
      a_load_title: "Lecture de la communauté…",
      a_step1: "Récupération du profil public",
      a_step2: "Analyse des posts & reels récents",
      a_step3: "Mesure de la qualité d'engagement",
      a_step4: "Détection des signaux superfan",
      a_step5: "Modélisation du potentiel de monétisation",
      a_step6: "Construction de votre parcours de lancement",
      r_followers: "Abonnés", r_posts: "Posts", r_following: "Abonnements",
      r_score_label: "Superfan Score", r_score_caption: "Solide — votre communauté est prête à être activée.",
      r_breakdown: "Détail du score",
      r_b1: "Qualité d'engagement", r_b2: "Profondeur des commentaires", r_b3: "Taux d'enregistrement & partage",
      r_b4: "Régularité de publication", r_b5: "Fidélité de l'audience",
      r_metrics: "Métriques clés",
      m_eng: "Taux d'engagement", m_likes: "Likes moy.", m_comments: "Commentaires moy.",
      m_potential: "Potentiel superfan", m_readiness: "Maturité token", m_revenue: "Revenu mensuel est.",
      r_rec_title: "Votre parcours de lancement recommandé",
      r_rec1_t: "Lancez un Fan Pass à 19 $", r_rec1_d: "Offrez à vos 4 % les plus actifs un accès exclusif, des drops et un badge VIP.",
      r_rec2_t: "Ouvrez une communauté payante", r_rec2_d: "Un espace privé à 9 $/mois — un revenu récurrent de vos vrais fans.",
      r_rec3_t: "Lancez un airdrop superfan", r_rec3_d: "Récompensez vos premiers soutiens pour déclencher le bouche-à-oreille et le statut.",
      r_rev_title: "Projection de revenus (30 jours)",
      r_rev_caption: "Projection illustrative basée sur des benchmarks d'audiences engagées.",
      r_posts_title: "Contenu le plus performant",
      r_posts_caption: "Vos superfans s'engagent le plus avec ces formats.",
      r_cta_dash: "Ouvrir le dashboard créateur", r_cta_build: "Construire mon programme de fidélité",
      r_again: "Analyser un autre compte",
      r_sim: "Simulation"
    }
  };
  const merged = {
    en: Object.assign({}, AURA_PRODUCT_COPY.en, page.en),
    fr: Object.assign({}, AURA_PRODUCT_COPY.fr, page.fr)
  };
  AuraI18n.init(merged);
})();
