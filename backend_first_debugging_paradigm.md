# Backend-First Debugging Paradigm for Codex / Claude Code

## Purpose

When developing a feature that depends on an external API, OAuth flow, database, webhook, payment provider, blockchain provider, or any third-party integration, do **not** debug primarily from the frontend UI.

The frontend is only the last layer.

The correct workflow is:

```text
Backend/API flow first
→ CLI/debug script
→ structured logs
→ exact failure point
→ backend validated
→ then connect frontend UI
```

This document should be used as persistent context for Codex / Claude Code during development.

---

## Core Rule

Do not diagnose backend or integration issues only from UI error messages.

Instead:

1. Inspect the backend flow.
2. Create or use a CLI/debug script.
3. Run the integration step by step.
4. Log every important API response.
5. Ask the user only when a human authentication step is required.
6. Analyze the raw outputs.
7. Fix the backend until the flow works independently.
8. Only then reconnect the frontend.

---

## Developer Behavior Expected

When I report an error coming from the UI, do not immediately patch the UI.

First determine whether the error comes from:

- authentication
- missing permissions/scopes
- wrong user/account
- incorrect backend parsing
- failed API call
- missing environment variable
- expired token
- wrong resource ownership
- wrong API endpoint
- rate limit
- database state issue
- frontend/backend mismatch

Then validate the backend flow directly.

---

## Authorization Rule

You should execute commands and debugging steps directly.

Only ask me for input when:

- I must authenticate in a browser
- I must approve an OAuth consent screen
- I must provide a missing credential
- I must manually configure something in an external dashboard
- an action is destructive or risky

Do **not** ask me for validation before every safe command.

---

## Required Debugging Workflow

For any backend/API feature, follow this sequence:

```text
1. Understand the intended flow
2. Inspect the current implementation
3. Identify all required environment variables
4. Verify local configuration
5. Add structured logs if missing
6. Create a CLI/debug script if none exists
7. Run the flow independently from the UI
8. Collect raw outputs
9. Identify the exact failing step
10. Fix the backend
11. Re-run the CLI flow
12. Confirm success
13. Only then connect or patch the frontend
```

---

## CLI-First Testing Standard

Every non-trivial integration should have a script such as:

```bash
npm run debug:meta-flow
npm run debug:auth-flow
npm run debug:webhook
npm run debug:provider
npm run debug:backend
```

or:

```bash
node scripts/debug-meta-flow.mjs
node scripts/debug-auth-flow.mjs
node scripts/debug-provider.mjs
```

The script should be able to test the backend logic without relying on the frontend.

---

## Logging Requirements

Use structured logs.

Each important step should show:

```text
[STEP 1] What is being tested
[STATUS] success / fail / skipped
[REQUEST] endpoint or operation
[INPUT] sanitized parameters
[OUTPUT] relevant response summary
[ERROR] raw error code/message if any
[NEXT] what this implies
```

Logs should make it easy to produce a diagnosis like:

```text
Step 1: Token received ✅
Step 2: Token valid ✅
Step 3: Required scopes missing ❌
Step 4: /me/accounts returned 0 pages ❌
Final diagnosis: the authenticated user does not manage any Facebook Page accessible with the current token.
```

---

## Security Rules for Logs

Never print secrets in full.

Mask sensitive values:

```text
access_token: EAAB...xYz
refresh_token: rt_...9K
client_secret: sk_...abc
api_key: pk_...def
```

Never expose:

- full access tokens
- refresh tokens
- app secrets
- private keys
- database passwords
- production credentials
- wallet private keys
- seed phrases

If a token or secret must be checked, log only:

- presence: yes/no
- first 4 characters
- last 4 characters
- length
- expiration date if available
- scopes/permissions if available

---

## Error Handling Standard

When an error occurs, return or log a structured error:

```json
{
  "success": false,
  "step": "fetch_user_pages",
  "error": {
    "code": "MISSING_PERMISSION",
    "message": "pages_show_list permission is missing",
    "rawProviderMessage": "...",
    "possibleCauses": [
      "User did not grant permission",
      "App is still in development mode",
      "User is not an app tester/admin",
      "Permission has not been approved by the provider"
    ],
    "nextActions": [
      "Re-authenticate with the required scopes",
      "Check app dashboard roles",
      "Verify that the user manages a Facebook Page"
    ]
  }
}
```

---

## Frontend Rule

The frontend should not be the source of truth for backend debugging.

