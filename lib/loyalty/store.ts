import { createDemoLoyaltyState } from "./mockLoyaltyData";
import type { LoyaltyState } from "./types";
import {
  getPersistenceMode,
  readPersistedState,
  resetPersistedState,
  writePersistedState,
} from "../storage/localJsonStore";

declare global {
  // eslint-disable-next-line no-var
  var __auraLoyaltyState: LoyaltyState | undefined;
  // eslint-disable-next-line no-var
  var __auraLoyaltyRevision: number | undefined;
}

export function getLoyaltyState() {
  if (!globalThis.__auraLoyaltyState || getPersistenceMode() === "sqlite") {
    const persisted = readPersistedState("loyalty-state.json", createDemoLoyaltyState);
    globalThis.__auraLoyaltyState = persisted.value;
    globalThis.__auraLoyaltyRevision = persisted.revision;
  }
  return globalThis.__auraLoyaltyState;
}

export function setLoyaltyState(nextState: LoyaltyState) {
  getLoyaltyState();
  const nextRevision = writePersistedState(
    "loyalty-state.json",
    nextState,
    globalThis.__auraLoyaltyRevision || 0,
  );
  globalThis.__auraLoyaltyState = nextState;
  globalThis.__auraLoyaltyRevision = nextRevision;
  return nextState;
}

export function resetLoyaltyState() {
  const persisted = resetPersistedState("loyalty-state.json", createDemoLoyaltyState);
  globalThis.__auraLoyaltyState = persisted.value;
  globalThis.__auraLoyaltyRevision = persisted.revision;
  return globalThis.__auraLoyaltyState;
}

export function getDemoProgramId() {
  return getLoyaltyState().programs[0]?.id || "";
}
