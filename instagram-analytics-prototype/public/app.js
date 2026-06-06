const AUTH_MODE_DETAILS = {
  instagram: {
    label: "Instagram Login",
    buttonLabel: "Continue with Instagram",
    logoutUrl: "https://www.instagram.com/accounts/logout/",
    permissions: ["instagram_business_basic", "instagram_business_manage_insights"],
    privateCopy:
      "The creator logs in with Instagram. The backend exchanges the authorization code for a long-lived Instagram token and keeps it server-side.",
    discoveryCopy:
      "Choose an Instagram Business or Creator account. It can unlock private insights for that account; public username discovery may still require the Facebook Page flow depending on Meta availability.",
  },
  facebook: {
    label: "Facebook Login for Business",
    buttonLabel: "Continue with Facebook",
    permissions: [
      "instagram_basic",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
    ],
    privateCopy:
      "The creator logs in through Facebook Login for Business. The backend finds the Facebook Pages they manage, detects linked Instagram Business or Creator accounts, then keeps the token server-side.",
    discoveryCopy:
      "Choose a Facebook Page-linked Instagram Business or Creator account that the platform can use for Meta Business Discovery.",
  },
};

const state = {
  config: null,
  connectionId: null,
  accounts: [],
  modalMode: "private",
  clientSessionId: getClientSessionId(),
  oauthInProgress: false,
  oauthPopup: null,
  oauthTimer: null,
  popupCheckTimer: null,
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  [
    "estimateForm",
    "usernameInput",
    "analyzeButton",
    "errorBox",
    "loadingBox",
    "setupNotice",
    "publicResults",
    "unlockCta",
    "unlockButton",
    "accountPicker",
    "privateDashboard",
    "mockBadge",
    "metaSetupButton",
    "connectModal",
    "modalBody",
    "closeModalButton",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });

  els.estimateForm.addEventListener("submit", handlePublicEstimate);
  els.unlockButton.addEventListener("click", () => openConnectModal("private"));
  els.metaSetupButton.addEventListener("click", () => openConnectModal("setup"));
  els.closeModalButton.addEventListener("click", closeConnectModal);
  els.connectModal.addEventListener("click", (event) => {
    if (event.target === els.connectModal) closeConnectModal();
  });
  window.addEventListener("message", handleOAuthMessage);

  logClientEvent("app.loaded", {
    userAgent: navigator.userAgent,
    language: navigator.language,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  });
  await loadConfig();
});

async function loadConfig() {
  try {
    const response = await apiGet("/api/config");
    state.config = response.data;

    els.mockBadge.classList.toggle("hidden", !state.config.mockMeta);

    renderSetupNotice();
    logClientEvent("config.loaded", {
      mockMeta: state.config.mockMeta,
      authMode: state.config.setup?.authMode,
      hasAppId: state.config.setup?.hasAppId,
      hasAppSecret: state.config.setup?.hasAppSecret,
      publicDiscoveryConfigured: state.config.setup?.publicDiscoveryConfigured,
      frontendUrl: state.config.frontendUrl,
      instagramCallbackUrl: state.config.instagramCallbackUrl,
    });
  } catch (error) {
    logClientEvent("config.failed", { message: error.message, details: error.details }, "error");
    showError(error.message);
  }
}

async function handlePublicEstimate(event) {
  event.preventDefault();
  clearError();
  setPublicLoading(true);
  els.privateDashboard.classList.add("hidden");
  els.accountPicker.classList.add("hidden");

  const username = els.usernameInput.value.trim();
  logClientEvent("public_estimate.submitted", { username });

  try {
    const response = await apiGet(`/api/public-estimate?username=${encodeURIComponent(username)}`);
    renderPublicResults(response.data, response.mock);
    logClientEvent("public_estimate.succeeded", {
      username: response.data.profile.username,
      analyzedPosts: response.data.analyzed_posts_count,
      publicScore: response.data.public_score?.score,
    });
  } catch (error) {
    els.publicResults.classList.add("hidden");
    logClientEvent(
      "public_estimate.failed",
      { username, code: error.code, message: error.message, details: error.details },
      "error",
    );
    showError(error.message, error.details);
  } finally {
    setPublicLoading(false);
  }
}

