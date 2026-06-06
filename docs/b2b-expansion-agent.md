# Aura B2B Expansion Agent

The B2B Expansion Agent is a mock-first growth loop for Aura:

```text
creator community -> loyalty points -> local partner campaigns -> sponsored rewards -> platform revenue
```

## Current MVP

- Mock Google Places-like discovery only.
- No scraping.
- No real Google Places API call.
- No real email, Instagram DM, CRM export, Stripe payment or invoice.
- Outreach drafts require creator approval and are not sent.
- SME payments are simulated.

## Debug Workflow

Run:

```bash
npm run debug:b2b-agent
```

The script:

1. Loads the demo creator and loyalty stats.
2. Discovers mock businesses in Fort-de-France.
3. Scores each business.
4. Generates a campaign opportunity.
5. Generates a B2B pitch.
6. Simulates a 200 EUR SME payment.
7. Splits the budget into 70% fan rewards and 30% Aura commission.

## API Routes

- `GET /api/b2b-agent/demo`
- `POST /api/b2b-agent/discover`
- `POST /api/b2b-agent/score`
- `POST /api/b2b-agent/opportunity`
- `POST /api/b2b-agent/pitch`
- `POST /api/b2b-agent/run`
- `POST /api/b2b-agent/simulate-payment`
- `GET /api/b2b-agent/runs`
- `GET /api/b2b-agent/opportunities`

Responses use:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

## Future Real Integrations

- Google Places: replace `mockGooglePlacesProvider.ts` with a provider using `GOOGLE_PLACES_API_KEY`.
- Stripe: replace `paymentSimulator.ts` with checkout/payment intent creation.
- CRM/email: add explicit approval state before sending any message.
- Campaign tracking: connect redemptions to the loyalty ledger and partner reporting.

Never log API keys or full payment/customer secrets.
