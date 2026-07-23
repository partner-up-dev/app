import assert from "node:assert/strict";
import type { Response as PlaywrightResponse } from "playwright";
import {
  factPRDiscoveryFunnelEvents,
  userTelemetryEvents,
} from "../../../apps/backend/src/entities";
import { withScenarioPage } from "../_infra/browser/browser";
import { installScenarioUserSession } from "../_infra/browser/session";
import { scenario } from "../_infra/scenario/scenario";
import { getTestDb } from "../../../apps/backend/tests/_infra/probes/sql-probe";
import { givenUser } from "../../../apps/backend/tests/pr/_kit/builders/users";
import {
  givenPRTypeConfig,
  givenPRTypeVisiblePR,
} from "../../../apps/backend/tests/pr-discovery/_kit/builders/pr-type-config";
import { UserRepository } from "../../../apps/backend/src/repositories/UserRepository";

const ANALYTICS_SEED_USER_ID = "00000000-0000-0000-0000-000000000002";
const ANALYTICS_SEED_PIN_HASH = "$2b$10$auNSGAK22Rb99icLScxQHu6qb9P3uHV1kuyImx3QuOQg5MpgYfRL2";

const userRepo = new UserRepository();

const givenAnalyticsSeedUser = async (): Promise<void> => {
  const existing = await userRepo.findById(ANALYTICS_SEED_USER_ID);
  if (existing) {
    assert.equal(existing.status, "ACTIVE");
    assert.equal(existing.role.includes("analytics"), true);
    assert.equal(existing.pinHash, ANALYTICS_SEED_PIN_HASH);
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

type TelemetryEnvelope = {
  event_id: string;
  event_name: string;
  journey_id: string;
  payload: Record<string, unknown>;
};

type TelemetryBatchRequest = {
  events: TelemetryEnvelope[];
};

const readTelemetryBatch = (pageResponse: PlaywrightResponse): TelemetryBatchRequest => {
  const body = pageResponse.request().postDataJSON() as Partial<TelemetryBatchRequest>;
  assert.ok(Array.isArray(body.events), "telemetry request should contain an event batch");
  return { events: body.events };
};

const isDiscoveryActionBatch = (response: PlaywrightResponse, prType: string): boolean => {
  if (
    response.request().method() !== "POST" ||
    !new URL(response.url()).pathname.endsWith("/api/telemetry/user/events")
  ) {
    return false;
  }
  const batch = readTelemetryBatch(response);
  return batch.events.some(
    (event) =>
      event.event_name === "pr.discovery.candidate.action" && event.payload.prType === prType,
  );
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
      (url) => url.pathname === "/admin/login" && url.searchParams.get("redirect") === "/admin/pr",
      { timeout: 10_000 },
    );
  });
});

