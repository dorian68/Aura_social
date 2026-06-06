import type {
  CreatorAnalysisInput,
  CreatorMetrics,
  CreatorScores,
  PostAnalysisResult,
  Recommendation,
} from "@/lib/analytics/types";

export function generateRecommendations(
  input: CreatorAnalysisInput,
  metrics: CreatorMetrics,
  scores: CreatorScores,
  postAnalysis: PostAnalysisResult,
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const add = (recommendation: Recommendation) => {
    if (recommendations.length < 8) recommendations.push(recommendation);
  };

  if (metrics.engagementRate < 2) {
    add({
      id: "low-engagement",
      priority: "high",
      title: "Renforcer l’interaction directe",
      description:
        "Votre taux d’engagement est faible. Avant de lancer un token, renforcez l’interaction via stories, questions, lives et contenus conversationnels.",
    });
  } else {
    add({
      id: "engagement-base",
      priority: "opportunity",
      title: "Activer votre audience engagée",
      description:
        "Votre base d’engagement est exploitable. Utilisez une waitlist et une série de stories pour mesurer l’intérêt avant le lancement.",
    });
  }

  if (metrics.commentToLikeRatio >= 0.06) {
    add({
      id: "conversation-strength",
      priority: "opportunity",
      title: "Capitaliser sur les conversations",
      description:
        "Votre audience ne se contente pas de liker : elle réagit. C’est un bon signal pour une communauté premium ou un token de fidélité.",
    });
  } else {
    add({
      id: "conversation-gap",
      priority: "medium",
      title: "Stimuler les commentaires qualifiés",
      description:
        "Ajoutez des questions précises et des appels à contribution dans vos captions pour transformer les likes passifs en conversations.",
    });
  }

  if (metrics.saveRate >= 0.35) {
    add({
      id: "durable-content",
      priority: "opportunity",
      title: "Créer une bibliothèque premium",
      description:
        "Vos contenus ont une valeur durable. Envisagez des ressources exclusives, templates, guides ou formations comme avantages.",
    });
  }
  if (metrics.shareRate >= 0.12) {
    add({
      id: "organic-acquisition",
      priority: "opportunity",
      title: "Lancer une campagne de waitlist",
      description:
        "Votre contenu circule bien. Vous avez un potentiel d’acquisition organique intéressant pour lancer une campagne de waitlist.",
    });
  }
  if ((input.bioLinkClicks ?? 0) === 0) {
    add({
      id: "track-bio",
      priority: "medium",
      title: "Mesurer les clics du lien bio",
      description:
        "Ajoutez un lien traqué vers une page d’attente pour mesurer l’intention de conversion au-delà des interactions sociales.",
    });
  }
  if (postAnalysis.volatility === "Élevée") {
    add({
      id: "content-volatility",
      priority: "risk",
      title: "Réduire la volatilité éditoriale",
      description:
        "Vos posts ont des performances irrégulières. Répliquez les formats et sujets des meilleurs contenus avant d’orchestrer un lancement.",
    });
  }
  if (scores.tokenReadinessScore > 70) {
    add({
      id: "token-ready",
      priority: "opportunity",
      title: "Préparer un programme de fidélité",
      description: "Votre communauté présente des signaux forts pour un programme de fidélité tokenisé.",
    });
  } else if (scores.tokenReadinessScore < 40) {
    add({
      id: "token-not-ready",
      priority: "high",
      title: "Construire votre noyau dur",
      description:
        "Votre audience n’est pas encore prête pour un token. Priorité : augmenter la récurrence d’interaction et créer un noyau dur de fans.",
    });
  } else {
    add({
      id: "token-pilot",
      priority: "medium",
      title: "Tester un programme pilote",
      description:
        "Commencez par un petit cercle de fans actifs et validez les avantages les plus demandés avant un lancement plus large.",
    });
  }
  if (postAnalysis.posts.length === 0) {
    add({
      id: "add-posts",
      priority: "medium",
      title: "Améliorer la couverture éditoriale",
      description:
        "Le provider n’a pas remonté de posts récents. Vérifiez que le profil est public afin d’identifier vos formats performants et votre régularité.",
    });
  }
  if ((input.estimatedDMs ?? 0) === 0) {
    add({
      id: "track-dms",
      priority: "medium",
      title: "Suivre les messages entrants",
      description:
        "Mesurez les demandes reçues en message privé : elles signalent souvent les sujets et offres capables de convertir votre noyau actif.",
    });
  }
  if (metrics.reelViewRate === 0) {
    add({
      id: "track-reels",
      priority: "medium",
      title: "Mesurer la portée des Reels",
      description:
        "Ajoutez vos vues moyennes sur Reels pour distinguer votre audience existante de votre potentiel d’acquisition organique.",
    });
  }
  if (recommendations.length < 5) {
    add({
      id: "editorial-cadence",
      priority: "medium",
      title: "Structurer une cadence éditoriale",
      description:
        "Planifiez une séquence régulière de contenus utiles, conversationnels et promotionnels pour suivre l’évolution de vos signaux chaque semaine.",
    });
  }
  if (recommendations.length < 5) {
    add({
      id: "segment-core-audience",
      priority: "opportunity",
      title: "Segmenter votre noyau actif",
      description:
        "Identifiez les fans qui commentent, sauvegardent et répondent régulièrement pour construire votre premier cercle d’ambassadeurs.",
    });
  }

  return recommendations.slice(0, 8);
}
