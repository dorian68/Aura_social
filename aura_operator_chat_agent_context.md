# Aura — Natural Language Control Agent Context
## Chat Copilot + Tool/MCP Library + UI Blocks

## 1. Current Project State

Aura is evolving into a full creator monetization platform.

The current product already includes:

- Instagram Analyzer
- Loyalty points economy
- Token economy simulator
- Smart contracts / Solidity proof of concept
- Agentic loyalty recommendations
- B2B Expansion Agent
- Workspace control plane
- Connected account registry without token persistence
- Integration state
- Audit trail
- Enriched health endpoint
- Backend-first CLI debug scripts
- SaaS Control Plane in dashboard

Recent validations passed:

- npm run typecheck
- npm run lint
- npm run build
- npm run debug:workspace
- npm run debug:loyalty
- npm run debug:token-economy
- npm run debug:agent
- npm run debug:b2b-agent
- npm run debug:meta-flow with MOCK_META=true
- npm run debug:contracts
- npm run smoke:platform

The next logical step is to make the whole platform controllable through a natural-language AI agent accessible from a chat window in the bottom-right corner.

---

## 2. Product Vision

The user should be able to control the platform in natural language.

Aura should become:

```text
Creator monetization platform
+ loyalty/token economy
+ B2B growth engine
+ workspace control plane
+ AI chat copilot
+ MCP/tool library
+ dynamic UI blocks
```

The AI agent should help users:

- understand the product
- navigate the platform
- execute actions
- configure loyalty programs
- simulate token economies
- create rewards
- launch or simulate campaigns
- inspect workspace/integration state
- run diagnostics
- generate recommendations
- produce campaign copy
- support mobile usage through conversational control

This agent is not a generic chatbot.

It is the natural-language operating layer of Aura.

---

## 3. Core Principle

Everything the platform can do should eventually be exposed as a safe, typed tool.

The chat agent should not manipulate random UI elements blindly.

It should call a tool library.

```text
User prompt
→ intent parsing
→ tool selection
→ argument extraction
→ permission/safety check
→ tool execution
→ result normalization
→ dynamic UI block rendering
→ next-action suggestion
```

---

## 4. Tool / MCP Philosophy

The project should implement an internal tool registry inspired by MCP.

The user will later provide a `.mcp` or MCP-style specification.

The architecture must therefore be ready to:

- register tools
- describe tool names
- describe tool input schema
- describe tool output schema
- expose tool metadata
- validate arguments
- execute tools
- return structured results
- render results as UI blocks
- log tool calls
- add external MCP servers later

For now, implement an internal MCP-like tool registry inside the app.

Do not wait for the final `.mcp` spec to build the architecture.

---

## 5. Agent Surfaces

The agent should appear as a floating chat window:

- fixed bottom-right on desktop
- mobile-friendly full-screen or bottom-sheet mode
- collapsible
- persistent across main dashboard pages
- styled according to Aura’s DA
- dark premium SaaS
- lime accents
- modern UI blocks
- no fantasy
- no cartoonish mascot
- no crypto-bro aesthetics

Recommended name:

> Aura Operator

Because the agent controls the product, not just answers questions.

---

## 6. Agent Capabilities

The agent should support four classes of actions.

### Explain

Examples:

```text
Explain what Token Readiness means.
Why is this reward too expensive?
What is the difference between points and fan pass?
What does the B2B Expansion Agent do?
```

### Navigate

Examples:

```text
Open the loyalty dashboard.
Take me to the token economy simulator.
Show me the B2B Growth Engine.
Open workspace health.
```

### Analyze

Examples:

```text
Analyze my loyalty program.
Find the biggest monetization opportunity.
Compare fan pass vs reward campaign.
Show risks in my token economy.
Which segment should I target first?
```

### Act

Examples:

```text
Create a reward called VIP Dinner Access costing 750 points.
Create a Gold fan pass at €29 with 100 supply.
Run the B2B Expansion Agent for restaurants in Fort-de-France.
Generate a campaign for my top superfans.
Simulate a €200 SME campaign.
Create a double-points weekend campaign.
```