function renderSetupNotice() {
  const setup = state.config?.setup;
  if (!setup) {
    els.setupNotice.classList.add("hidden");
    return;
  }

  if (setup.mockMeta) {
    els.setupNotice.innerHTML = `
      <strong>Mock mode is active.</strong>
      <p>
        You are seeing demo data. To connect the real Meta Graph API, open Meta setup and enter
        the platform App ID and App Secret, then connect a Business or Creator source account.
      </p>
      <div class="setup-actions">
        <button class="accent-button" type="button" id="openSetupButton">Configure Meta Login</button>
      </div>
    `;
    els.setupNotice.classList.remove("hidden");
    document.getElementById("openSetupButton").addEventListener("click", () => openConnectModal("setup"));
    return;
  }

  if (!setup.facebookLoginConfigured) {
    els.setupNotice.innerHTML = `
      <strong>Meta Login is not configured yet.</strong>
      <p>
        Visitors should not create Meta apps. For this local prototype, configure the platform once
        from the interface instead of editing a .env file.
      </p>
      <div class="setup-actions">
        <button class="accent-button" type="button" id="openSetupButton">Configure Meta Login</button>
      </div>
    `;
    els.setupNotice.classList.remove("hidden");
    document.getElementById("openSetupButton").addEventListener("click", () => openConnectModal("setup"));
    return;
  }

  if (!setup.publicDiscoveryConfigured) {
    els.setupNotice.innerHTML = `
      <strong>Public username estimates need a connected source account.</strong>
      <p>
        Connect one Instagram Business or Creator account once. The backend will create the official
        long-lived token and use that account for Business Discovery.
      </p>
      <div class="setup-actions">
        <button class="accent-button" type="button" id="openDiscoverySetupButton">Connect source account</button>
      </div>
    `;
    els.setupNotice.classList.remove("hidden");
    document
      .getElementById("openDiscoverySetupButton")
      .addEventListener("click", () => openConnectModal("discovery"));
    return;
  }

  els.setupNotice.innerHTML = `
    <strong>Meta is configured.</strong>
    <p>
      Public estimates use @${escapeHtml(
        setup.discoverySourceUsername || "your connected source account",
      )} as the official Business Discovery source.
    </p>
  `;
  els.setupNotice.classList.remove("hidden");
}

function openConnectModal(mode = "private") {
  clearError();
  state.modalMode = mode;
  logClientEvent("modal.opened", {
    mode,
    authMode: state.config?.setup?.authMode,
    configured: state.config?.setup?.facebookLoginConfigured,
  });
  renderConnectModal();
  els.connectModal.classList.remove("hidden");
}

function closeConnectModal() {
  logClientEvent("modal.closed", { mode: state.modalMode });
  els.connectModal.classList.add("hidden");
  els.modalBody.innerHTML = "";
}

function renderConnectModal() {
  const setup = state.config?.setup || {};
  const authDetails = getAuthModeDetails();

  if (state.modalMode === "setup") {
    renderRuntimeSetupForm(setup);
    return;
  }

  if (!setup.facebookLoginConfigured && !state.config?.mockMeta) {
    renderRuntimeSetupForm(setup);
    return;
  }

  const title =
    state.modalMode === "discovery"
      ? "Connect a source account for public estimates"
      : "Unlock Deep Insights with Meta";

  const copy =
    state.modalMode === "discovery"
      ? authDetails.discoveryCopy
      : authDetails.privateCopy;

  els.modalBody.innerHTML = `
    <p class="eyebrow">Official Meta authentication</p>
    <h2 id="modalTitle" class="modal-title">${escapeHtml(title)}</h2>
    <p class="modal-text">${escapeHtml(copy)}</p>
    <p class="modal-text"><strong>Mode:</strong> ${escapeHtml(authDetails.label)}</p>
    ${
      authDetails.logoutUrl
        ? `<p class="modal-text">
            If Instagram keeps opening the wrong account, log out of Instagram first, then continue again.
          </p>`
        : ""
    }
    <div class="permission-grid">
      ${authDetails.permissions.map((permission) => `<div class="permission-item">${escapeHtml(permission)}</div>`).join("")}
    </div>
    <div class="modal-actions">
      <button class="accent-button" type="button" id="continueMetaButton">${escapeHtml(authDetails.buttonLabel)}</button>
      ${
        authDetails.logoutUrl
          ? `<button class="ghost-button" type="button" id="instagramLogoutButton">Log out of Instagram</button>`
          : ""
      }
      <button class="ghost-button" type="button" id="cancelMetaButton">Cancel</button>
    </div>
  `;

  document.getElementById("continueMetaButton").addEventListener("click", startMetaLogin);
  document.getElementById("instagramLogoutButton")?.addEventListener("click", openInstagramLogout);
  document.getElementById("cancelMetaButton").addEventListener("click", closeConnectModal);
}

