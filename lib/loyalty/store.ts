import { createDemoLoyaltyState } from "./mockLoyaltyData";
import type { LoyaltyState } from "./types";
import { deleteLocalJson, readLocalJson, writeLocalJson } from "../storage/localJsonStore";

declare global {
  // eslint-disable-next-line no-var
  var __auraLoyaltyState: LoyaltyState | undefined;
}

export function getLoyaltyState() {
  if (!globalThis.__auraLoyaltyState) {
    globalThis.__auraLoyaltyState = readLocalJson("loyalty-state.json", createDemoLoyaltyState);
  }
  return globalThis.__auraLoyaltyState;
}

export function setLoyaltyState(nextState: LoyaltyState) {
  // MVP local JSON persistence. Replace this adapter with database storage
  // keyed by the authenticated creator before multi-user production.
  globalThis.__auraLoyaltyState = nextState;
  writeLocalJson("loyalty-state.json", nextState);
  return nextState;
}

export function resetLoyaltyState() {
  globalThis.__auraLoyaltyState = createDemoLoyaltyState();
  deleteLocalJson("loyalty-state.json");
  return globalThis.__auraLoyaltyState;
}

export function getDemoProgramId() {
  return getLoyaltyState().programs[0]?.id || "";
}
