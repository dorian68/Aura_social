Continue from your last implementation.

Your last update added a strong SaaS control layer around Aura:

- workspace state
- connected account registry without token persistence
- integration status
- audit trail
- enriched health endpoint
- backend-first CLI checks
- SaaS Control Plane UI in the dashboard

Validation was successful:

- npm run typecheck OK
- npm run lint OK
- npm run build OK
- npm run debug:workspace OK
- npm run debug:loyalty OK
- npm run debug:token-economy OK
- npm run debug:agent OK
- npm run debug:b2b-agent OK
- npm run debug:meta-flow in MOCK_META=true OK
- npm run debug:contracts OK
- npm run smoke:platform OK

The server is running on:

http://localhost:3170

Now implement the next product layer:

# Aura Operator — Natural Language Control Agent

The goal is to make the entire Aura platform controllable and accessible through a bottom-right AI chat window.

This is especially important for mobile UX.

Aura is becoming feature-rich: Instagram Analyzer, loyalty points, fan passes, token economy, smart contracts, B2B Expansion Agent, workspace health, integrations, audit trail.

Users should be able to control all of this with natural language.

Use the context file:

`aura_operator_chat_agent_context.md`

as the product and architecture source of truth.

## Product Goal

Build an in-app agent accessible through a floating chat window in the bottom-right corner.

The agent should let users ask things like:

- “Check my workspace health.”
- “Show me my loyalty stats.”
- “Create a reward costing 500 points.”
- “Simulate a €200 SME campaign.”
- “Run the B2B Expansion Agent in Fort-de-France for restaurants.”
- “Generate a DM for my top 20 fans.”
- “Explain Token Readiness.”
- “Open the token economy simulator.”
- “What should I do next to monetize this community?”

This agent should not be a generic chatbot.

It should be the natural-language operating layer of Aura.

## Important Direction

Implement a tool-library / MCP-inspired architecture.

I will later provide a `.mcp` or MCP-style spec for additional tools.

Do not wait for that future spec.

Build the internal foundation now:

- tool registry
- tool metadata
- input schema
- output schema
- tool executor
- safety/confirmation layer
- intent router
- response renderer
- dynamic UI blocks
- audit logging for tool calls

The goal is that any feature of Aura can gradually become a tool.

## Development Method

Follow backend-first debugging.

Do not build only the UI.

First implement:

1. operator types
2. tool registry
3. tool executor
4. deterministic intent router
5. internal tools wrapping existing product functionality
6. API routes
7. debug scripts
8. then UI chat window and UI blocks

Do not ask me for validation before every safe command.

Ask me only if:
- human authentication is required
- credentials are missing
- destructive operations are needed
- external provider configuration is required

Never log secrets in full.

Do not break the existing analyzer, dashboard, workspace control plane, loyalty engine, B2B agent, contracts, or debug scripts.

## Required Architecture

Add or adapt the following structure:

```text
/lib/operator
  types.ts
  toolRegistry.ts
  toolSchemas.ts
  toolExecutor.ts
  intentRouter.ts
  responseRenderer.ts
  operatorOrchestrator.ts
  mockOperatorContext.ts
  safety.ts

/lib/operator/tools
  workspaceTools.ts
  loyaltyTools.ts
  fanPassTools.ts
  tokenEconomyTools.ts
  recommendationTools.ts
  b2bAgentTools.ts
  contractTools.ts
  navigationTools.ts

/app/api/operator/chat/route.ts
/app/api/operator/tools/route.ts
/app/api/operator/execute/route.ts

/components/operator
  AuraOperator.tsx
  OperatorLauncher.tsx
  OperatorChatWindow.tsx
  OperatorMessage.tsx
  OperatorInput.tsx
  ToolResultRenderer.tsx
  blocks/
    KPIBlock.tsx
    ActionPlanBlock.tsx
    ToolResultBlock.tsx
    RewardCardBlock.tsx
    FanPassBlock.tsx
    B2BOpportunityBlock.tsx
    PitchPreviewBlock.tsx
    TokenEconomyBlock.tsx
    HealthStatusBlock.tsx
    ConfirmationBlock.tsx
```

Adapt names and structure if the existing app has better conventions.