function renderRuntimeSetupForm(setup) {
  const authMode = setup.authMode || "instagram";
  const isInstagramMode = authMode === "instagram";
  const appIdLabel = isInstagramMode ? "Instagram App ID" : "Meta App ID";
  const appSecretLabel = isInstagramMode ? "Instagram App Secret" : "Meta App Secret";
  const credentialNote = isInstagramMode
    ? "For Instagram Login, use the credentials from Instagram > API setup with Instagram login. Using the generic App settings > Basic App ID can make Instagram show a broken or unavailable page."
    : "For Facebook Login for Business, use the app credentials from App settings > Basic, then create a Business Login configuration. The OAuth URL must use config_id; direct scope parameters cause Meta's Invalid Scopes error.";

  if (!setup.runtimeSetupAvailable) {
    els.modalBody.innerHTML = `
      <p class="eyebrow">Platform setup required</p>
      <h2 id="modalTitle" class="modal-title">Meta Login is not available</h2>
      <p class="modal-text">
        This production server must be configured by the platform owner with APP_ID and APP_SECRET
        through environment variables or a secret manager.
      </p>
    `;
    return;
  }

  els.modalBody.innerHTML = `
    <p class="eyebrow">Local prototype setup</p>
    <h2 id="modalTitle" class="modal-title">Configure Meta Login without editing .env</h2>
    <p class="modal-text">
      Meta does not let a website create a Meta app automatically. For this local prototype, paste
      the platform App ID and App Secret once. They are saved in a local development file and are
      never returned to the browser.
    </p>
    <div class="warning-note">
      ${escapeHtml(credentialNote)}
    </div>
    ${isLocalhostBaseUrl() ? `
      <div class="warning-note">
        Meta usually rejects <strong>localhost</strong> in App Domains because it expects a real
        domain with a top-level domain. For a reliable local test, expose this app with an HTTPS
        tunnel such as ngrok, then paste that public URL below.
      </div>
    ` : ""}
    <div class="copy-list">
      <div class="copy-row">
        <strong>Website URL</strong>
        <code>${escapeHtml(state.config?.frontendUrl || window.location.origin)}</code>
      </div>
      <div class="copy-row">
        <strong>Recommended redirect URI</strong>
        <code>${escapeHtml(state.config?.oauthCallbackUrl || `${window.location.origin}/api/auth/instagram/callback`)}</code>
      </div>
      <div class="copy-row">
        <strong>Instagram Login URI</strong>
        <code>${escapeHtml(state.config?.instagramCallbackUrl || `${window.location.origin}/api/auth/instagram/callback`)}</code>
      </div>
      <div class="copy-row">
        <strong>Facebook Login URI</strong>
        <code>${escapeHtml(state.config?.facebookCallbackUrl || `${window.location.origin}/api/auth/facebook/callback`)}</code>
      </div>
      <div class="copy-row">
        <strong>App domain</strong>
        <code>${escapeHtml(new URL(state.config?.frontendUrl || window.location.origin).hostname)}</code>
      </div>
    </div>
    <form id="runtimeSetupForm" class="setup-form">
      <div class="setup-field">
        <label for="runtimeAppId">${escapeHtml(appIdLabel)}</label>
        <input id="runtimeAppId" name="appId" value="${escapeAttribute(state.config?.appId || "")}" placeholder="1234567890" autocomplete="off" required />
      </div>
      <div class="setup-field">
        <label for="runtimeAppSecret">${escapeHtml(appSecretLabel)}</label>
        <input id="runtimeAppSecret" name="appSecret" type="password" placeholder="${setup.hasAppSecret ? "Leave blank to keep current secret" : "app secret"}" autocomplete="off" ${setup.hasAppSecret ? "" : "required"} />
      </div>
      <div class="setup-field">
        <label for="runtimeGraphVersion">Graph API version</label>
        <input id="runtimeGraphVersion" name="graphApiVersion" value="${escapeAttribute(state.config?.graphApiVersion || "v23.0")}" required />
      </div>
      <div class="setup-field">
        <label for="runtimeAuthMode">Creator login mode</label>
        <select id="runtimeAuthMode" name="authMode">
          <option value="instagram" ${(state.config?.setup?.authMode || "instagram") === "instagram" ? "selected" : ""}>Instagram Login direct</option>
          <option value="facebook" ${state.config?.setup?.authMode === "facebook" ? "selected" : ""}>Facebook Login for Business</option>
        </select>
        <p class="field-hint">
          If your Meta dashboard only shows Facebook Login for Business and no Instagram product,
          choose Facebook Login for Business here.
        </p>
      </div>
      <div class="setup-field">
        <label for="runtimeFrontendUrl">Public app URL</label>
        <input id="runtimeFrontendUrl" name="frontendUrl" value="${escapeAttribute(state.config?.frontendUrl || window.location.origin)}" placeholder="https://your-ngrok-domain.ngrok-free.app" required />
      </div>
      <div class="setup-field">
        <label for="runtimeConfigId">Facebook Login for Business Configuration ID${isInstagramMode ? ", optional" : ""}</label>
        <input id="runtimeConfigId" name="facebookLoginConfigId" value="${escapeAttribute(state.config?.setup?.facebookLoginConfigId || "")}" placeholder="Paste the Configuration ID from Facebook Login for Business" autocomplete="off" ${isInstagramMode ? "" : "required"} />
        <p class="field-hint">
          In Meta Developers, open Facebook Login for Business > Configurations, then copy the
          Configuration ID. Put Instagram and Page permissions inside that Meta configuration.
        </p>
      </div>
      <div class="modal-actions">
        <button class="accent-button" type="submit">Save and continue</button>
        <button class="ghost-button" type="button" id="useMockButton">Use mock mode</button>
      </div>
    </form>
  `;

  document.getElementById("runtimeSetupForm").addEventListener("submit", saveRuntimeSetup);
  document.getElementById("useMockButton").addEventListener("click", () => saveRuntimeSetup(null, true));
}

