import type { B2BAgentState, CampaignStatus, SponsoredRewardCampaign } from "./types";
import {
  getPersistenceMode,
  readPersistedState,
  resetPersistedState,
  writePersistedState,
} from "../storage/localJsonStore";

declare global {
  // eslint-disable-next-line no-var
  var __auraB2BAgentState: B2BAgentState | undefined;
  // eslint-disable-next-line no-var
  var __auraB2BAgentRevision: number | undefined;
}

export function createInitialB2BAgentState(): B2BAgentState {
  return {
    businesses: [],
    fitScores: [],
    opportunities: [],
    outreachDrafts: [],
    campaigns: [],
    runs: [],
    platformRevenue: 0,
  };
}

export function getB2BAgentState() {
  if (!globalThis.__auraB2BAgentState || getPersistenceMode() === "sqlite") {
    const persisted = readPersistedState("b2b-agent-state.json", createInitialB2BAgentState);
    globalThis.__auraB2BAgentState = normalizeB2BAgentState(
      persisted.value,
    );
    globalThis.__auraB2BAgentRevision = persisted.revision;
  } else {
    globalThis.__auraB2BAgentState = normalizeB2BAgentState(globalThis.__auraB2BAgentState);
  }
  return globalThis.__auraB2BAgentState;
}

export function setB2BAgentState(nextState: B2BAgentState) {
  getB2BAgentState();
  const normalizedState = normalizeB2BAgentState(nextState);
  const nextRevision = writePersistedState(
    "b2b-agent-state.json",
    normalizedState,
    globalThis.__auraB2BAgentRevision || 0,
  );
  globalThis.__auraB2BAgentState = normalizedState;
  globalThis.__auraB2BAgentRevision = nextRevision;
  return normalizedState;
}

export function resetB2BAgentState() {
  const persisted = resetPersistedState(
    "b2b-agent-state.json",
    createInitialB2BAgentState,
  );
  globalThis.__auraB2BAgentState = persisted.value;
  globalThis.__auraB2BAgentRevision = persisted.revision;
  return globalThis.__auraB2BAgentState;
}

const REVENUE_CAMPAIGN_STATUSES: ReadonlySet<CampaignStatus> = new Set([
  "paid",
  "payment_simulated",
  "approved_mock",
  "completed",
]);

export function calculateB2BPlatformRevenue(campaigns: SponsoredRewardCampaign[] = []) {
  return roundCurrency(
    campaigns.reduce((total, campaign) => {
      if (!isB2BRevenueCampaign(campaign)) return total;
      return total + safeMoney(campaign.platformCommission);
    }, 0),
  );
}

export function calculateProviderBackedPlatformRevenue(
  campaigns: SponsoredRewardCampaign[] = [],
) {
  return roundCurrency(
    campaigns.reduce((total, campaign) => {
      if (campaign.status !== "paid" || campaign.payment?.status !== "paid") return total;
      return total + safeMoney(campaign.platformCommission);
    }, 0),
  );
}

export function hasB2BRevenueCampaignForOpportunity(
  campaigns: SponsoredRewardCampaign[],
  opportunityId: string,
) {
  return campaigns.some(
    (campaign) =>
      campaign.partnershipOpportunityId === opportunityId &&
      isB2BRevenueCampaign(campaign),
  );
}

export function normalizeB2BAgentState(state: B2BAgentState): B2BAgentState {
  const initialState = createInitialB2BAgentState();
  const campaigns = Array.isArray(state.campaigns) ? state.campaigns : initialState.campaigns;

  return {
    ...initialState,
    ...state,
    businesses: Array.isArray(state.businesses) ? state.businesses : initialState.businesses,
    fitScores: Array.isArray(state.fitScores) ? state.fitScores : initialState.fitScores,
    opportunities: Array.isArray(state.opportunities) ? state.opportunities : initialState.opportunities,
    outreachDrafts: Array.isArray(state.outreachDrafts) ? state.outreachDrafts : initialState.outreachDrafts,
    campaigns,
    runs: Array.isArray(state.runs) ? state.runs : initialState.runs,
    platformRevenue: calculateB2BPlatformRevenue(campaigns),
  };
}

function isB2BRevenueCampaign(campaign: SponsoredRewardCampaign) {
  return REVENUE_CAMPAIGN_STATUSES.has(campaign.status);
}

function safeMoney(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