## Phase 1 — Tool Registry

Create a typed internal tool registry.

Each tool should have:

- name
- description
- category
- input schema
- output schema or output description
- risk level: safe | confirmation_required | dangerous
- execute function
- UI block mapping
- audit metadata

Use simple TypeScript validation first if no validation library exists. If zod is already installed, use zod.

Do not add unnecessary heavy dependencies if avoidable.

## Phase 2 — Initial Tool Categories

Implement tools wrapping existing internal capabilities.

### Workspace Tools

- getWorkspaceState
- getIntegrationHealth
- getAuditTrail
- runPlatformHealthCheck

### Loyalty Tools

- getLoyaltyStats
- createReward
- listRewards
- simulateRewardRedemption
- getTopFans
- createPointsRule
- simulatePointsAward

### Fan Pass Tools

- createFanPass
- simulateFanPassLaunch
- listFanPasses

### Token Economy Tools

- getTokenEconomyState
- simulateTokenEconomy
- analyzeTokenEconomyRisk
- explainTokenReadiness

### Agentic Recommendation Tools

- generateRecommendations
- generateCampaignDraft
- generateDMDraft
- explainRecommendation

### B2B Expansion Agent Tools

- runB2BExpansionAgent
- discoverLocalBusinesses
- scoreBusinessFit
- generatePartnershipPitch
- simulateSMEPayment

### Smart Contract Tools

- getContractStatus
- runContractDiagnostics
- explainContractArchitecture
- simulateMintPoints
- simulateMintFanPass

### Navigation Tools

- navigateTo
- highlightSection
- openDashboardPanel
- showUIBlock

For tools where the real implementation is not available yet, use existing mock/demo services, but label outputs clearly as simulation.

## Phase 3 — Intent Router

Implement a deterministic intent router first.

No LLM is required for the MVP.

The router should map user messages to likely tools.

Examples:

- “health”, “connection”, “integration”, “workspace” → workspace tools
- “reward”, “redeem”, “points cost” → reward/loyalty tools
- “fan pass”, “VIP pass”, “membership” → fan pass tools
- “token economy”, “token readiness”, “allocation”, “risk” → token economy tools
- “B2B”, “business”, “restaurant”, “partner”, “Google Places”, “sponsor” → B2B agent tools
- “DM”, “message”, “campaign”, “caption” → campaign/DM tools
- “contract”, “Solidity”, “mint”, “testnet” → smart contract tools
- “open”, “go to”, “show me”, “navigate” → navigation tools

The router should extract basic arguments:

- city
- category
- campaign budget
- reward name
- points amount
- fan pass tier
- price
- supply

If arguments are missing, ask a concise clarification.

Example:
User: “Run the B2B agent for restaurants.”
Agent: “Which city should I scan? For example: Fort-de-France, Pointe-à-Pitre, Basse-Terre.”

## Phase 4 — Safety Layer

Implement a safety checker.

Safe actions can execute directly:

- read state
- run diagnostics
- simulate
- generate drafts
- create local mock/draft objects
- navigate
- list tools

Require confirmation before:

- sending real outreach
- publishing content
- charging money
- deploying contracts
- minting on live chain
- deleting data
- changing critical settings
- connecting external accounts
- exposing secrets

Since current MVP mostly uses mock/simulated actions, most tools can be safe.

Still implement the confirmation mechanism now.

## Phase 5 — API Routes

Implement:

```text
POST /api/operator/chat
GET /api/operator/tools
POST /api/operator/execute
```

### POST /api/operator/chat

Input:

```json
{
  "message": "Run the B2B Expansion Agent in Fort-de-France for restaurants",
  "context": {
    "workspaceId": "demo",
    "currentPage": "/dashboard",
    "selectedCreatorId": "creator-demo",
    "selectedProgramId": "program-demo"
  }
}
```

Output:

```json
{
  "success": true,
  "data": {
    "reply": "...",
    "toolCalls": [],
    "uiBlocks": [],
    "nextActions": []
  }
}
```

### GET /api/operator/tools

Returns the registered tools, metadata, categories and risk levels.

### POST /api/operator/execute

Executes a specific tool with explicit args.

All errors should follow the existing structured response style.

## Phase 6 — Dynamic UI Blocks