scenario("pr_discovery_event_reaches_typed_fact_and_dashboard", async (ctx) => {
  await givenAnalyticsSeedUser();
  const creator = await givenUser("analytics-discovery-creator");
  const visitor = await givenUser("analytics-discovery-visitor");
  const windowStart = new Date(Date.now() + 24 * 60 * 60 * 1_000);
  const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1_000);
  const prType = await givenPRTypeConfig({
    label: "phase7-analytics",
    timeWindows: [[windowStart.toISOString(), windowEnd.toISOString()]],
    discoveryFormRatio: 0,
    discoveryCardRatio: 0,
    discoveryListRatio: 100,
  });
  const candidateTitle = "Phase 7 Analytics candidate";
  const candidate = await givenPRTypeVisiblePR({
    creator,
    prType,
    title: candidateTitle,
  });
  const spm = "phase7.pr_discovery.system";

  let actionEventId = "";
  let actionJourneyId = "";

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await page.goto(
      `/prd?type=${encodeURIComponent(prType.type)}&view=list&spm=${encodeURIComponent(spm)}`,
    );
    const candidateRow = page.getByTestId("prd.list.record").filter({ hasText: candidateTitle });
    await candidateRow.waitFor({ state: "visible", timeout: 10_000 });

    const actionIngest = page.waitForResponse(
      (response) => isDiscoveryActionBatch(response, prType.type),
      { timeout: 10_000 },
    );
    await candidateRow.click();
    await page.waitForURL(`**/pr/${candidate.id}`, { timeout: 10_000 });

    const ingestResponse = await actionIngest;
    assert.equal(ingestResponse.status(), 200);
    const ingestResult = (await ingestResponse.json()) as {
      total: number;
      accepted: number;
      rejected: number;
      idempotent: number;
    };
    assert.ok(ingestResult.accepted > 0);
    assert.equal(ingestResult.rejected, 0);

    const actionEnvelope = readTelemetryBatch(ingestResponse).events.find(
      (event) =>
        event.event_name === "pr.discovery.candidate.action" &&
        event.payload.prType === prType.type,
    );
    assert.ok(actionEnvelope, "the accepted browser batch should contain the Discovery action");
    actionEventId = actionEnvelope.event_id;
    actionJourneyId = actionEnvelope.journey_id;
  });

  const ledgerEvent = (
    await getTestDb()
      .select({
        eventId: userTelemetryEvents.eventId,
        eventName: userTelemetryEvents.eventName,
        journeyId: userTelemetryEvents.journeyId,
      })
      .from(userTelemetryEvents)
  ).find((event) => event.eventId === actionEventId);
  assert.deepEqual(ledgerEvent, {
    eventId: actionEventId,
    eventName: "pr.discovery.candidate.action",
    journeyId: actionJourneyId,
  });

  const factEvent = (
    await getTestDb()
      .select({
        eventId: factPRDiscoveryFunnelEvents.eventId,
        journeyId: factPRDiscoveryFunnelEvents.journeyId,
        prType: factPRDiscoveryFunnelEvents.prType,
        viewMode: factPRDiscoveryFunnelEvents.viewMode,
        origin: factPRDiscoveryFunnelEvents.origin,
        prId: factPRDiscoveryFunnelEvents.prId,
        action: factPRDiscoveryFunnelEvents.action,
        routePath: factPRDiscoveryFunnelEvents.routePath,
        spm: factPRDiscoveryFunnelEvents.spm,
        sourceQr: factPRDiscoveryFunnelEvents.sourceQr,
        routeContextStatus: factPRDiscoveryFunnelEvents.routeContextStatus,
      })
      .from(factPRDiscoveryFunnelEvents)
  ).find((event) => event.eventId === actionEventId);
  assert.equal(factEvent?.eventId, actionEventId);
  assert.equal(factEvent?.journeyId, actionJourneyId);
  assert.equal(factEvent?.prType, prType.type);
  assert.equal(factEvent?.viewMode, "LIST");
  assert.equal(factEvent?.origin, "PR_DISCOVERY");
  assert.equal(factEvent?.prId, candidate.id);
  assert.equal(factEvent?.action, "DETAIL");
  assert.match(factEvent?.routePath ?? "", /^\/prd(?:\?|$)/);
  assert.equal(factEvent?.spm, spm);
  assert.equal(factEvent?.sourceQr, spm);
  assert.equal(factEvent?.routeContextStatus, "context_complete");

  const browserJourneyFactEventNames = (
    await getTestDb()
      .select({
        eventName: factPRDiscoveryFunnelEvents.eventName,
        journeyId: factPRDiscoveryFunnelEvents.journeyId,
        prType: factPRDiscoveryFunnelEvents.prType,
        origin: factPRDiscoveryFunnelEvents.origin,
      })
      .from(factPRDiscoveryFunnelEvents)
  )
    .filter(
      (event) =>
        event.journeyId === actionJourneyId &&
        event.prType === prType.type &&
        event.origin === "PR_DISCOVERY",
    )
    .map((event) => event.eventName)
    .sort();
  assert.deepEqual(browserJourneyFactEventNames, [
    "pr.discovery.candidate.action",
    "pr.discovery.candidate.impression",
    "pr.discovery.surface.viewed",
  ]);

  await withScenarioPage(async (page) => {
    let allowedAnalyticsPaths = new Set<string>();
    const unexpectedAnalyticsPaths: string[] = [];
    const observedAnalyticsPaths: string[] = [];
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (!pathname.startsWith("/api/analytics/")) return;
      observedAnalyticsPaths.push(pathname);
      if (!allowedAnalyticsPaths.has(pathname)) {
        unexpectedAnalyticsPaths.push(pathname);
      }
    });

    const expectAnalyticsResponse = (pathname: string) =>
      page.waitForResponse(
        (response) =>
          response.request().method() === "GET" && new URL(response.url()).pathname === pathname,
        { timeout: 10_000 },
      );

    allowedAnalyticsPaths = new Set(["/api/analytics/overview"]);
    const overviewResponse = expectAnalyticsResponse("/api/analytics/overview");
    await page.goto("/bi?code=2026zcb");
    await page.waitForURL("**/admin/analytics/overview", { timeout: 20_000 });
    assert.equal(new URL(page.url()).searchParams.has("code"), false);
    assert.equal((await overviewResponse).status(), 200);
    await page.getByTestId("admin-analytics.bi-overview").waitFor({
      state: "visible",
      timeout: 10_000,
    });

    allowedAnalyticsPaths = new Set([
      "/api/analytics/pr-create-funnel",
      "/api/analytics/pr-join-funnel",
    ]);
    const createResponse = expectAnalyticsResponse("/api/analytics/pr-create-funnel");
    const joinResponse = expectAnalyticsResponse("/api/analytics/pr-join-funnel");
    await page.goto("/admin/analytics/pr-funnels");
    assert.equal((await createResponse).status(), 200);
    assert.equal((await joinResponse).status(), 200);
    await page.getByTestId("admin-analytics.pr-create-funnel").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByTestId("admin-analytics.pr-join-funnel").waitFor({
      state: "visible",
      timeout: 10_000,
    });

    allowedAnalyticsPaths = new Set(["/api/analytics/pr-discovery-funnel"]);
    const initialDiscoveryResponse = expectAnalyticsResponse("/api/analytics/pr-discovery-funnel");
    await page.goto("/admin/analytics/pr-discovery");
    assert.equal((await initialDiscoveryResponse).status(), 200);
    await page.getByTestId("admin-analytics.pr-discovery-funnel").waitFor({
      state: "visible",
      timeout: 10_000,
    });

    await page.locator("#analytics-pr-type").fill(prType.type);
    await page.locator("#analytics-origin").fill("PR_DISCOVERY");
    const filteredDiscoveryResponse = page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return (
          response.request().method() === "GET" &&
          url.pathname === "/api/analytics/pr-discovery-funnel" &&
          url.searchParams.get("prType") === prType.type &&
          url.searchParams.get("origin") === "PR_DISCOVERY"
        );
      },
      { timeout: 10_000 },
    );
    await page.getByTestId("admin-analytics.filters.apply").click();
    const filteredResponse = await filteredDiscoveryResponse;
    assert.equal(filteredResponse.status(), 200);
    const dashboard = (await filteredResponse.json()) as {
      steps: Array<{ stepKey: string; journeyCount: number; eventCount: number }>;
      dimensions: Array<{
        prType: string;
        viewMode: string;
        origin: string;
        journeyCount: number;
        eventCount: number;
      }>;
    };
    for (const stepKey of ["surface_viewed", "candidate_impression", "candidate_action"]) {
      const step = dashboard.steps.find((candidateStep) => candidateStep.stepKey === stepKey);
      assert.ok(step, `dashboard should retain ${stepKey}`);
      assert.ok(step.journeyCount >= 1, `${stepKey} should contain the browser journey`);
      assert.ok(step.eventCount >= 1, `${stepKey} should contain an accepted event`);
    }
    const dimension = dashboard.dimensions.find(
      (entry) =>
        entry.prType === prType.type &&
        entry.viewMode === "LIST" &&
        entry.origin === "PR_DISCOVERY",
    );
    assert.ok(dimension, "typed API should expose the browser Discovery dimension");

    const dimensionRow = page
      .getByTestId("admin-analytics.pr-discovery-funnel")
      .locator("tbody tr")
      .filter({ hasText: prType.type });
    await dimensionRow.waitFor({ state: "visible", timeout: 10_000 });
    const cells = await dimensionRow.locator("td").allTextContents();
    assert.deepEqual(
      cells.slice(0, 3).map((value) => value.trim()),
      [prType.type, "LIST", "PR_DISCOVERY"],
    );
    assert.equal(Number(cells[3]?.replaceAll(",", "")), dimension.journeyCount);
    assert.equal(Number(cells[4]?.replaceAll(",", "")), dimension.eventCount);

    assert.deepEqual(unexpectedAnalyticsPaths, []);
    for (const expected of [
      "/api/analytics/overview",
      "/api/analytics/pr-create-funnel",
      "/api/analytics/pr-join-funnel",
      "/api/analytics/pr-discovery-funnel",
    ]) {
      assert.equal(
        observedAnalyticsPaths.includes(expected),
        true,
        `${expected} should be exercised`,
      );
    }
  });

  ctx.record("analyticsProjection", {
    actionEventId,
    actionJourneyId,
    prType: prType.type,
    spm,
  });
});
