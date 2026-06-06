# Aura — Docker deployment

Containerized setup to run Aura on a VPS in **development mode**, and a clean
base for staging/production.

- **App** (Next.js — API + pages): `Dockerfile.dev` (dev) / `Dockerfile` (prod), port `PORT` (default `3000`).
- **Web** (static `Frontend_Aura` product UI): port `WEB_PORT` (default `8080`).
- **No external services required**: persistence is local JSON; Meta/Instagram, B2B, payments and blockchain are all mock-able and OFF by default.

---

## 1. Local Docker (dev)

```bash
cp .env.example .env          # mock-safe defaults — works with no credentials
docker compose up --build
```

Then open:

- App / API:  `http://localhost:3000`  (e.g. `http://localhost:3000/api/system/health`, `/integrations`, `/dashboard`)
- Product UI: `http://localhost:8080`  (the `Frontend_Aura` landing + product pages)

Code is bind-mounted → **hot reload** on save. `node_modules` and `.next` live in
anonymous volumes so Linux deps aren't shadowed by host (Windows) ones.

> Port already used on your host? Set a different one in `.env`, e.g. `PORT=3100`,
> then `docker compose up`.

---

## 2. Deploy on a VPS

```bash
git clone <your-repo-url>
cd <repo>
cp .env.example .env
nano .env                     # keep MOCK_META=true to start; set FRONTEND_URL to your domain
docker compose up -d --build
docker compose logs -f app
```

Open firewall ports `3000` (app) and `8080` (web) — or, recommended for prod,
put a reverse proxy (Caddy/Nginx/Traefik) in front and expose only `443`.

**Static UI note:** `Frontend_Aura` talks to the API via `window.AURA_API_BASE`
(default `http://localhost:3000`, see `Frontend_Aura/js/aura-api.js`). On a VPS,
set it to your public API URL (or front both behind one domain via a proxy).

### Rebuild

```bash
docker compose down
docker compose up -d --build
```

> **After changing dependencies** (`package.json`/lockfile), also renew the
> anonymous `node_modules` volume, otherwise the container keeps the old deps:
>
> ```bash
> docker compose up -d --build --force-recreate --renew-anon-volumes
> ```

### Logs / shell

```bash
docker compose logs -f app
docker compose exec app sh
```

---

## 3. Validation & debug inside the container

```bash
docker compose exec app npm run typecheck
docker compose exec app npm run lint
docker compose exec app npm run build
docker compose exec app npm run smoke:platform        # SMOKE_BASE_URL defaults to :3000 via .env
docker compose exec app npm run debug:workspace
docker compose exec app npm run debug:loyalty
docker compose exec app npm run debug:token-economy
docker compose exec app npm run debug:agent
docker compose exec app npm run debug:b2b-agent
docker compose exec app npm run debug:operator
docker compose exec app npm run debug:tools
docker compose exec app npm run debug:contracts
```

Quick container health check (from the host):

```bash
npm run docker:smoke          # checks health, key routes, mock-safe, web UI
```

---

## 4. Mock mode (no external dependencies)

The defaults in `.env.example` keep everything simulated:

```env
MOCK_META=true
AGENT_MODE=rules
OPERATOR_MODE=rules
OUTREACH_SENDING_ENABLED=false
AURA_ALLOW_ONCHAIN_WRITES=false
AURA_ALLOW_REAL_PAYMENTS=false
```

To go live with real Instagram, set `MOCK_META=false` and fill `APP_ID` /
`APP_SECRET`, then connect an account (see the in-app dashboard). Keep the
`*_ALLOW_*` / `OUTREACH_SENDING_ENABLED` gates OFF unless you intend real
side effects.

---

## 5. Production / staging image

`Dockerfile` is a multi-stage build (`npm ci` → `next build` → `next start`):

```bash
docker build -t aura:prod .
docker run -p 3000:3000 --env-file .env -e NODE_ENV=production aura:prod
```

The runner serves with `next start -H 0.0.0.0` on `PORT`.

---

## 6. Important environment variables

| Variable | Purpose | Dev default |
|---|---|---|
| `PORT` / `WEB_PORT` | App / static UI ports | `3000` / `8080` |
| `FRONTEND_URL` | Public app URL (OAuth redirects) | `http://localhost:3000` |
| `MOCK_META` | Simulate all Meta/Instagram calls | `true` |
| `AGENT_MODE` / `OPERATOR_MODE` | `rules` = no LLM | `rules` |
| `APP_ID` / `APP_SECRET` | Meta app creds (only if `MOCK_META=false`) | empty |
| `META_AUTH_MODE` | `instagram` (own account) / `facebook` (creator search) | `instagram` |
| `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_IG_USER_ID` | Business Discovery source | empty |
| `AURA_PERSISTENCE` | `local` (JSON files) / `memory` | `local` |
| `AURA_ALLOW_ONCHAIN_WRITES` / `OUTREACH_SENDING_ENABLED` / `AURA_ALLOW_REAL_PAYMENTS` | Real side-effect gates | `false` |

Full list with comments: `.env.example`. Never bake secrets into the image,
compose file or docs — they belong only in your (gitignored) `.env`.

---

## 7. What's left for staging/production

- **HTTPS + stable domain** (reverse proxy) instead of raw ports.
- **Persistent volume** for `data/` (loyalty/B2B state, Meta logs) so it survives `docker compose down`.
- **Database** if/when multi-tenant: today state is local JSON, single-instance.
- **User auth** + per-tenant isolation (not present yet).
- **Image slimming**: `output: 'standalone'` or promoting `ethers` to a runtime dependency (currently the runner keeps full `node_modules`).
- **Meta App Review** for public (non-tester) Instagram onboarding.
- **Secrets manager** instead of `.env` on disk.

## 8. Current limits / risks

- In-memory connection store & local JSON state → **data resets on container recreate** unless you add a volume for `data/`.
- The `web` service serves the static UI but its `AURA_API_BASE` is build-time JS; cross-origin/API base must be configured for your domain.
- No HTTPS by default → don't expose raw ports publicly without a proxy.
