/* AURA — Fan Pass studio copy */
(function () {
  const page = {
    en: {
      f_title: "Fan Pass studio", f_head: "Launch a Fan Pass",
      f_sub: "Design a limited pass, simulate the launch, and reward your superfans. Fans see a collectible pass — the token layer handles ownership and scarcity invisibly.",
      f_design: "Pass design", f_name: "Pass name", f_name_v: "Your founders pass",
      f_edition: "Edition size", f_price: "Mint price", f_perks: "Holder perks",
      f_artwork: "Artwork style", f_art1: "Aurora", f_art2: "Eclipse", f_art3: "Prism",
      f_view_fan: "Fan view", f_view_tech: "Token layer",
      f_layer_owner: "Ownership", f_layer_owner_d: "Each pass is a unique, fan-owned token. It stays theirs even if they leave a platform.",
      f_layer_scarce: "Scarcity", f_layer_scarce_d: "Supply is capped on-chain. No silent reprints — status is real.",
      f_layer_port: "Portability", f_layer_port_d: "Passes move with the fan across apps and communities.",
      f_layer_trans: "Transparency", f_layer_trans_d: "Every mint and transfer is publicly verifiable.",
      f_launch: "Simulate launch", f_launching: "Minting…", f_launched: "Launch simulated",
      f_supply_label: "Minted", f_remaining: "remaining", f_revenue: "Launch revenue",
      f_holders: "Recent holders", f_airdrop: "Airdrop to superfans",
      f_airdrop_d: "Reward your most engaged fans with a free pass.",
      f_airdrop_btn: "Simulate airdrop", f_airdropped: "passes airdropped",
      f_reset: "Reset simulation", f_sim: "Simulation",
      f_disclaimer: "This is a simulation of a future tokenized loyalty layer. No real blockchain, currency or investment is involved.",
      f_mint_perk1: "Lifetime VIP status", f_mint_perk2: "Private monthly drops", f_mint_perk3: "Backstage access", f_mint_perk4: "Name in the credits"
    },
    fr: {
      f_title: "Studio Fan Pass", f_head: "Lancez un Fan Pass",
      f_sub: "Concevez un pass limité, simulez le lancement et récompensez vos superfans. Les fans voient un pass collector — la couche token gère propriété et rareté de façon invisible.",
      f_design: "Design du pass", f_name: "Nom du pass", f_name_v: "Votre founders pass",
      f_edition: "Taille de l'édition", f_price: "Prix de mint", f_perks: "Avantages détenteurs",
      f_artwork: "Style d'artwork", f_art1: "Aurora", f_art2: "Eclipse", f_art3: "Prism",
      f_view_fan: "Vue fan", f_view_tech: "Couche token",
      f_layer_owner: "Propriété", f_layer_owner_d: "Chaque pass est un token unique possédé par le fan. Il reste le sien même s'il quitte une plateforme.",
      f_layer_scarce: "Rareté", f_layer_scarce_d: "La quantité est plafonnée on-chain. Pas de réimpression silencieuse — le statut est réel.",
      f_layer_port: "Portabilité", f_layer_port_d: "Les passes suivent le fan à travers apps et communautés.",
      f_layer_trans: "Transparence", f_layer_trans_d: "Chaque mint et transfert est vérifiable publiquement.",
      f_launch: "Simuler le lancement", f_launching: "Mint en cours…", f_launched: "Lancement simulé",
      f_supply_label: "Mintés", f_remaining: "restants", f_revenue: "Revenu de lancement",
      f_holders: "Détenteurs récents", f_airdrop: "Airdrop aux superfans",
      f_airdrop_d: "Récompensez vos fans les plus engagés avec un pass gratuit.",
      f_airdrop_btn: "Simuler l'airdrop", f_airdropped: "passes airdroppés",
      f_reset: "Réinitialiser la simulation", f_sim: "Simulation",
      f_disclaimer: "Ceci est une simulation d'une future couche de fidélité tokenisée. Aucune blockchain, devise ou investissement réel n'est impliqué.",
      f_mint_perk1: "Statut VIP à vie", f_mint_perk2: "Drops privés mensuels", f_mint_perk3: "Accès backstage", f_mint_perk4: "Nom au générique"
    }
  };
  AuraI18n.init({
    en: Object.assign({}, AURA_PRODUCT_COPY.en, page.en),
    fr: Object.assign({}, AURA_PRODUCT_COPY.fr, page.fr)
  });
})();
