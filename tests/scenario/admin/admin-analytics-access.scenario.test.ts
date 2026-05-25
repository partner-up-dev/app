import assert from "node:assert/strict";
import { withScenarioPage } from "../_infra/browser/browser";
import { scenario } from "../_infra/scenario/scenario";
import { UserRepository } from "../../../apps/backend/src/repositories/UserRepository";

const ANALYTICS_SEED_USER_ID = "00000000-0000-0000-0000-000000000002";
const ANALYTICS_SEED_PIN_HASH =
  "$2b$10$auNSGAK22Rb99icLScxQHu6qb9P3uHV1kuyImx3QuOQg5MpgYfRL2";

const userRepo = new UserRepository();

const givenAnalyticsSeedUser = async (): Promise<void> => {
  const existing = await userRepo.findById(ANALYTICS_SEED_USER_ID);
  if (existing) {
    return;
  }

  const created = await userRepo.create({
    id: ANALYTICS_SEED_USER_ID,
    role: ["analytics"],
    pinHash: ANALYTICS_SEED_PIN_HASH,
    nickname: "Scenario Seed Analytics",
    status: "ACTIVE",
  });

  assert.ok(created, "analytics seed user should be created");
};

scenario("admin_analytics_entry_allows_analytics_role_only", async (ctx) => {
  await givenAnalyticsSeedUser();
  ctx.record("analyticsUserId", ANALYTICS_SEED_USER_ID);

  await withScenarioPage(async (page) => {
    await page.goto("/bi?code=2026zcb");
    await page.waitForURL("**/admin/analytics/overview", { timeout: 20_000 });
    await page.getByTestId("admin-analytics.dashboard").waitFor({
      state: "visible",
      timeout: 10_000,
    });

    await page.goto("/admin/pr");
    await page.waitForURL(
      (url) =>
        url.pathname === "/admin/login" &&
        url.searchParams.get("redirect") === "/admin/pr",
      { timeout: 10_000 },
    );
  });
});