async function saveRuntimeSetup(event, mockMeta = false) {
  event?.preventDefault();
  clearError();
  setPrivateLoading(true, "Saving local Meta configuration...");

  try {
    const form = event ? new FormData(event.currentTarget) : null;
    const payload = form
      ? {
          appId: form.get("appId") || "",
          graphApiVersion: form.get("graphApiVersion") || "v23.0",
          authMode: form.get("authMode") || "instagram",
          frontendUrl: form.get("frontendUrl") || window.location.origin,
          facebookLoginConfigId: form.get("facebookLoginConfigId") || "",
          mockMeta,
        }
      : {
          mockMeta,
          frontendUrl: state.config?.frontendUrl || window.location.origin,
        };

    const appSecret = form?.get("appSecret");
    if (appSecret) {
      payload.appSecret = appSecret;
    }

    logClientEvent("setup.save_submitted", {
      mockMeta,
      authMode: payload.authMode,
      hasAppId: Boolean(payload.appId),
      hasAppSecret: Boolean(appSecret),
      frontendUrl: payload.frontendUrl,
    });
    await apiPost("/api/setup/runtime-config", payload);

    await loadConfig();
    renderConnectModal();
    logClientEvent("setup.save_succeeded", {
      mockMeta,
      authMode: state.config?.setup?.authMode,
      hasAppId: state.config?.setup?.hasAppId,
      hasAppSecret: state.config?.setup?.hasAppSecret,
      hasBusinessConfigId: Boolean(state.config?.setup?.facebookLoginConfigId),
    });
  } catch (error) {
    logClientEvent(
      "setup.save_failed",
      { code: error.code, message: error.message, details: error.details },
      "error",
    );
    showError(error.message, error.details);
  } finally {
    setPrivateLoading(false);
  }
}

async function startMetaLogin() {
  clearError();
  clearOAuthWatchers();

  if (
    state.config?.setup?.authMode === "facebook" &&
    !state.config?.setup?.facebookLoginConfigId &&
    !state.config?.mockMeta
  ) {
    logClientEvent("oauth.business_config_missing", { mode: state.modalMode }, "warn");
    openConnectModal("setup");
    showError(
      "Facebook Login for Business needs a Configuration ID.",
      "Open Configure Meta Login, paste the Configuration ID from Facebook Login for Business > Configurations, then save before connecting.",
    );
    return;
  }

  setPrivateLoading(true, "Opening Meta Login...");
  logClientEvent("oauth.popup.open_requested", {
    mode: state.modalMode,
    authMode: state.config?.setup?.authMode,
    configured: state.config?.setup?.facebookLoginConfigured,
  });

  const popup = window.open(
    `/api/auth/meta/start?mode=${encodeURIComponent(state.modalMode)}`,
    "meta-login",
    "popup=yes,width=620,height=760",
  );

  if (!popup) {
    setPrivateLoading(false);
    logClientEvent("oauth.popup.blocked", { mode: state.modalMode }, "warn");
    showError("The browser blocked the Meta Login popup. Allow popups and try again.");
    return;
  }

  logClientEvent("oauth.popup.opened", { mode: state.modalMode });
  state.oauthInProgress = true;
  state.oauthPopup = popup;
  state.oauthTimer = window.setTimeout(() => {
    if (!state.oauthInProgress) return;
    clearOAuthWatchers();
    setPrivateLoading(false);
    logClientEvent("oauth.popup.timeout", { mode: state.modalMode }, "warn");
    showError(
      "No response was received from Meta Login.",
      "Keep this app open on the same public HTTPS URL that is registered in Meta. If the popup shows a Meta error page, copy that exact redirect URI into the Instagram Login settings.",
    );
  }, 90000);

  state.popupCheckTimer = window.setInterval(() => {
    if (!state.oauthInProgress || !state.oauthPopup?.closed) return;
    window.setTimeout(() => {
      if (!state.oauthInProgress) return;
      clearOAuthWatchers();
      setPrivateLoading(false);
      logClientEvent("oauth.popup.closed_without_callback", { mode: state.modalMode }, "warn");
      showError(
        "Meta Login was closed before the dashboard could load.",
        "Try again and complete the authorization. If it still closes without loading, the OAuth redirect URI probably does not match the URL currently open in the browser.",
      );
    }, 800);
  }, 1000);
}

function openInstagramLogout() {
  logClientEvent("instagram.logout.opened");
  window.open("https://www.instagram.com/accounts/logout/", "instagram-logout", "popup=yes,width=520,height=680");
}

async function handleOAuthMessage(event) {
  if (event.origin !== window.location.origin) {
    logClientEvent("oauth.message.ignored_origin", {
      eventOrigin: event.origin,
      expectedOrigin: window.location.origin,
    }, "warn");
    return;
  }
  const message = event.data || {};
  if (!["META_AUTH_SUCCESS", "META_AUTH_ERROR"].includes(message.type)) return;

  clearOAuthWatchers();
  logClientEvent("oauth.message.received", {
    type: message.type,
    mode: message.mode || state.modalMode,
    hasConnection: Boolean(message.data?.connectionId),
    accountCount: message.data?.accounts?.length || 0,
    errorCode: message.error?.code,
  }, message.type === "META_AUTH_ERROR" ? "error" : "info");

  if (message.type === "META_AUTH_ERROR") {
    setPrivateLoading(false);
    showError(message.error?.message || "Meta Login failed.", message.error?.details);
    return;
  }

  await handleBackendConnection(message.data, message.mode || state.modalMode);
}

