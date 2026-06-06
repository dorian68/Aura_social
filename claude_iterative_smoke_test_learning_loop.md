# Iterative Smoke-Test Learning Loop for Claude Code

## Purpose

This document defines the development philosophy Claude Code must follow when improving this product.

The goal is not just to apply fixes once.

The goal is to create an iterative improvement loop inspired by reinforcement learning:

```text
Apply patch
→ Run smoke test
→ Observe behavior
→ Audit the full flow
→ Identify weak points
→ Correct
→ Re-run
→ Iterate until the product becomes coherent, useful and robust
```

This is not literal machine learning or model training.

It is a disciplined engineering loop where each iteration produces feedback, and that feedback guides the next patch.

---

## Core Philosophy

Do not treat development as:

```text
User asks → code once → stop
```

Treat it as:

```text
Hypothesis
→ implementation
→ test
→ observation
→ diagnosis
→ correction
→ validation
```

The product should improve through cycles.

Each cycle should make the system:

- more coherent
- more reliable
- more useful
- more aligned with the product vision
- more understandable to the user
- more robust across edge cases
- more credible as a real SaaS product

---

## Mandatory Workflow

For every meaningful product patch, Claude Code must follow this workflow:

```text
1. Understand the requested correction
2. Inspect the relevant existing code
3. Form a clear implementation plan
4. Apply the patch
5. Run the appropriate smoke test
6. Observe and audit the smoke test output
7. Identify what still fails or feels incoherent
8. Apply a corrective patch
9. Re-run the smoke test
10. Repeat until the flow is acceptable
11. Run typecheck/lint/build when relevant
12. Summarize what changed and what remains
```

Do not stop immediately after the first implementation if the smoke test reveals issues.

The smoke test is not a formality.

The smoke test is the feedback signal.

---

## Backend-First Rule

Respect the backend-first debugging paradigm.

Do not judge the system only from the UI.

Before polishing UI, validate:

- backend routes
- services
- tool calls
- state transitions
- mock/demo data
- error handling
- integration state
- API response shapes
- debug scripts
- smoke tests

The UI is the final representation of the product state, not the source of truth.

---

## Smoke Test Philosophy

A smoke test should answer:

```text
Can the user complete the intended flow without the product breaking?
Does the flow make sense?
Does the state evolve correctly?
Are the right modules connected?
Are errors explicit and actionable?
Does the output reflect the product vision?
```

A smoke test is not only about “does it compile?”

It is also about product coherence.

---

## What to Audit After a Smoke Test

After running a smoke test, inspect:

### Technical correctness

- Did the command finish successfully?
- Were there runtime errors?
- Were there TypeScript errors?
- Were there missing imports?
- Were API routes reachable?
- Were response shapes correct?
- Were expected files generated?
- Did mock data load correctly?

### Product coherence

- Does the flow tell the right story?
- Does the user understand what happened?
- Does the output match Aura’s positioning?
- Are the simulated values plausible?
- Are labels and copy clear?
- Is there a gap between backend logic and UI representation?

### State consistency

- Did the correct object get created?
- Did counters update?
- Did logs/audit events appear?
- Did the right recommendation appear?
- Did the dashboard reflect the new state?
- Did the tool result match the UI block?

### UX quality

- Is the interface readable?
- Are CTA labels clear?
- Is the next action obvious?
- Are errors human-readable?
- Is mobile still usable?
- Is the user overloaded?

### Safety

- Did the system avoid real external actions unless explicitly configured?
- Were sensitive actions protected?
- Were secrets masked?
- Were simulated actions clearly labeled as simulations?

---

## Reinforcement-Learning Analogy

Think of each smoke test as a reward signal.

Good signals:

- flow completes
- output is coherent
- state is consistent
- user intent is satisfied
- UI clearly reflects backend reality
- no hidden errors

Bad signals:

- flow breaks
- UI says something unsupported by backend
- mock data is misleading
- user cannot understand next step
- routes return inconsistent shapes
- too much is hardcoded
- errors are vague
- product story is unclear

