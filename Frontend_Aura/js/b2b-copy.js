/* AURA — B2B Growth Engine copy */
(function () {
  const page = {
    en: {
      b2b_title: "B2B Growth Engine",
      b2b_head: "Partner with local businesses",
      b2b_sub: "Discover high-fit local brands and generate ready-to-send partnership campaigns — commission-based, fan-rewarded.",
      b2b_location: "Location", b2b_category: "Category", b2b_budget: "Campaign budget",
      b2b_run: "Run Agent", b2b_running: "Scanning…",
      b2b_loc1: "Fort-de-France", b2b_loc2: "Pointe-à-Pitre", b2b_loc3: "Basse-Terre",
      b2b_loc4: "Paris", b2b_loc5: "Lyon", b2b_loc6: "Bordeaux",
      b2b_cat1: "Restaurants", b2b_cat2: "Beauty", b2b_cat3: "Fashion",
      b2b_cat4: "Fitness", b2b_cat5: "Hotels", b2b_cat6: "Events",
      b2b_kpi1: "Businesses found", b2b_kpi2: "Opportunities", b2b_kpi3: "Aura commission",
      b2b_kpi4: "Fan reward budget",
      b2b_opp_t: "Best opportunity", b2b_biz_t: "Discovered businesses",
      b2b_pitch_t: "Outreach pitch draft", b2b_pitch_approval: "Approval required before sending",
      b2b_fit: "Fit score", b2b_cat_label: "Category", b2b_rating: "Rating",
      b2b_budget_total: "Campaign budget", b2b_commission: "Aura commission (30%)", b2b_fan_budget: "Fan reward budget (70%)",
      b2b_empty: "Configure a location and category, then run the agent.",
      b2b_source: "Mock Google Places", b2b_sim: "Simulation",
      b2b_copy_pitch: "Copy pitch", b2b_copied: "Copied!"
    },
    fr: {
      b2b_title: "Moteur de croissance B2B",
      b2b_head: "Partenariats avec les commerces locaux",
      b2b_sub: "Découvrez les marques locales les plus pertinentes et générez des campagnes partenaires prêtes à envoyer — basées sur commission, avec récompenses fans.",
      b2b_location: "Localisation", b2b_category: "Catégorie", b2b_budget: "Budget de campagne",
      b2b_run: "Lancer l'agent", b2b_running: "Analyse…",
      b2b_loc1: "Fort-de-France", b2b_loc2: "Pointe-à-Pitre", b2b_loc3: "Basse-Terre",
      b2b_loc4: "Paris", b2b_loc5: "Lyon", b2b_loc6: "Bordeaux",
      b2b_cat1: "Restaurants", b2b_cat2: "Beauté", b2b_cat3: "Mode",
      b2b_cat4: "Sport & fitness", b2b_cat5: "Hôtels", b2b_cat6: "Événements",
      b2b_kpi1: "Commerces détectés", b2b_kpi2: "Opportunités", b2b_kpi3: "Commission Aura",
      b2b_kpi4: "Budget récompenses fans",
      b2b_opp_t: "Meilleure opportunité", b2b_biz_t: "Commerces découverts",
      b2b_pitch_t: "Proposition de partenariat", b2b_pitch_approval: "Approbation requise avant envoi",
      b2b_fit: "Score de compatibilité", b2b_cat_label: "Catégorie", b2b_rating: "Note",
      b2b_budget_total: "Budget campagne", b2b_commission: "Commission Aura (30%)", b2b_fan_budget: "Budget récompenses fans (70%)",
      b2b_empty: "Configurez un lieu et une catégorie, puis lancez l'agent.",
      b2b_source: "Mock Google Places", b2b_sim: "Simulation",
      b2b_copy_pitch: "Copier la proposition", b2b_copied: "Copié !"
    }
  };
  AuraI18n.init({
    en: Object.assign({}, AURA_PRODUCT_COPY.en, page.en),
    fr: Object.assign({}, AURA_PRODUCT_COPY.fr, page.fr)
  });
})();
