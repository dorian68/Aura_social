import type { B2BAgentState } from "./types";
import { deleteLocalJson, readLocalJson, writeLocalJson } from "../storage/localJsonStore";

declare global {
  // eslint-disable-next-line no-var
  var __auraB2BAgentState: B2BAgentState | undefined;
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
  if (!globalThis.__auraB2BAgentState) {
    globalThis.__auraB2BAgentState = readLocalJson("b2b-agent-state.json", createInitialB2BAgentState);
  }
  return globalThis.__auraB2BAgentState;
}

export function setB2BAgentState(nextState: B2BAgentState) {
  // MVP local JSON persistence. Replace with database tables for businesses,
  // scores, opportunities, payments and outreach approvals later.
  globalThis.__auraB2BAgentState = nextState;
  writeLocalJson("b2b-agent-state.json", nextState);
  return nextState;
}

export function resetB2BAgentState() {
  globalThis.__auraB2BAgentState = createInitialB2BAgentState();
  deleteLocalJson("b2b-agent-state.json");
  return globalThis.__auraB2BAgentState;
}
