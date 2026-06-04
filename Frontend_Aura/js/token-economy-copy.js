/* AURA — Token Economy copy */
(function () {
  const page = {
    en: {
      te_title: "Token Economy", te_head: "Design your token economy",
      te_sub: "Model your points supply, pool allocations and launch airdrop — entirely off-chain for now. The token layer activates when your community is ready.",
      te_readiness: "Token Readiness", te_readiness_sub: "Community readiness score",
      te_disclaimer: "This is a loyalty economy simulation. Points and fan passes are access & reward infrastructure — not investment products.",
      te_supply_t: "Total supply", te_supply_hint: "e.g. 1,000,000",
      te_ratio_t: "Points → token ratio",
      te_mode_t: "Tokenization mode",
      te_mode_offchain: "Off-chain", te_mode_simulated: "On-chain (simulated)", te_mode_live: "On-chain live",
      te_simulate: "Run simulation", te_simulating: "Simulating…",
      te_pools_t: "Pool allocations",
      te_p_community: "Community rewards", te_p_airdrop: "Launch airdrop",
      te_p_creator: "Creator reserve", te_p_partner: "Partner rewards", te_p_buffer: "Campaign buffer",
      te_airdrop_t: "Airdrop projection",
      te_airdrop_fans: "Top fans", te_airdrop_avg: "Avg. tokens / fan",
      te_rewards_t: "Rewards runway",
      te_monthly: "Monthly reward budget",
      te_readiness_why: "What is Token Readiness?",
      te_why_desc: "Token Readiness measures whether your community economy is ready to benefit from a tokenized loyalty layer. It is based on fan activity, tier distribution, points volume and redemption history — not on speculation.",
      te_risk_t: "Risk analysis", te_sim: "Simulation",
      te_valid_ok: "Configuration looks healthy.", te_valid_warn: "Warnings",
      te_valid_err: "Errors", te_pressure: "Redemption pressure",
      te_liability: "Est. liability",
      te_months: "months runway", te_airdrop_ok: "Viable", te_airdrop_nok: "Exceeds pool"
    },
    fr: {
      te_title: "Économie token", te_head: "Concevez votre économie token",
      te_sub: "Modélisez votre supply de points, les pools d'allocation et le lancement d'airdrop — entièrement off-chain pour l'instant. La couche token s'active quand votre communauté est prête.",
      te_readiness: "Maturité token", te_readiness_sub: "Score de préparation de la communauté",
      te_disclaimer: "Il s'agit d'une simulation d'économie de fidélité. Les points et fan passes sont une infrastructure d'accès et de récompenses — pas des produits d'investissement.",
      te_supply_t: "Supply totale", te_supply_hint: "ex. 1 000 000",
      te_ratio_t: "Ratio points → token",
      te_mode_t: "Mode de tokenisation",
      te_mode_offchain: "Off-chain", te_mode_simulated: "On-chain (simulé)", te_mode_live: "On-chain live",
      te_simulate: "Lancer la simulation", te_simulating: "Simulation…",
      te_pools_t: "Allocations des pools",
      te_p_community: "Récompenses communauté", te_p_airdrop: "Airdrop de lancement",
      te_p_creator: "Réserve créateur", te_p_partner: "Récompenses partenaires", te_p_buffer: "Buffer campagnes",
      te_airdrop_t: "Projection d'airdrop",
      te_airdrop_fans: "Top fans", te_airdrop_avg: "Tokens moy. / fan",
      te_rewards_t: "Durée des récompenses",
      te_monthly: "Budget récompenses mensuel",
      te_readiness_why: "C'est quoi la Maturité token ?",
      te_why_desc: "La Maturité token mesure si votre économie communautaire est prête à bénéficier d'une couche tokenisée. Elle est basée sur l'activité des fans, la distribution des paliers, le volume de points et l'historique de rachat — pas sur la spéculation.",
      te_risk_t: "Analyse des risques", te_sim: "Simulation",
      te_valid_ok: "Configuration saine.", te_valid_warn: "Avertissements",
      te_valid_err: "Erreurs", te_pressure: "Pression de rachat",
      te_liability: "Passif estimé",
      te_months: "mois de récompenses", te_airdrop_ok: "Viable", te_airdrop_nok: "Dépasse le pool"
    }
  };
  AuraI18n.init({
    en: Object.assign({}, AURA_PRODUCT_COPY.en, page.en),
    fr: Object.assign({}, AURA_PRODUCT_COPY.fr, page.fr)
  });
})();