async function handleBackendConnection(connection, mode = "private") {
  clearError();
  setPrivateLoading(true, "Connecting your Instagram assets...");

  try {
    state.connectionId = connection.connectionId;
    state.accounts = connection.accounts || [];
    logClientEvent("connection.received", {
      mode,
      hasConnectionId: Boolean(state.connectionId),
      accountCount: state.accounts.length,
      accounts: state.accounts.map((account) => ({
        igUserId: account.igUserId,
        username: account.username,
        pageName: account.pageName,
      })),
    });

    if (!state.connectionId || !state.accounts.length) {
      throw new Error(
        "No Instagram Business or Creator account was returned by Meta for this login.",
      );
    }

    if (mode === "discovery") {
      if (state.accounts.length === 1) {
        closeConnectModal();
        logClientEvent("connection.auto_selected_discovery_account", {
          igUserId: state.accounts[0].igUserId,
          username: state.accounts[0].username,
        });
        await saveDiscoverySource(state.accounts[0].igUserId, true);
        return;
      }

      renderDiscoverySourcePicker(state.accounts);
      return;
    }

    if (state.accounts.length === 1) {
      closeConnectModal();
      logClientEvent("connection.auto_selected_account", {
        igUserId: state.accounts[0].igUserId,
        username: state.accounts[0].username,
      });
      await fetchPrivateInsights(state.accounts[0].igUserId);
      return;
    }

    closeConnectModal();
    renderAccountPicker(state.accounts);
  } catch (error) {
    logClientEvent(
      "connection.failed",
      { mode, message: error.message, details: error.details },
      "error",
    );
    showError(error.message, error.details);
  } finally {
    setPrivateLoading(false);
  }
}

function renderDiscoverySourcePicker(accounts) {
  els.modalBody.innerHTML = `
    <p class="eyebrow">Business Discovery source</p>
    <h2 id="modalTitle" class="modal-title">Choose the account used for public estimates</h2>
    <p class="modal-text">
      This account acts as the official Meta source for public username lookups. The access token
      remains server-side in memory for this local prototype. After saving it, the private dashboard
      will load for the same account.
    </p>
    <div class="account-list">
      ${accounts
        .map(
          (account) => `
            <button class="account-option" type="button" data-source-ig-user-id="${escapeAttribute(account.igUserId)}">
              ${renderAvatar(account.profilePictureUrl, account.username)}
              <span>
                <strong>${escapeHtml(account.name)}</strong><br />
                <span class="muted">@${escapeHtml(account.username)} · ${escapeHtml(account.pageName)}</span>
              </span>
            </button>
          `,
        )
        .join("")}
    </div>
  `;

  els.modalBody.querySelectorAll("[data-source-ig-user-id]").forEach((button) => {
    button.addEventListener("click", () => saveDiscoverySource(button.dataset.sourceIgUserId));
  });
}

async function saveDiscoverySource(igUserId, showDashboard = true) {
  clearError();
  setPrivateLoading(true, "Saving Business Discovery source...");

  try {
    logClientEvent("discovery_source.save_submitted", { igUserId });
    await apiPost("/api/setup/discovery-source", {
      connectionId: state.connectionId,
      igUserId,
    });
    await loadConfig();
    closeConnectModal();
    logClientEvent("discovery_source.save_succeeded", { igUserId, showDashboard });
    if (showDashboard) {
      await fetchPrivateInsights(igUserId);
    }
  } catch (error) {
    logClientEvent(
      "discovery_source.save_failed",
      { igUserId, code: error.code, message: error.message, details: error.details },
      "error",
    );
    showError(error.message, error.details);
  } finally {
    setPrivateLoading(false);
  }
}

async function fetchPrivateInsights(igUserId) {
  clearError();
  setPrivateLoading(true, "Loading private Instagram insights...");
  els.accountPicker.classList.add("hidden");

  try {
    logClientEvent("private_insights.requested", {
      igUserId,
      hasConnectionId: Boolean(state.connectionId),
    });
    const params = new URLSearchParams({
      igUserId,
      connectionId: state.connectionId,
    });
    const response = await apiGet(`/api/private-insights?${params.toString()}`);
    renderPrivateDashboard(response.data, response.mock);
    logClientEvent("private_insights.succeeded", {
      igUserId,
      username: response.data.profile.username,
      mediaCount: response.data.media.length,
      warningCount: response.data.warnings?.length || 0,
      totalReach: response.data.overview.total_reach,
      totalImpressions: response.data.overview.total_impressions,
    });
  } catch (error) {
    logClientEvent(
      "private_insights.failed",
      { igUserId, code: error.code, message: error.message, details: error.details },
      "error",
    );
    showError(error.message, error.details);
  } finally {
    setPrivateLoading(false);
  }
}

