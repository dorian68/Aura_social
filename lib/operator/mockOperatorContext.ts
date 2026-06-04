import type { OperatorContext } from "./types";

export function getMockOperatorContext(overrides: Partial<OperatorContext> = {}): OperatorContext {
  return {
    workspaceId: "workspace_aura_demo",
    currentPage: "/dashboard",
    selectedCreatorId: "creator-demo",
    selectedProgramId: "",
    ...overrides,
  };
}

export function enrichContextWithDefaults(context: Partial<OperatorContext> = {}): OperatorContext {
  return {
    workspaceId: context.workspaceId || "workspace_aura_demo",
    currentPage: context.currentPage || "/dashboard",
    selectedCreatorId: context.selectedCreatorId || "creator-demo",
    selectedProgramId: context.selectedProgramId || "",
  };
}