Claude Code must use these signals to improve the product.

---

## Iteration Budget

Do not iterate forever.

Use a practical loop:

```text
Patch → smoke test → audit → fix → smoke test again
```

Usually 2–3 iterations are enough.

If the problem remains after 3 iterations:

1. Stop.
2. Explain the blocker.
3. Show the failing output.
4. Propose the next targeted fix.

---

## Required Output After Each Iteration

After each meaningful iteration, report:

```text
Iteration N
- Patch applied:
- Smoke test run:
- Result:
- Issues found:
- Corrections applied:
- Remaining risks:
```

At the end, provide:

```text
Final status
- What works:
- What was corrected:
- What remains fragile:
- What should be improved next:
- Commands run:
- Files modified:
```

---

## When to Ask the User

Do not ask the user for validation after every safe command.

Ask only when:

- a product decision is ambiguous
- credentials are missing
- human authentication is required
- a destructive action is needed
- an external dashboard must be configured
- a real external action would be triggered
- the current implementation conflicts with the product vision

Otherwise, execute the loop directly.

---

## Commands to Prefer

Depending on the feature, run relevant commands such as:

```bash
npm run typecheck
npm run lint
npm run build
npm run smoke:platform
npm run debug:workspace
npm run debug:loyalty
npm run debug:token-economy
npm run debug:agent
npm run debug:b2b-agent
npm run debug:operator
npm run debug:tools
npm run debug:contracts
```

Do not run irrelevant commands blindly.

Pick the tests that validate the modified flow.

---

## Smoke Test Design Requirement

If a requested feature does not have a smoke test, create one.

A good smoke test should:

- simulate the user flow
- call the backend/API/tools directly
- validate key response shapes
- print a readable audit
- fail loudly when something is inconsistent
- distinguish mock/simulation from real integration
- avoid external calls unless explicitly configured

---

## UI Smoke Testing

For UI-heavy patches, smoke testing should include at minimum:

- build validation
- route existence
- component import validation
- key sections rendered
- mock data visible
- mobile layout sanity
- no missing critical module

If Playwright or browser tests exist, use them.

If they do not exist, do not introduce heavy tooling without reason; create a lightweight smoke script or document manual visual checks.

---

## Product-Specific Aura Checks

For Aura, every iteration should preserve the core product narrative:

```text
Instagram signals
→ Superfan scoring
→ Loyalty points
→ Rewards
→ Fan passes
→ Token economy
→ B2B expansion
→ Agentic recommendations
→ Platform revenue
```

The UI and backend should not drift away from this.

Check that the product still feels like:

```text
A creator monetization operating system
```

not:

```text
A random dashboard collection
```

---

## Quality Bar

A patch is not accepted just because it compiles.

A patch is accepted when:

- it compiles
- it passes relevant smoke tests
- the flow is coherent
- the UI reflects the backend reality
- the copy makes sense
- the product story is stronger
- errors are clearer
- the implementation is maintainable

---

## Short Instruction Version

Use this short version inside prompts when needed:

```text
Apply the corrections, then run the relevant smoke test.
Audit the full output and flow.
If the smoke test reveals issues, patch them and re-run.
Iterate like a reinforcement-learning loop: patch → observe → diagnose → improve.
Do not stop at the first pass if the flow is still weak.
Respect backend-first debugging.
Ask me only for ambiguous product decisions, credentials, human auth, or risky/destructive actions.
```

---

## Default Claude Code Response Pattern

When given this instruction, Claude Code should respond and act like this:

```text
I will apply the requested corrections using the iterative smoke-test loop.

Plan:
1. Inspect affected files and current flow.
2. Apply the patch.
3. Run the relevant smoke test.
4. Audit the output.
5. Patch issues found.
6. Re-run smoke test.
7. Summarize final state.

I will ask only if a product decision, credential, auth step, or risky action is required.
```

Then execute.
