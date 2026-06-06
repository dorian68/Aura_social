# JON / Browser-Automation Chrome Extension — integration requirements

> **Status: NOT PRESENT in this repo.** A full scan (`app/`, `lib/`, `scripts/`,
> `components/`) found no JON module, no browser-automation code, no
> `manifest.json`, no Puppeteer/Playwright/CDP usage, and no extension folder.
> This document specifies what to build **if/when** that capability is added, so
> Aura is ready for it without rework. Nothing here is wired yet — Aura is
> unaffected.

## Goal
Let an operator download and install a Chrome extension that lets JON automate a
browser, with a secure, auditable bridge between the extension and the Aura
backend.

## 1. Packaging
Add (only once the extension source exists under e.g. `browser-extension/`):

```jsonc
// package.json scripts
"build:chrome-extension":   "<bundler> build browser-extension",
"package:chrome-extension": "node scripts/package-chrome-extension.mjs"
```

`package:chrome-extension` zips the built extension to:

```
dist/jon-chrome-extension.zip
```

The zip must contain a valid MV3 `manifest.json`, background service worker,
content script(s) and icons.

## 2. Download endpoint (protected)
```
GET /api/browser-extension/download   → application/zip (dist/jon-chrome-extension.zip)
```
Must go through the **same auth gate as the other sensitive routes**
(`middleware.ts` already protects `/api/**` except the public allow-list — add
`/api/browser-extension` to the protected set, or rely on the default-protected
behaviour). Return 404 with the standard envelope if the zip hasn't been built.

## 3. Install UI (Settings → Browser Automation)
Surface:
- **Download Chrome Extension** button (calls the endpoint with the API token).
- Installation steps (below).
- **Connection status**, **last heartbeat**, **extension version**.
- Troubleshooting + a "test connection" action.

Installation steps shown to the user:
```
1. Download the ZIP
2. Unzip it
3. Open chrome://extensions
4. Enable Developer Mode (top right)
5. Click "Load unpacked"
6. Select the unzipped extension folder
7. Return to Aura → Settings → Browser Automation → check "Connected"
```

## 4. Bridge security (mandatory if the extension talks to Aura)
- **Signed/tokenised handshake**: extension authenticates with a per-install
  token issued by Aura (never hard-coded).
- Identifiers on every message: `connectionId`, `commandId`, `tabSessionId`
  bound to the connection.
- **Non-spoofable results**: results must reference a `commandId` the server
  actually issued; reject unknown/expired `commandId`s.
- **Command expiry**: commands have a TTL; stale results are dropped.
- **Audit log**: every command + result recorded via `recordAuditEvent`.
- Principle of least privilege in `manifest.json` permissions/host_permissions.

## 5. Smoke test
```
npm run smoke:chrome-extension
```
Should verify: build produces a valid zip with an MV3 manifest; the download
endpoint is auth-gated (401 without token, 200 with); and (if the bridge exists)
a handshake + a single round-trip command/result with a valid `commandId`
succeeds while an unknown `commandId` is rejected.

---
When the JON module lands, implement the above and remove the "NOT PRESENT"
banner. Until then, Aura ships without any browser-automation surface.