function renderPublicResults(data, isMock) {
  const profile = data.profile;
  const bestPost = data.best_post_by_engagement;
  const worstPost = data.worst_post_by_engagement;
  const scorePercent = `${Math.min(100, Math.max(0, data.public_score.score))}%`;

  els.publicResults.innerHTML = `
    <article class="result-block">
      <div class="section-heading">
        <div class="profile-header">
          ${renderAvatar(profile.profile_picture_url, profile.username)}
          <div>
            <h2>${escapeHtml(profile.name)}</h2>
            <p>@${escapeHtml(profile.username)}${isMock ? " · mock data" : ""}</p>
          </div>
        </div>
        <span class="chip">${escapeHtml(data.interpretation)}</span>
      </div>

      <div class="metric-grid">
        ${metricCard("Followers", formatNumber(profile.followers_count))}
        ${metricCard("Total posts", formatNumber(profile.media_count))}
        ${metricCard("Avg likes", formatNumber(data.average_likes))}
        ${metricCard("Avg comments", formatNumber(data.average_comments))}
        ${metricCard("Avg engagement", percent(data.average_engagement_rate))}
      </div>
    </article>

    <article class="result-block">
      <div class="score-layout">
        <div class="score-ring" style="--score: ${scorePercent}">
          <strong>${data.public_score.score}</strong>
        </div>
        <div>
          <p class="eyebrow">Public Score</p>
          <h2>${escapeHtml(data.interpretation)}</h2>
          <p class="muted">
            Based on public engagement, posting consistency, recent content volume, and comment-to-like ratio.
          </p>
          <div class="score-details">
            ${scoreBar("Engagement", data.public_score.components.engagement, 40)}
            ${scoreBar("Consistency", data.public_score.components.consistency, 25)}
            ${scoreBar("Volume", data.public_score.components.content_volume, 20)}
            ${scoreBar("Conversation", data.public_score.components.conversation, 15)}
          </div>
        </div>
      </div>
    </article>

    <div class="split-grid">
      <article class="result-block">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Latest analyzed posts</p>
            <h2>${data.analyzed_posts_count} public posts</h2>
          </div>
          <span class="chip">${escapeHtml(data.posting_frequency_estimate.label)}</span>
        </div>
        <div class="post-grid">
          ${data.posts.map(renderPublicPostCard).join("")}
        </div>
      </article>

      <aside class="result-block">
        <p class="eyebrow">Quick diagnostics</p>
        <h2>Public patterns</h2>
        <p class="muted">
          ${formatNumber(data.content_type_breakdown.IMAGE)} images ·
          ${formatNumber(data.content_type_breakdown.VIDEO)} videos ·
          ${formatNumber(data.content_type_breakdown.CAROUSEL_ALBUM)} carousels
        </p>
        <p class="muted">
          Average caption length: ${formatNumber(data.caption_length_average)} characters.
          Empty captions: ${formatNumber(data.posts_without_caption_count)}.
        </p>
        <p class="muted">
          Distribution: ${data.engagement_distribution.strong} strong,
          ${data.engagement_distribution.average} average,
          ${data.engagement_distribution.low} low.
        </p>
        ${bestPost ? renderHighlightPost("Best post", bestPost) : ""}
        ${worstPost ? renderHighlightPost("Lowest post", worstPost) : ""}
      </aside>
    </div>
  `;

  els.publicResults.classList.remove("hidden");
}

function renderAccountPicker(accounts) {
  els.privateDashboard.classList.add("hidden");
  if (!accounts.length) {
    els.accountPicker.innerHTML = `
      <article class="result-block">
        <p class="eyebrow">Connected accounts</p>
        <h2>No Instagram account found</h2>
        <p class="muted">
          Meta did not return a professional Instagram account for this login. Use a Business or
          Creator account and make sure the requested permissions are available to this app.
        </p>
      </article>
    `;
    els.accountPicker.classList.remove("hidden");
    return;
  }

  els.accountPicker.innerHTML = `
    <article class="result-block">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Connected accounts</p>
          <h2>Select an Instagram account</h2>
        </div>
        <span class="chip">${accounts.length} accounts found</span>
      </div>
      <div class="account-list">
        ${accounts
          .map(
            (account) => `
              <button class="account-option" type="button" data-ig-user-id="${escapeAttribute(account.igUserId)}">
                ${renderAvatar(account.profilePictureUrl, account.username)}
                <span>
                  <strong>${escapeHtml(account.name)}</strong><br />
                  <span class="muted">@${escapeHtml(account.username)} · ${escapeHtml(account.pageName)}</span>
                </span>
              </button>
            `,
          )
          .join("")}
      </div>
    </article>
  `;

  els.accountPicker.classList.remove("hidden");
  els.accountPicker.querySelectorAll("[data-ig-user-id]").forEach((button) => {
    button.addEventListener("click", () => fetchPrivateInsights(button.dataset.igUserId));
  });
}

