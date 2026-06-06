# Instagram Analytics Prototype

Lightweight Instagram analytics prototype using only official Meta Graph API endpoints.

The product has two flows:

- Public estimator: a visitor enters a public Instagram username and gets a lightweight engagement estimate from Meta Business Discovery.
- Private insights unlock: the account owner connects through official Instagram Login and unlocks media reach, impressions, saves, diagnostics, and rule-based recommendations.

No scraping, unofficial APIs, or password collection are used.

## Install

```bash
cd instagram-analytics-prototype
npm install
```

## Configure

For local prototyping, you can avoid creating a `.env` file:

1. Run the app.
2. Open the browser.
3. Click "Configure Meta Login".
4. Paste the Instagram App ID and Instagram App Secret from `Instagram > API setup with Instagram login`.
5. Click "Unlock Deep Insights" and log in through Instagram Login.
6. Select one connected Instagram Business/Creator account if Meta returns multiple accounts.

That creates the long-lived token through the official Meta OAuth exchange and stores it only in backend memory for the current server session.
For local development convenience, the setup saves the Meta App ID, App Secret, auth mode, Graph version, and frontend URL in `data/instagram/runtime-config.local.json` so you do not have to retype them after every server restart. That file is ignored by Git in this workspace. For production, use environment variables or a secret manager instead.

For production or a stable local setup, copy `.env.example` to `.env` and fill in your values:

```bash
PORT=3000
APP_ID=your_meta_app_id
APP_SECRET=your_meta_app_secret
GRAPH_API_VERSION=v23.0
META_AUTH_MODE=instagram
MY_INSTAGRAM_BUSINESS_ID=17841400000000000
MY_LONG_LIVED_ACCESS_TOKEN=EAAB...
FRONTEND_URL=http://localhost:3000
MOCK_META=false
```

Meta does not allow a website to create a Meta app automatically. A real SaaS owner creates and verifies the Meta app once; visitors and creators only use the Instagram Login window.

## How to get APP_ID and APP_SECRET

1. Go to `https://developers.facebook.com/apps/`.
2. Create a Meta app for your SaaS platform.
3. For Instagram Login direct, go to `Instagram > API setup with Instagram login` and copy:
   - `Instagram App ID` into `APP_ID`
   - `Instagram App Secret` into `APP_SECRET`
4. For Facebook Login for Business, use `App settings > Basic`:
   - `App ID` into `APP_ID`
   - `App Secret` into `APP_SECRET`
5. If using Facebook Login for Business, open `Facebook Login for Business > Configurations`, create a configuration, and copy its `Configuration ID` into `FACEBOOK_LOGIN_CONFIG_ID`.
6. Put the Instagram/Page permissions inside that Business Login configuration. Do not pass `instagram_basic` or `instagram_manage_insights` directly in the OAuth URL; Meta will return `Invalid Scopes`.
7. Add your app domain in `App domains`.
8. Add a Website platform and set the Site URL:
   - local: `http://localhost:3168`
   - production: `https://your-domain.com`
9. In OAuth settings, add the exact callback URL for the mode you use:
   - local/tunnel: `https://your-public-domain/api/auth/instagram/callback`
   - production: `https://your-domain.com/api/auth/instagram/callback`
   - Facebook Login for Business local/tunnel: `https://your-public-domain/api/auth/facebook/callback`
   - Facebook Login for Business production: `https://your-domain.com/api/auth/facebook/callback`
10. Request and submit App Review for the permissions your production app needs.
   For Instagram Login direct:
   - `instagram_business_basic`
   - `instagram_business_manage_insights`

If Instagram opens a page saying the content is not available, verify that the credential in `APP_ID` is the Instagram App ID from the Instagram Login setup, not the generic Meta app ID. Also confirm the Instagram account is Business or Creator, the redirect URI matches exactly, and the account has access to the app while it is in development mode.

`APP_SECRET` must never be sent to the frontend. This prototype keeps it server-side and uses `/api/auth/meta/start` plus `/api/auth/instagram/callback` for the recommended Instagram Login OAuth flow.

Facebook Login for Business is available by setting `META_AUTH_MODE=facebook`. It requires a `FACEBOOK_LOGIN_CONFIG_ID`; permissions are managed by that Meta configuration rather than by `scope=` query parameters.

### Meta app requirements