The agent must not only return text.

Implement a UI block system.

Block types:

- KPIBlock
- ActionPlanBlock
- ToolResultBlock
- RewardCardBlock
- FanPassBlock
- B2BOpportunityBlock
- PitchPreviewBlock
- TokenEconomyBlock
- HealthStatusBlock
- ConfirmationBlock
- AuditEventBlock

Each tool response should be able to return one or more UI blocks.

Example:
If the user asks: “Run B2B agent in Fort-de-France for restaurants”

The agent should return:
- reply text
- B2BOpportunityBlock
- PitchPreviewBlock
- KPIBlock showing platform commission
- next actions:
  - “Simulate SME payment”
  - “Generate outreach variant”
  - “Run for another category”

## Phase 7 — UI Chat Window

Implement the floating agent chat UI.

Requirements:

- appears bottom-right on desktop
- collapsible launcher
- modern premium styling
- dark mode aligned with Aura DA
- lime accents
- glass/card feel
- mobile-friendly
- on mobile, open as a full-screen or bottom-sheet style panel
- shows conversation history
- supports loading states
- supports errors
- renders UI blocks
- shows tool calls in a subtle way
- shows suggested next actions
- supports Enter to send
- supports Shift+Enter for newline if textarea
- does not block core dashboard interaction when collapsed

Components:

- AuraOperator
- OperatorLauncher
- OperatorChatWindow
- OperatorMessage
- OperatorInput
- ToolResultRenderer
- UI block components

Mount it globally in the dashboard layout or app shell so it is available across the product.

## Phase 8 — Navigation Support

Implement navigation tool behavior safely.

If full programmatic navigation is available, use it.

Otherwise, return a UI action/suggestion.

Example:
User: “Open token economy simulator”

Agent should either:
- navigate to the relevant route/panel
or
- return a button/link to open it.

Do not fake navigation silently.

## Phase 9 — Audit Trail

Every tool call should produce an audit event if compatible with the existing audit system.

Log:

- timestamp
- tool name
- category
- risk level
- args summary
- success/failure
- simulated/real
- user/workspace context if available

Never log secrets.

If existing audit API exists, reuse it.

If not practical, add a lightweight operator audit log in memory/mock store.

## Phase 10 — Debug Scripts

Create:

```bash
npm run debug:operator
npm run debug:tools
```

### debug:tools

Should:
- list all registered tools
- validate tool metadata
- validate schemas
- execute a few sample safe tools
- print structured results

### debug:operator

Should:
- simulate user prompts
- show selected tool
- show extracted args
- show tool execution result
- show rendered UI block payload
- show next actions

Sample prompts:

```text
Check workspace health
Show loyalty stats
Simulate token economy
Run B2B Expansion Agent in Fort-de-France for restaurants
Generate a DM for my top fans
Explain Token Readiness
Create a reward costing 500 points
```

## Phase 11 — Documentation

Update README with:

- Aura Operator overview
- architecture
- internal tool registry
- how MCP-style tools will plug in later
- API routes
- debug scripts
- safety model
- UI blocks
- mobile use case
- current limitations

Add `.env.example` variables if needed:

```text
OPERATOR_MODE=rules
OPERATOR_ENABLE_LLM=false
```

For now, rules mode must work without LLM.

## Phase 12 — Acceptance Criteria

You are done when:

1. Existing features still work.
2. Typecheck passes.
3. Lint passes.
4. Build passes.
5. Existing debug scripts still pass.
6. New operator debug scripts pass.
7. Floating chat appears bottom-right.
8. Chat works on mobile.
9. The agent can list and call tools.
10. The agent can run at least:
   - workspace health
   - loyalty stats
   - token economy simulation
   - B2B Expansion Agent
   - DM/campaign draft
11. The agent renders styled UI blocks.
12. Tool calls are logged/audited.
13. Confirmation layer exists for sensitive actions.
14. The implementation is ready for future `.mcp` tool specs.

## Final Summary

At the end, provide:

- files created
- files modified
- commands run
- debug script results
- tests/build status
- tools implemented
- what is simulated
- what is ready for real integration
- next steps for connecting external MCP servers or LLM routing

Start by inspecting the project, then implement directly.
