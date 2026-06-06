/* AURA — launch script generator copy */
(function () {
  const page = {
    en: {
      g_title: "Launch scripts", g_head: "Generate your launch script",
      g_sub: "Tell AURA what you're launching. It writes the captions, DMs and story scripts to activate your superfans — in your voice.",
      g_what: "What are you launching?", g_offer1: "Fan Pass", g_offer2: "Paid community", g_offer3: "Exclusive drop", g_offer4: "VIP event",
      g_platform: "Channel", g_pl1: "Instagram post", g_pl2: "Story sequence", g_pl3: "Broadcast / DM", g_pl4: "Email",
      g_tone: "Tone", g_tn1: "Warm & personal", g_tn2: "Hype & bold", g_tn3: "Calm & premium",
      g_goal: "Primary goal", g_gl1: "Drive sign-ups", g_gl2: "Create urgency", g_gl3: "Build anticipation",
      g_name: "Offer name", g_name_ph: "e.g. Founders Pass",
      g_price: "Price", g_audience: "Your handle",
      g_generate: "Generate script", g_generating: "Writing in your voice…", g_regenerate: "Regenerate",
      g_output: "Your launch script", g_copy: "Copy", g_copied: "Copied",
      g_empty: "Set your launch details and generate a script tailored to your community.",
      g_variants: "Variations", g_hook: "Hook", g_body: "Body", g_cta: "Call to action",
      g_tip: "AURA writes from engagement patterns in your audience. Always review before posting.",
      g_count: "characters"
    },
    fr: {
      g_title: "Scripts de lancement", g_head: "Générez votre script de lancement",
      g_sub: "Dites à AURA ce que vous lancez. Elle rédige les légendes, DM et scripts de story pour activer vos superfans — dans votre voix.",
      g_what: "Que lancez-vous ?", g_offer1: "Fan Pass", g_offer2: "Communauté payante", g_offer3: "Drop exclusif", g_offer4: "Événement VIP",
      g_platform: "Canal", g_pl1: "Post Instagram", g_pl2: "Séquence de stories", g_pl3: "Broadcast / DM", g_pl4: "Email",
      g_tone: "Ton", g_tn1: "Chaleureux & perso", g_tn2: "Hype & audacieux", g_tn3: "Calme & premium",
      g_goal: "Objectif principal", g_gl1: "Générer des inscriptions", g_gl2: "Créer l'urgence", g_gl3: "Créer l'anticipation",
      g_name: "Nom de l'offre", g_name_ph: "ex. Founders Pass",
      g_price: "Prix", g_audience: "Votre pseudo",
      g_generate: "Générer le script", g_generating: "Rédaction dans votre voix…", g_regenerate: "Régénérer",
      g_output: "Votre script de lancement", g_copy: "Copier", g_copied: "Copié",
      g_empty: "Renseignez les détails de votre lancement et générez un script adapté à votre communauté.",
      g_variants: "Variations", g_hook: "Accroche", g_body: "Corps", g_cta: "Appel à l'action",
      g_tip: "AURA écrit à partir des schémas d'engagement de votre audience. Relisez toujours avant de publier.",
      g_count: "caractères"
    }
  };
  AuraI18n.init({
    en: Object.assign({}, AURA_PRODUCT_COPY.en, page.en),
    fr: Object.assign({}, AURA_PRODUCT_COPY.fr, page.fr)
  });
})();
