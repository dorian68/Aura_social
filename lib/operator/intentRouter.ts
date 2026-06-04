import type { IntentRouteResult } from "./types";

interface RouteRule {
  toolName: string;
  keywords: string[];
  argExtractors?: ArgExtractor[];
}

interface ArgExtractor {
  argName: string;
  patterns: RegExp[];
  transform?: (match: string) => unknown;
}

const CITY_PATTERN = /\b(fort-de-france|pointe-à-pitre|basse-terre|martinique|guadeloupe|paris|lyon|marseille|bordeaux|toulouse|nantes|nice|strasbourg)\b/i;
const BUDGET_PATTERN = /[€$]?\s*(\d+(?:[.,]\d+)?)\s*(?:€|eur|euros?)?/i;
const POINTS_PATTERN = /(\d+)\s*(?:points?|pts)/i;
const LIMIT_PATTERN = /(?:top|last|first)\s+(\d+)/i;

const ROUTES: RouteRule[] = [
  // workspace
  {
    toolName: "runPlatformHealthCheck",
    keywords: ["health check", "platform check", "full check", "diagnostic"],
  },
  {
    toolName: "getWorkspaceState",
    keywords: ["workspace", "workspace state", "account state"],
  },
  {
    toolName: "getIntegrationHealth",
    keywords: ["integration", "integration health", "connection", "connected", "integrations"],
  },
  {
    toolName: "getAuditTrail",
    keywords: ["audit", "audit trail", "history", "recent events", "audit log"],
  },
  // loyalty
  {
    toolName: "getLoyaltyStats",
    keywords: ["loyalty stats", "loyalty", "stats", "program stats", "points stats", "fan stats"],
  },
  {
    toolName: "getTopFans",
    keywords: ["top fans", "show top fans", "show me top fans", "superfans", "best fans", "top users", "inner circle fans", "top 10 fans", "top 20 fans", "show my top fans"],
    argExtractors: [
      {
        argName: "limit",
        patterns: [LIMIT_PATTERN],
        transform: (m) => parseInt(m),
      },
    ],
  },
  {
    toolName: "listRewards",
    keywords: ["list rewards", "show rewards", "available rewards", "rewards list", "what rewards"],
  },
  {
    toolName: "createReward",
    keywords: ["create reward", "add reward", "new reward", "make reward", "reward costing", "reward called", "reward for"],
    argExtractors: [
      {
        argName: "name",
        patterns: [/(?:create|add|new|make)\s+(?:a\s+)?reward\s+(?:called?\s+|named?\s+)?"?([^"]+?)"?(?:\s+(?:costing|for|at)|\.|$)/i],
      },
      {
        argName: "costInPoints",
        patterns: [POINTS_PATTERN],
        transform: (m) => parseInt(m),
      },
    ],
  },
  {
    toolName: "simulateRewardRedemption",
    keywords: ["simulate redemption", "redeem reward", "redemption simulation", "can fan redeem"],
  },
  {
    toolName: "simulatePointsAward",
    keywords: ["award points", "give points", "simulate points", "points award"],
    argExtractors: [
      {
        argName: "points",
        patterns: [POINTS_PATTERN, /(\d+)\s+pts/i],
        transform: (m) => parseInt(m),
      },
    ],
  },
  {
    toolName: "createPointsRule",
    keywords: ["create rule", "points rule", "new rule", "add rule", "earning rule"],
  },
  // fan pass
  {
    toolName: "listFanPasses",
    keywords: ["list passes", "fan passes", "show passes", "vip passes", "membership passes"],
  },
  {
    toolName: "createFanPass",
    keywords: ["create fan pass", "new fan pass", "add fan pass", "gold pass", "vip pass", "create pass"],
    argExtractors: [
      {
        argName: "price",
        patterns: [/[€$](\d+(?:[.,]\d+)?)/i, BUDGET_PATTERN],
        transform: (m) => parseFloat(m.replace(",", ".")),
      },
    ],
  },
  {
    toolName: "simulateFanPassLaunch",
    keywords: ["simulate fan pass", "fan pass launch", "pass launch", "launch simulation"],
  },
  // token economy
  {
    toolName: "explainTokenReadiness",
    keywords: ["token readiness", "what is token readiness", "explain token", "readiness score", "token score"],
  },
  {
    toolName: "getTokenEconomyState",
    keywords: ["token economy state", "token state", "economy state"],
  },
  {
    toolName: "simulateTokenEconomy",
    keywords: ["simulate token", "token economy", "token simulation", "economy simulation", "token supply"],
  },
  {
    toolName: "analyzeTokenEconomyRisk",
    keywords: ["token risk", "economy risk", "token analysis", "risk analysis", "analyze token"],
  },
  // recommendations
  {
    toolName: "generateRecommendations",
    keywords: ["recommendations", "suggest", "advise", "what should i do", "optimize", "improve loyalty", "monetize"],
  },
  {
    toolName: "generateCampaignDraft",
    keywords: ["campaign draft", "campaign", "instagram campaign", "double points campaign", "content campaign"],
  },
  {
    toolName: "generateDMDraft",
    keywords: ["dm draft", "generate dm", "direct message", "dm fans", "message fans", "outreach message", "generate a dm", "dm for my fans", "dm for top fans", "dm for my top fans", "message my fans", "generate dm for"],
    argExtractors: [
      {
        argName: "fanCount",
        patterns: [LIMIT_PATTERN, /(\d+)\s+fans?/i],
        transform: (m) => parseInt(m),
      },
    ],
  },
  {
    toolName: "explainRecommendation",
    keywords: ["explain recommendation", "why this", "what does this mean", "explain action"],
  },
  // b2b agent
  {
    toolName: "runB2BExpansionAgent",
    keywords: ["b2b agent", "b2b expansion", "business expansion", "run b2b", "run agent", "find businesses", "partner", "sponsor"],
    argExtractors: [
      {
        argName: "location",
        patterns: [CITY_PATTERN],
      },
      {
        argName: "category",
        patterns: [/\b(restaurant|bar|fashion|beauty|gym|hotel|tourism|event_venue|local_product|concept_store|culture)\b/i],
      },
      {
        argName: "campaignBudget",
        patterns: [BUDGET_PATTERN],
        transform: (m) => parseInt(m.replace(/[€$ ]/g, "")),
      },
    ],
  },
  {
    toolName: "discoverLocalBusinesses",
    keywords: ["discover businesses", "find local", "local businesses", "nearby businesses", "google places"],
    argExtractors: [
      {
        argName: "location",
        patterns: [CITY_PATTERN],
      },
    ],
  },
  {
    toolName: "scoreBusinessFit",
    keywords: ["score business", "business fit", "fit score", "best businesses"],
  },
  {
    toolName: "generatePartnershipPitch",
    keywords: ["partnership pitch", "outreach pitch", "generate pitch", "pitch business", "pitch local"],
    argExtractors: [
      {
        argName: "location",
        patterns: [CITY_PATTERN],
      },
      {
        argName: "budget",
        patterns: [BUDGET_PATTERN],
        transform: (m) => parseInt(m.replace(/[€$ ]/g, "")),
      },
    ],
  },
  {
    toolName: "simulateSMEPayment",
    keywords: ["simulate payment", "sme payment", "campaign payment", "payment simulation"],
    argExtractors: [
      {
        argName: "budget",
        patterns: [BUDGET_PATTERN],
        transform: (m) => parseInt(m.replace(/[€$ ]/g, "")),
      },
    ],
  },
  // contracts
  {
    toolName: "getContractStatus",
    keywords: ["contract status", "solidity", "smart contract status", "contracts", "abi status"],
  },
  {
    toolName: "runContractDiagnostics",
    keywords: ["contract diagnostics", "contract check", "abi check"],
  },
  {
    toolName: "explainContractArchitecture",
    keywords: ["explain contracts", "contract architecture", "what are the contracts", "how contracts work"],
  },
  {
    toolName: "simulateMintPoints",
    keywords: ["mint points", "simulate mint", "mock mint", "mint loyalty"],
  },
  {
    toolName: "simulateMintFanPass",
    keywords: ["mint fan pass", "mint pass", "nft mint", "mint nft"],
  },
  // navigation
  {
    toolName: "navigateTo",
    keywords: ["go to dashboard", "go to token economy", "go to b2b", "go to workspace", "go to loyalty", "navigate to", "take me to", "open dashboard", "open token economy", "open b2b", "open workspace", "open loyalty", "open contracts"],
    argExtractors: [
      {
        argName: "destination",
        patterns: [
          /(?:go to|open|navigate to|take me to|show me)\s+(?:the\s+)?([a-z\s-]+?)(?:\s+section|\s+panel|\s+page|\s+dashboard|$)/i,
        ],
        transform: (m) => m.trim().toLowerCase().replace(/\s+/g, "-"),
      },
    ],
  },
];