function renderPrivateDashboard(data, isMock) {
  const profile = data.profile;
  els.privateDashboard.innerHTML = `
    <article class="result-block">
      <div class="section-heading">
        <div class="profile-header">
          ${renderAvatar(profile.profile_picture_url, profile.username)}
          <div>
            <h2>${escapeHtml(profile.name)}</h2>
            <p>@${escapeHtml(profile.username)}${isMock ? " · mock private insights" : ""}</p>
          </div>
        </div>
        <button class="ghost-button" type="button" id="switchAccountButton">Switch account</button>
      </div>
      <div class="metric-grid">
        ${metricCard("Reach", formatNumber(data.overview.total_reach))}
        ${metricCard("Impressions", formatNumber(data.overview.total_impressions))}
        ${metricCard("Saves", formatNumber(data.overview.total_saves))}
        ${metricCard("Avg engagement", percent(data.overview.average_engagement_rate))}
        ${metricCard("Save rate", percent(data.overview.save_rate))}
      </div>
    </article>

    ${renderPrivateWarnings(data.warnings)}

    <article class="result-block">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Content performance</p>
          <h2>Latest private media insights</h2>
        </div>
        <span class="chip">${data.media.length} posts</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Thumbnail</th>
              <th>Date</th>
              <th>Type</th>
              <th>Likes</th>
              <th>Comments</th>
              <th>Reach</th>
              <th>Impressions</th>
              <th>Saves</th>
              <th>Save rate</th>
              <th>Permalink</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.media.length
                ? data.media.map(renderPrivateRow).join("")
                : `<tr><td colspan="10" class="empty-cell">No recent media was returned by Meta for this account.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </article>

    <div class="split-grid">
      <article class="result-block">
        <p class="eyebrow">Insight interpretation</p>
        <h2>What the metrics suggest</h2>
        <ul class="recommendation-list">
          ${data.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </article>

      <article class="result-block">
        <p class="eyebrow">Best posts</p>
        <h2>Winners to study</h2>
        ${renderBestPrivatePosts(data.best_posts)}
      </article>
    </div>

    <article class="result-block">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Action Plan</p>
          <h2>5 concrete next steps</h2>
        </div>
      </div>
      <ul class="action-list">
        ${data.action_plan
          .map(
            (item) => `
              <li>
                <strong>${escapeHtml(item.area)}</strong>
                <span>${escapeHtml(item.recommendation)}</span>
              </li>
            `,
          )
          .join("")}
      </ul>
    </article>
  `;

  els.privateDashboard.classList.remove("hidden");

  const switchButton = document.getElementById("switchAccountButton");
  switchButton?.addEventListener("click", () => {
    if (state.accounts.length > 1) {
      renderAccountPicker(state.accounts);
      return;
    }
    openConnectModal("private");
  });
}

function renderPublicPostCard(post) {
  return `
    <article class="post-card">
      <div class="post-meta">
        <span>${escapeHtml(post.media_type)}</span>
        <span>${formatDate(post.timestamp)}</span>
      </div>
      <h3>${percent(post.engagement_rate)} engagement</h3>
      <p>${escapeHtml(truncate(post.caption || "No caption", 120))}</p>
      <div class="post-meta">
        <span>${formatNumber(post.like_count)} likes</span>
        <span>${formatNumber(post.comments_count)} comments</span>
      </div>
      ${post.permalink ? `<a class="post-link" href="${escapeAttribute(post.permalink)}" target="_blank" rel="noreferrer">Open post</a>` : ""}
    </article>
  `;
}

function renderHighlightPost(label, post) {
  return `
    <div class="post-card">
      <p class="eyebrow">${escapeHtml(label)}</p>
      <h3>${percent(post.engagement_rate)} engagement</h3>
      <p>${escapeHtml(truncate(post.caption || "No caption", 100))}</p>
      <div class="post-meta">
        <span>${formatNumber(post.like_count)} likes</span>
        <span>${formatNumber(post.comments_count)} comments</span>
      </div>
    </div>
  `;
}

function renderPrivateRow(post) {
  return `
    <tr>
      <td>${renderThumbnail(post)}</td>
      <td>${formatDate(post.timestamp)}</td>
      <td>${escapeHtml(post.media_type)}</td>
      <td>${formatNumber(post.like_count)}</td>
      <td>${formatNumber(post.comments_count)}</td>
      <td>${renderInsightMetric(post, "reach", post.reach)}</td>
      <td>${renderInsightMetric(post, "impressions", post.impressions)}</td>
      <td>${renderInsightMetric(post, "saved", post.saves)}</td>
      <td>${post.unavailable_metrics?.includes("reach") || post.unavailable_metrics?.includes("saved") ? '<span class="metric-unavailable">Unavailable</span>' : percent(post.save_rate)}</td>
      <td>${post.permalink ? `<a class="post-link" href="${escapeAttribute(post.permalink)}" target="_blank" rel="noreferrer">Open</a>` : "-"}</td>
    </tr>
  `;
}

function renderPrivateWarnings(warnings = []) {
  if (!warnings.length) return "";

  const conversionWarnings = warnings.filter(
    (warning) => warning.reason === "MEDIA_BEFORE_BUSINESS_CONVERSION",
  );

  if (conversionWarnings.length === warnings.length) {
    return `
      <article class="message setup">
        <strong>Insights are blocked for the returned posts.</strong>
        <p>
          Meta can read this Instagram account and its media, but the latest posts were published
          before the account's most recent Business or Creator conversion. Historical reach,
          impressions, and saves are not available for those posts. Publish a new test post after
          the conversion, wait for Meta to process it, then reconnect.
        </p>
      </article>
    `;
  }

  const messages = Array.from(
    new Set(
      warnings
        .slice(0, 5)
        .map((warning) => `${warning.metric}: ${warning.message}`),
    ),
  );

  return `
    <article class="message setup">
      <strong>Some Meta metrics were unavailable.</strong>
      <p>${escapeHtml(messages.join(" | "))}</p>
    </article>
  `;
}

function renderInsightMetric(post, metric, value) {
  if (post.unavailable_metrics?.includes(metric)) {
    return '<span class="metric-unavailable">Unavailable</span>';
  }

  return formatNumber(value);
}

function renderBestPrivatePosts(bestPosts) {
  const cards = [
    ["Top reach", bestPosts.top_post_by_reach, "reach"],
    ["Top saves", bestPosts.top_post_by_saves, "saves"],
    ["Top save rate", bestPosts.top_post_by_save_rate, "save_rate"],
  ];

  return `
    <div class="post-grid">
      ${cards
        .map(([label, post, field]) =>
          post
            ? `
              <article class="post-card">
                <p class="eyebrow">${escapeHtml(label)}</p>
                <h3>${field === "save_rate" ? percent(post[field]) : formatNumber(post[field])}</h3>
                <p>${escapeHtml(truncate(post.caption || "No caption", 96))}</p>
              </article>
            `
            : "",
        )
        .join("")}
    </div>
  `;
}

function metricCard(label, value) {
  return `
    <div class="metric-card">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(String(value))}</div>
    </div>
  `;
}

function scoreBar(label, value, max) {
  const width = Math.min(100, Math.max(0, (value / max) * 100));
  return `
    <div class="score-bar">
      <span>${escapeHtml(label)}</span>
      <span class="score-track"><span class="score-fill" style="width: ${width}%"></span></span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderAvatar(url, username) {
  if (url) {
    return `<img class="avatar" src="${escapeAttribute(url)}" alt="" />`;
  }
  return `<span class="avatar-fallback">${escapeHtml(String(username || "S").slice(0, 1).toUpperCase())}</span>`;
}

function renderThumbnail(post) {
  const url = post.thumbnail_url || post.media_url;
  if (url) {
    return `<img class="thumb" src="${escapeAttribute(url)}" alt="" />`;
  }
  return `<span class="thumb">${escapeHtml(String(post.media_type || "IG").slice(0, 2))}</span>`;
}

async function apiGet(path) {
  const response = await fetch(path);
  return parseApiResponse(response);
}

async function apiPost(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseApiResponse(response);
}

async function parseApiResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.error?.message || "Request failed.");
    error.code = payload.error?.code;
    error.details = payload.error?.details;
    logClientEvent(
      "api.request_failed",
      {
        status: response.status,
        url: response.url,
        code: error.code,
        message: error.message,
        details: error.details,
      },
      "error",
    );
    throw error;
  }
  return payload;
}

