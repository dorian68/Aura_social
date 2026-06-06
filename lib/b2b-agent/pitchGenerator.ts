import type { B2BContext, LocalBusiness, OutreachDraft, PartnershipOpportunity } from "./types";

export function generateB2BPitch({
  business,
  opportunity,
  context,
}: {
  business: LocalBusiness;
  opportunity: PartnershipOpportunity;
  context: B2BContext;
}): OutreachDraft {
  return {
    id: `pitch_${business.id}_${Date.now()}`,
    businessId: business.id,
    creatorId: context.creator.id,
    channel: "email",
    subject: `Campagne locale ${context.creator.name} x ${business.name}`,
    tone: "warm",
    approvalRequired: true,
    status: "draft",
    callToAction: "Souhaitez-vous activer ce pilote sponsorisé de 200 EUR ?",
    createdAt: new Date().toISOString(),
    message: [
      `Bonjour ${business.name},`,
      "",
      `Aura a détecté une opportunité locale entre votre établissement et la communauté de ${context.creator.name}.`,
      "",
      `${context.creator.name} anime une communauté avec ${context.loyaltyStats.totalPointsIssued.toLocaleString("fr-FR")} points de fidélité générés et ${context.loyaltyStats.activeFans.toLocaleString("fr-FR")} fans actifs dans le programme.`,
      "",
      `Nous proposons une campagne sponsorisée de ${formatEuro(opportunity.proposedBudget)} :`,
      `- ${formatEuro(opportunity.fanRewardBudget)} convertis en rewards, promos ou incentives fans`,
      `- ${formatEuro(opportunity.platformCommission)} de commission d'orchestration Aura`,
      "- un code promo distribué aux fans les plus engagés",
      "- un suivi de campagne dans le dashboard Aura",
      "",
      `Activation proposée : ${opportunity.proposedOffer}`,
      "",
      `Estimation pilote : ${opportunity.estimatedReach} fans touchés, ${opportunity.estimatedRedemptions} redemptions, ${formatEuro(opportunity.estimatedBusinessRevenue)} de revenu business potentiel.`,
      "",
      "Aucun outreach réel n'est envoyé automatiquement : ce message est un draft à approuver.",
      "",
      "Souhaitez-vous activer ce pilote ?",
    ].join("\n"),
  };
}

function formatEuro(value: number) {
  return `${Math.round(value).toLocaleString("fr-FR")} EUR`;
}
