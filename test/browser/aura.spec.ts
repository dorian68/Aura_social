import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("aura_api_base", "http://localhost:3170");
    window.localStorage.setItem("aura_oauth_base", "http://localhost:3170");
  });
});

test("dashboard labels simulation and loads backend value proof", async ({ page }) => {
  await page.goto("/product/dashboard.html");

  await expect(page).toHaveTitle(/AURA.*Dashboard/i);
  await expect(page.locator(".sim-banner")).toContainText(/simulation/i);
  await expect(page.locator("[data-t='rev_sim']")).toContainText(/simulation/i);
  await expect(page.locator("#kpiRow .kcard").first()).toBeVisible();

  const health = await page.request.get("http://localhost:3170/api/system/health");
  expect(health.ok()).toBeTruthy();
  const payload = await health.json();
  expect(payload.success).toBe(true);
  expect(payload.data.meta.setup.mockMeta).toBe(true);
  expect(["memory", "sqlite"]).toContain(payload.data.environment.persistence.mode);
  expect(payload.data.b2b.externalCallsEnabled).toBe(false);
});

test("landing and product dashboard are reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Aura/i);

  const dashboard = await page.request.get(
    "http://localhost:8080/product/dashboard.html",
  );
  expect(dashboard.status()).toBe(200);
});
