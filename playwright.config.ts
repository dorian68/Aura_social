import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/browser",
  timeout: 45_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "artifacts/playwright-report", open: "never" }]],
  outputDir: "artifacts/playwright-results",
  use: {
    baseURL: "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev -- -p 3170",
      url: "http://localhost:3170/api/system/health",
      timeout: 120_000,
      reuseExistingServer: true,
      env: {
        ...process.env,
        AURA_PERSISTENCE: "memory",
        AURA_TEST_MODE: "true",
        MOCK_META: "true",
        DEMO_MODE: "true",
      },
    },
    {
      command: "node scripts/serve-frontend.mjs",
      url: "http://localhost:8080/product/dashboard.html",
      timeout: 30_000,
      reuseExistingServer: true,
      env: {
        ...process.env,
        WEB_PORT: "8080",
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