const CLARIFICATION_TRIGGERS: Record<string, { question: string; argName: string }> = {
  runB2BExpansionAgent: {
    question: "Which city should I scan? For example: Fort-de-France, Pointe-à-Pitre, or Basse-Terre.",
    argName: "location",
  },
  discoverLocalBusinesses: {
    question: "Which city should I search? For example: Fort-de-France or Pointe-à-Pitre.",
    argName: "location",
  },
  createReward: {
    question: "What should the reward be called, and how many points should it cost?",
    argName: "name",
  },
  createFanPass: {
    question: "What tier (bronze/silver/gold/vip) and price (EUR) should this fan pass have?",
    argName: "tier",
  },
};

export function routeIntent(message: string): IntentRouteResult {
  const normalizedMessage = message.toLowerCase().trim();

  // Score each route
  type ScoredRoute = { rule: RouteRule; score: number };
  const scored: ScoredRoute[] = ROUTES.map((rule) => {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (normalizedMessage.includes(keyword.toLowerCase())) {
        score += keyword.split(" ").length;
      }
    }
    return { rule, score };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];
  if (!best || best.score === 0) {
    return {
      toolName: null,
      args: {},
      clarificationNeeded: false,
      confidence: 0,
    };
  }

  const args: Record<string, unknown> = {};
  for (const extractor of best.rule.argExtractors || []) {
    for (const pattern of extractor.patterns) {
      const match = message.match(pattern);
      if (match?.[1]) {
        args[extractor.argName] = extractor.transform ? extractor.transform(match[1]) : match[1];
        break;
      }
    }
  }

  const clarificationTrigger = CLARIFICATION_TRIGGERS[best.rule.toolName];
  if (clarificationTrigger && !args[clarificationTrigger.argName]) {
    return {
      toolName: best.rule.toolName,
      args,
      clarificationNeeded: true,
      clarificationMessage: clarificationTrigger.question,
      confidence: best.score / 10,
    };
  }

  return {
    toolName: best.rule.toolName,
    args,
    clarificationNeeded: false,
    confidence: Math.min(1, best.score / 10),
  };
}