Frontend error messages should be treated as symptoms.

The backend debug script should determine the real cause.

Do not spend time styling, rewriting, or patching UI states until the backend flow is independently validated.

---

## Backend Validation Criteria

A backend flow is considered valid only when:

- the CLI/debug script runs successfully
- all required API calls return expected data
- edge cases are handled
- errors are explicit and actionable
- logs show the exact flow
- the backend returns normalized data ready for the frontend

Only after this should the frontend be connected.

---

## Example: Meta / Instagram Flow

For Meta / Instagram integrations, do not debug from the UI message alone.

If the UI says:

```text
No connected Instagram Business or Creator accounts were found for this Facebook user.
Make sure the Instagram account is professional and linked to a Facebook Page you manage.
```

Validate the backend flow directly.

Required CLI flow:

```text
1. Check environment variables
2. Start OAuth/login flow if needed
3. Receive short-lived Facebook User Access Token
4. Inspect token validity
5. Inspect granted scopes
6. Exchange short-lived token for long-lived token
7. Call /me
8. Call /me/accounts
9. List all Facebook Pages returned
10. For each Page, call /{page-id}?fields=instagram_business_account
11. Detect linked Instagram Business/Creator account
12. Fetch Instagram account details
13. Fetch media if allowed
14. Fetch insights if permissions allow
15. Return final diagnosis
```

Expected output example:

```text
[1] Environment variables ✅
[2] User token received ✅
[3] Token scopes ✅ instagram_basic, pages_show_list, pages_read_engagement
[4] /me ✅ User found
[5] /me/accounts ❌ returned 0 pages

Diagnosis:
The user authenticated successfully, but Meta returned no managed Facebook Pages.
The Instagram account cannot be discovered because Instagram Business/Creator accounts must be linked to a Facebook Page managed by this user.

Likely causes:
- Wrong Facebook account used
- User is not admin of the linked Page
- App is in development mode and user is not a tester/admin
- pages_show_list was not granted
```

---

## Example: Webhook Flow

For webhooks:

```text
1. Verify environment variables
2. Verify webhook URL
3. Verify webhook secret
4. Send a local test payload
5. Validate signature
6. Log parsed body
7. Execute handler
8. Check database mutation
9. Return normalized success/failure
```

Do not rely only on frontend state to know whether the webhook worked.

---

## Example: Payment Flow

For Stripe or other payment providers:

```text
1. Create test checkout session from CLI
2. Log session ID and payment URL
3. Complete test payment manually if required
4. Inspect webhook event
5. Validate signature
6. Confirm backend database update
7. Confirm entitlement/subscription activation
8. Then connect UI
```

---

## Example: Database Flow

For database features:

```text
1. Validate env variables
2. Test connection
3. Test read query
4. Test write query
5. Test update query
6. Test permissions/RLS
7. Test expected frontend query
8. Return normalized data shape
9. Then connect UI
```

---

## Expected Codex / Claude Code Behavior

When given an error, respond with:

```text
I will debug this backend-first.

Plan:
1. Inspect the relevant backend files.
2. Identify the exact API/database/auth flow.
3. Add structured logs if needed.
4. Create or run a CLI debug script.
5. Ask you only if authentication is required.
6. Analyze raw outputs.
7. Fix the backend.
8. Re-run the flow.
9. Connect the frontend only after backend validation.
```

Then execute.

---

## Anti-Patterns to Avoid

Do not:

- patch UI text before understanding backend failure
- guess based only on frontend error messages
- ask the user to manually copy/paste every error repeatedly
- hide provider raw errors
- silently swallow exceptions
- log full secrets
- modify unrelated parts of the app
- rewrite the whole architecture without need
- rely on mock data when testing a real integration
- connect frontend before backend is proven

---

## Preferred Development Philosophy

The backend should be treated like an engine.

The frontend is just the dashboard.

If the engine is not validated, the dashboard cannot be trusted.

For every integration:

```text
Make the backend observable.
Make the flow reproducible.
Make the failure point explicit.
Make the fix verifiable.
Only then make the UI beautiful.
```

---

## Short Instruction to Use in Prompts

Use this shorter version when needed:

```text
Debug backend-first, not UI-first.
Create or use CLI scripts to test the full flow independently.
Add structured logs.
Ask me only for human authentication or credentials.
Analyze raw outputs and identify the exact failing step.
Fix and validate the backend before touching the frontend.
Never log secrets in full.
```
