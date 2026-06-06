/* AURA — loyalty builder copy */
(function () {
  const page = {
    en: {
      l_title: "Loyalty builder", l_head: "Design your loyalty program",
      l_sub: "Configure tiers, perks and unlock conditions. Your fans see passes and status — the token layer runs underneath.",
      l_tiers: "Tiers", l_add_tier: "Add tier",
      l_price: "Price", l_per_mo: "/mo", l_supply: "Supply", l_unlimited: "Unlimited",
      l_perks: "Perks included", l_add_perk: "Add perk", l_unlock: "Unlock condition",
      l_preview: "Fan preview", l_preview_sub: "What your community sees",
      l_join: "Join", l_current: "Your tier", l_locked: "Locked",
      l_projected: "Projected monthly revenue", l_sim: "Simulation",
      l_members: "members", l_save: "Save program", l_saved: "Program saved",
      l_cond_follow: "Follows you", l_cond_eng: "High engagement", l_cond_pay: "Paid pass",
      /* default tiers */
      t1_name: "Insider", t1_perk1: "Exclusive posts", t1_perk2: "Community chat", t1_perk3: "Early content",
      t2_name: "VIP", t2_perk1: "Everything in Insider", t2_perk2: "Monthly live call", t2_perk3: "VIP badge", t2_perk4: "Private drops",
      t3_name: "Founder", t3_perk1: "Everything in VIP", t3_perk2: "1:1 access", t3_perk3: "Name in credits", t3_perk4: "Limited collectible",
      perk_pool: "Backstage access|Merch discount|Event priority|Behind the scenes|Shoutout|Vote on content|Archive access|Superfan airdrop"
    },
    fr: {
      l_title: "Builder fidélité", l_head: "Concevez votre programme de fidélité",
      l_sub: "Configurez paliers, avantages et conditions. Vos fans voient des passes et un statut — la couche token tourne en dessous.",
      l_tiers: "Paliers", l_add_tier: "Ajouter un palier",
      l_price: "Prix", l_per_mo: "/mois", l_supply: "Quantité", l_unlimited: "Illimité",
      l_perks: "Avantages inclus", l_add_perk: "Ajouter un avantage", l_unlock: "Condition d'accès",
      l_preview: "Aperçu fan", l_preview_sub: "Ce que voit votre communauté",
      l_join: "Rejoindre", l_current: "Votre palier", l_locked: "Verrouillé",
      l_projected: "Revenu mensuel projeté", l_sim: "Simulation",
      l_members: "membres", l_save: "Enregistrer le programme", l_saved: "Programme enregistré",
      l_cond_follow: "Vous suit", l_cond_eng: "Fort engagement", l_cond_pay: "Pass payant",
      t1_name: "Insider", t1_perk1: "Posts exclusifs", t1_perk2: "Chat communautaire", t1_perk3: "Contenu en avant-première",
      t2_name: "VIP", t2_perk1: "Tout dans Insider", t2_perk2: "Live mensuel", t2_perk3: "Badge VIP", t2_perk4: "Drops privés",
      t3_name: "Founder", t3_perk1: "Tout dans VIP", t3_perk2: "Accès 1:1", t3_perk3: "Nom au générique", t3_perk4: "Collectible limité",
      perk_pool: "Accès backstage|Réduction merch|Priorité événements|Coulisses|Shoutout|Vote sur le contenu|Accès archives|Airdrop superfan"
    }
  };
  AuraI18n.init({
    en: Object.assign({}, AURA_PRODUCT_COPY.en, page.en),
    fr: Object.assign({}, AURA_PRODUCT_COPY.fr, page.fr)
  });
})();