For sensitive actions, require confirmation.

---

## 7. Safety Rules

The agent can execute safe actions directly.

Safe actions:

- read state
- summarize data
- navigate
- simulate
- generate drafts
- run mock agents
- create local draft objects
- run diagnostics
- call health endpoints
- generate recommendations

Require confirmation before:

- sending real email/DM
- publishing content
- charging money
- connecting external accounts
- deploying contracts
- minting on live chain
- changing critical settings
- deleting data
- launching real campaigns
- exposing tokens/secrets
- executing real outreach

In the current MVP, all external actions should remain simulated unless explicitly configured.

---

## 8. Tool Categories

Initial internal tools should cover:

### Workspace Tools

- getWorkspaceState
- getIntegrationHealth
- getAuditTrail
- runPlatformHealthCheck

### Loyalty Tools

- getLoyaltyStats
- createLoyaltyProgram
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

### Navigation/UI Tools

- navigateTo
- highlightSection
- openDashboardPanel
- showUIBlock

---

## 9. UI Blocks

The agent should not only return plain text.

It should render dynamic UI blocks depending on tool results.

Initial UI blocks:

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

---

## 10. Conversation Memory

For MVP:

- store conversation messages in component state or lightweight local app store
- include current workspace context when needed
- include current page context
- include selected creator/program if available

Later:

- persist conversations in database
- connect to user/workspace identity
- save tool execution history
- save agent recommendations

---

## 11. Backend-First Development

Implement backend/tool execution first.

Create debug scripts:

```bash
npm run debug:operator
npm run debug:tools
```

These should:

- list registered tools
- validate schemas
- execute sample tools
- run a sample prompt through the orchestrator
- show selected tool
- show arguments
- show output
- show UI block payload
- log audit events

Do not develop only from the UI.

---

## 12. Suggested Architecture

Suggested files:

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

Adapt to the existing project structure if needed.

---

## 13. API Behavior

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
    "reply": "I found 3 strong restaurant partnership opportunities in Fort-de-France.",
    "toolCalls": [],
    "uiBlocks": [],
    "nextActions": []
  }
}
```

### GET /api/operator/tools

Returns registered tools and metadata.

### POST /api/operator/execute

Executes a specific tool with validated args.

---

## 14. Agent Intelligence

For MVP, start with deterministic routing.

Examples:

- “health”, “connection”, “integration” → workspace health tools
- “reward” → reward tools
- “fan pass” → fan pass tools
- “token economy”, “token readiness” → token tools
- “B2B”, “business”, “restaurant”, “Google Places”, “partner” → B2B agent tools
- “DM”, “message”, “campaign” → campaign/DM tools
- “go to”, “open”, “show me” → navigation tools

Optional future:

```text
OPERATOR_MODE=rules | llm
```

If LLM is not configured, rules mode must work.

---

## 15. Design Direction

The chat should feel premium and modern.

Visual style:

- dark premium SaaS
- lime accents
- subtle glassmorphism
- compact but elegant
- mobile-first
- smooth animation
- rounded cards
- terminal/data intelligence aesthetic
- no fantasy
- no childish avatar
- no crypto coin cliché

The agent should visually signal:

> “This is your operating system for community monetization.”

---

## 16. Acceptance Criteria

The feature is complete when:

1. Floating agent chat exists bottom-right.
2. It is responsive and usable on mobile.
3. It can answer platform questions using deterministic logic.
4. It can list tools.
5. It can call internal tools.
6. It can render styled UI blocks.
7. It can navigate or suggest navigation.
8. It can run at least:
   - workspace health
   - loyalty stats
   - token economy simulation
   - B2B Expansion Agent
   - campaign/DM draft generation
9. It logs tool calls/audit events.
10. It requires confirmation for sensitive actions.
11. It does not break existing dashboards.
12. Debug scripts pass.
