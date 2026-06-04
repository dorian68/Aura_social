"use client";

import type { UIBlock } from "@/lib/operator/types";
import { ActionPlanBlock } from "./blocks/ActionPlanBlock";
import { AuditEventBlock } from "./blocks/AuditEventBlock";
import { B2BOpportunityBlock } from "./blocks/B2BOpportunityBlock";
import { ConfirmationBlock } from "./blocks/ConfirmationBlock";
import { FanPassBlock } from "./blocks/FanPassBlock";
import { HealthStatusBlock } from "./blocks/HealthStatusBlock";
import { KPIBlock } from "./blocks/KPIBlock";
import { PitchPreviewBlock } from "./blocks/PitchPreviewBlock";
import { RewardCardBlock } from "./blocks/RewardCardBlock";
import { TokenEconomyBlock } from "./blocks/TokenEconomyBlock";
import { ToolResultBlock } from "./blocks/ToolResultBlock";

interface ToolResultRendererProps {
  blocks: UIBlock[];
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function ToolResultRenderer({ blocks, onConfirm, onCancel }: ToolResultRendererProps) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-1">
      {blocks.map((block, i) => (
        <div key={i}>
          {block.type === "kpi" && <KPIBlock block={block} />}
          {block.type === "action_plan" && <ActionPlanBlock block={block} />}
          {block.type === "tool_result" && <ToolResultBlock block={block} />}
          {block.type === "reward_card" && <RewardCardBlock block={block} />}
          {block.type === "fan_pass" && <FanPassBlock block={block} />}
          {block.type === "b2b_opportunity" && <B2BOpportunityBlock block={block} />}
          {block.type === "pitch_preview" && <PitchPreviewBlock block={block} />}
          {block.type === "token_economy" && <TokenEconomyBlock block={block} />}
          {block.type === "health_status" && <HealthStatusBlock block={block} />}
          {block.type === "confirmation" && (
            <ConfirmationBlock block={block} onConfirm={onConfirm} onCancel={onCancel} />
          )}
          {block.type === "audit_event" && <AuditEventBlock block={block} />}
        </div>
      ))}
    </div>
  );
}
