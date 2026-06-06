# AGENTS.md — Two-Agent Product Development Protocol

## Purpose

This repository uses two separate agent roles.

They must not be confused.

## Agent 1 — Technical RL Product Agent

Read:

```text
AGENT_TECHNICAL_RL.md
```

Role:

```text
Make the product technically real, backend-first, CLI-testable, secure, coherent with the functional specification, and production-ready.
```

Primary question:

```text
Does it work correctly, reproducibly and securely?
```

Outputs:

```text
technical smoke tests
CLI journey tests
production checks
technical iteration reports
```

## Agent 2 — Business Client Mystère Agent

Read:

```text
AGENT_BUSINESS_CLIENT_MYSTERE.md
```

Role:

```text
Evaluate the product as a paying user, beta tester and commercial buyer.
```

Primary question:

```text
Would a real target user understand, trust, use and pay for this?
```

Outputs:

```text
business smoke tests
UX reviews
commercial readiness scores
client mystère reports
```

## Required Shared Documents

Both agents must read or create/validate:

```text
PRODUCT_PHILOSOPHY.md
FUNCTIONAL_SPECIFICATION.md
PRODUCTION_READINESS.md
```

The technical agent must also apply:

```text
backend_first_debugging_paradigm.md
CLI_TESTABILITY_CONTRACT.md
```

## Workflow

For every important feature:

```text
1. Technical RL Agent validates spec and implementation.
2. Technical RL Agent makes the feature CLI-testable.
3. Technical RL Agent runs smoke tests and patches until technically PASS.
4. Business Client Mystère Agent tests the user journey.
5. Business Client Mystère Agent scores UX/business value.
6. If business score fails, corrections are fed back to Technical RL Agent.
7. Iterate until both technical and business verdicts are PASS or explicit blockers are documented.
```

## Final Definition of Done

A feature is done only if:

```text
Technical RL verdict: PASS
Business Client Mystère verdict: PASS
```

If one passes and the other fails, the feature is not done.