function setPublicLoading(isLoading) {
  els.loadingBox.classList.toggle("hidden", !isLoading);
  els.analyzeButton.disabled = isLoading;
  els.analyzeButton.textContent = isLoading ? "Analyzing..." : "Analyze account";
}

function setPrivateLoading(isLoading, message = "") {
  els.loadingBox.classList.toggle("hidden", !isLoading);
  if (message) els.loadingBox.textContent = message;
  if (!isLoading) els.loadingBox.textContent = "Fetching Meta Graph API data...";
  els.unlockButton.disabled = isLoading;
}

function clearOAuthWatchers() {
  state.oauthInProgress = false;
  state.oauthPopup = null;
  if (state.oauthTimer) {
    window.clearTimeout(state.oauthTimer);
    state.oauthTimer = null;
  }
  if (state.popupCheckTimer) {
    window.clearInterval(state.popupCheckTimer);
    state.popupCheckTimer = null;
  }
}

function showError(message, details) {
  logClientEvent("ui.error_displayed", { message, details }, "warn");
  els.errorBox.innerHTML = `
    <strong>${escapeHtml(message)}</strong>
    ${details ? `<p>${escapeHtml(String(details))}</p>` : ""}
  `;
  els.errorBox.classList.remove("hidden");
}

function clearError() {
  els.errorBox.classList.add("hidden");
  els.errorBox.innerHTML = "";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function percent(value) {
  return `${(Number(value) || 0).toFixed(2)}%`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function truncate(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function isLocalhostBaseUrl() {
  try {
    const url = new URL(state.config?.frontendUrl || window.location.origin);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return true;
  }
}

function getAuthModeDetails() {
  const authMode = state.config?.setup?.authMode || "instagram";
  return AUTH_MODE_DETAILS[authMode] || AUTH_MODE_DETAILS.instagram;
}

function getClientSessionId() {
  const key = "signalframeClientSessionId";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const next =
    window.crypto?.randomUUID?.() ||
    `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

function logClientEvent(event, data = {}, level = "info") {
  const payload = {
    event,
    level,
    sessionId: state.clientSessionId,
    url: window.location.href,
    data,
  };
  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/client-log", blob)) return;
    }
  } catch {
    // Fall back to fetch below.
  }

  fetch("/api/client-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