For public estimates, the backend uses Business Discovery from an Instagram Business/Creator account you control:

```text
/{MY_INSTAGRAM_BUSINESS_ID}?fields=business_discovery.username({username}){...}
```

For private insights, the recommended frontend flow uses Instagram Login and requests:

- `instagram_business_basic`
- `instagram_business_manage_insights`

The backend then:

1. Exchanges the Instagram authorization code for a short-lived Instagram token.
2. Exchanges that token for a long-lived Instagram token.
3. Stores the long-lived token only in memory for the prototype session.
4. Fetches `/me/media` and `/media-id/insights` through `graph.instagram.com`.

Facebook Login for Business mode is available with `META_AUTH_MODE=facebook`. In Meta Developers, create a Business Login configuration that includes the permissions needed to list Pages and read the linked Instagram professional account, typically:

- `instagram_basic`
- `instagram_manage_insights`
- `pages_show_list`
- `pages_read_engagement`

The OAuth URL uses `config_id`, not direct `scope` parameters. In this mode, the backend then:

1. Exchanges the short-lived User Access Token for a long-lived User Access Token.
2. Reads `/me/accounts`.
3. Reads each Page's linked `instagram_business_account`.
4. Stores the long-lived token only in memory for the prototype session.
5. Fetches `/ig-user-id/media` and `/media-id/insights`.

The app uses a safer `connectionId` for the browser-to-backend private insights request. The requested `accessToken` query parameter is still accepted by the backend for compatibility, but the frontend does not expose long-lived tokens.

## Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Production-style start:

```bash
npm start
```

## Diagnostics and logs

The prototype writes redacted structured logs to:

```text
data/instagram/logs/prototype.ndjson
```

The logs include backend API requests, OAuth redirects, OAuth callbacks, frontend events, popup timeouts, Meta errors, and private insights loading. Tokens, app secrets, OAuth codes, cookies, and state values are redacted.

Read the last 200 log entries:

```powershell
Invoke-RestMethod http://localhost:3168/api/debug/logs?lines=200 | ConvertTo-Json -Depth 8
```

Follow the log file live while testing:

```powershell
Get-Content C:\Users\Labry\Documents\Blockchain\data\instagram\logs\prototype.ndjson -Wait
```

Useful events to look for:

- `oauth.instagram.redirect`: the app generated the Instagram authorization URL.
- `oauth.instagram.callback.received`: Instagram returned to the backend callback.
- `oauth.instagram.callback.failed`: the callback happened but token/profile exchange failed.
- `oauth.popup.timeout` or `oauth.popup.closed_without_callback`: the browser never received a callback message.
- `private_insights.started` and `private_insights.succeeded`: the dashboard data request ran.

## Mock mode

Set this only when you want clearly separated fake data for local UI testing:

```bash
MOCK_META=true
```

The UI displays a "Mock mode" badge and API responses include `"mock": true`.

## Known limitations

- Business Discovery only works for public Instagram professional accounts that Meta allows the connected app to discover.
- Personal Instagram accounts, private accounts, restricted accounts, or unsupported professional accounts may return a clean unavailable-account error.
- Private insights require the Instagram account to be Business/Creator and linked to a Facebook Page that the logged-in user can access.
- Meta can deny individual media metrics depending on media type, API version, token permissions, age of data, or platform limitations.
- Rate limits and expired tokens are handled with structured errors, but production retry queues and token refresh jobs are not included.
- Tokens are stored only in memory. Add encrypted database storage before production.
- The local runtime setup assistant is disabled in production unless `ALLOW_RUNTIME_SETUP=true`.

## Data returned

### Public estimator

- Followers and media count
- Latest 12 public media objects
- Average likes, comments, interactions, engagement rate
- Best and worst posts by public engagement
- Engagement distribution
- Posting frequency estimate
- Content type breakdown
- Caption length diagnostics
- Public Score from engagement, consistency, volume, and comment-to-like ratio

### Private insights

- Latest 10 media objects
- Per-media `impressions`, `reach`, and `saved` where available
- Total and average reach, impressions, saves
- Save rate, reach rate, impression-to-reach ratio
- Best posts by reach, saves, and save rate
- Underperforming posts
- Deterministic recommendations and a 5-step action plan

## Error shape

All API errors return:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Readable message",
    "details": "Optional details"
  }
}
```
