import assert from "node:assert/strict";
import type { Page } from "playwright";
import {
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
} from "../../../apps/backend/src/domains/pr/contracts";
import { PRTypeConfigRepository } from "../../../apps/backend/src/repositories/PRTypeConfigRepository";
import { givenPersistedPartnerRequest } from "../../../apps/backend/tests/pr/_kit/builders/partner-requests";
import type { ScenarioUser } from "../../../apps/backend/tests/pr/_kit/builders/users";
import { givenUser } from "../../../apps/backend/tests/pr/_kit/builders/users";
import { probePartnerRequestIdsByType } from "../../../apps/backend/tests/pr/_kit/probes/partner-requests";
import {
  givenPRTypeConfig,
  givenPRTypeVisiblePR,
} from "../../../apps/backend/tests/pr-discovery/_kit/builders/pr-type-config";
import { withScenarioPage } from "../_infra/browser/browser";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { expectBackendJsonResponse, requestBackendJson } from "../_infra/http/backend";
import { scenario } from "../_infra/scenario/scenario";

type PRDiscoveryCatalogItem = { type: string; title: string };
type PRRoute = Array<{
  wgs84: [number, number] | null;
  bd09: [number, number] | null;
  gcj02: [number, number] | null;
  name: string;
  full_address: string;
}>;

const routeOnlyRoute: PRRoute = [
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.0674, 113.2698],
    name: "Route origin",
    full_address: "Route origin address",
  },
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.1405, 113.327],
    name: "Route destination",
    full_address: "Route destination address",
  },
];

const ensureRideHailingType = async (): Promise<void> => {
  const repository = new PRTypeConfigRepository();
  const existing = await repository.findByType("RIDE_HAILING");
  const values = {
    title: "Ride hailing",
    description: "Route-only ride hailing PR discovery",
    locationPool: [],
    routePool: [{ id: "route-1", route: routeOnlyRoute }],
    timePoolConfig: { durationMinutes: null, earliestLeadMinutes: 120, startRules: [] },
    authoringTimeWindowEditorDefaultMode: "ADVANCED" as const,
    defaultMinPartners: 1,
    defaultMaxPartners: 4,
    defaultPrNotes: null,
    defaultConfirmationEnabled: false,
    defaultConfirmationStartOffsetMinutes: DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
    defaultConfirmationEndOffsetMinutes: DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
    defaultJoinLockOffsetMinutes: DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
    meetingPoint: null,
    joinGateConfig: [],
    participationFrequencyLimit: null,
    feedbackQuestionnaireTemplateId: null,
    locationMeetingPoints: {},
    coverImage: null,
    communityQrCode: null,
    authoringCreationPolicy: "USER_AND_ADMIN" as const,
    fullCapacityExpansionPolicy: "DISABLED" as const,
    discoveryFormRatio: 50,
    discoveryCardRatio: 50,
    discoveryListRatio: 0,
  };
  if (existing) {
    await repository.updateByType("RIDE_HAILING", values);
    return;
  }
  await repository.create({ type: "RIDE_HAILING", ...values });
};

const givenPRDiscoveryListRecord = async (input: {
  creator: ScenarioUser;
  type: string;
  title: string;
  status: "READY" | "ACTIVE" | "CLOSED" | "EXPIRED";
  timeWindow: [string, string];
}) =>
  givenPersistedPartnerRequest({
    creator: input.creator,
    status: input.status,
    fields: {
      title: input.title,
      type: input.type,
      time: input.timeWindow,
      location: "History Court",
      route: null,
      minPartners: 2,
      maxPartners: null,
      partners: [],
      budget: null,
      preferences: [],
      notes: "PR Discovery LIST status fixture",
    },
  });

const expectDiscoveryPage = async (page: Page): Promise<void> => {
  await page.locator('[data-page="pr-discovery"]').waitFor({ state: "visible", timeout: 10_000 });
  await page.getByTestId("prd.results").waitFor({ state: "visible", timeout: 10_000 });
};

const openType = async (page: Page, type: string, view = "list"): Promise<void> => {
  await page.goto(`/prd?type=${encodeURIComponent(type)}&view=${view}`);
  await expectDiscoveryPage(page);
};

const selectPlace = async (page: Page, placeId: string): Promise<void> => {
  const card = page.locator(
    `[data-testid="pr-discovery.place.option"][data-place-id="${placeId}"]`,
  );
  await card.waitFor({ state: "visible", timeout: 10_000 });
  await card.click();
  await page.waitForFunction(
    (selector) =>
      document.querySelector(selector)?.classList.contains("place-card--selected") === true,
    `[data-testid="pr-discovery.place.option"][data-place-id="${placeId}"]`,
  );
};

const selectFirstWheelOption = async (page: Page, testId: string): Promise<void> => {
  const wheel = page.getByTestId(testId);
  await wheel.waitFor({ state: "visible", timeout: 10_000 });
  const option = wheel.locator('[role="option"]').first();
  await option.waitFor({ state: "visible", timeout: 10_000 });
  await option.click();
};

const completeLongPress = async (page: Page): Promise<void> => {
  const primary = page.getByTestId("prd.form.primary");
  await primary.waitFor({ state: "visible", timeout: 10_000 });
  await primary.scrollIntoViewIfNeeded();
  const box = await primary.boundingBox();
  assert.ok(box, "PR Discovery primary action should have a browser box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1_250);
  await page.mouse.up();
};

const closeJoinSuccessPrompt = async (page: Page): Promise<void> => {
  await page
    .getByTestId("pr-detail.join-success.confirmation-followup")
    .waitFor({ state: "visible", timeout: 20_000 });
  await page.getByTestId("pr-detail.join-success.confirmation-followup.done").click();
  await page
    .getByTestId("pr-detail.join-success.subscriptions")
    .waitFor({ state: "visible", timeout: 10_000 });
  await page.getByTestId("pr-detail.join-success.done").click();
};

scenario("pr_discovery_shell_catalog_header_footer_and_mode_switch", async (ctx) => {
  const visitor = await givenUser("system-pr-discovery-shell-visitor");
  const typeLabel = "shell";
  const type = await givenPRTypeConfig({
    label: typeLabel,
    discoveryFormRatio: 100,
    discoveryCardRatio: 0,
    discoveryListRatio: 0,
  });
  ctx.record("type", type.type);

  await withScenarioPage(async (page) => {
    const extraneousAttributeWarnings: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "warning" &&
        message.text().includes("Extraneous non-props attributes")
      ) {
        extraneousAttributeWarnings.push(message.text());
      }
    });
    await installScenarioUserSession(page, visitor);
    await page.route("**/api/pr/discovery/catalog", async (route) => {
      const response = await route.fetch();
      const catalog = (await response.json()) as Array<Record<string, unknown>>;
      const catalogWithPresentation = catalog.map((item) =>
        item.type === type.type
          ? {
              ...item,
              coverImage: "https://example.com/scenario-pr-discovery-cover.jpg",
              pois: [
                { id: 1, name: "Scenario Plaza", gallery: [] },
                { id: 2, name: "Scenario Library", gallery: [] },
              ],
            }
          : item,
      );
      await route.fulfill({
        response,
        body: JSON.stringify(catalogWithPresentation),
      });
    });
    await page.goto("/prd");
    const response = await page.waitForResponse((candidate) =>
      candidate.url().includes("/api/pr/discovery/catalog"),
    );
    assert.equal(response.status(), 200);
    const catalog = (await response.json()) as PRDiscoveryCatalogItem[];
    assert.equal(
      catalog.some((item) => item.type === type.type),
      true,
    );
    await page.getByTestId("prd.catalog.back").waitFor({ state: "visible" });
    await page.getByRole("heading", { name: "发现搭子" }).waitFor({ state: "visible" });
    await page.getByText("选择一个类型，查看正在寻找同伴的 PR。", { exact: true }).waitFor({
      state: "visible",
    });
    const catalogCard = page.getByTestId("prd.catalog.item").filter({ hasText: type.title });
    await catalogCard.getByTestId("prd.discovery-card.cover").waitFor({ state: "visible" });
    assert.equal(
      await catalogCard.getByTestId("prd.discovery-card.cover").locator("img").getAttribute("src"),
      "https://example.com/scenario-pr-discovery-cover.jpg",
    );
    assert.equal(
      await catalogCard.getByTestId("prd.discovery-card.title").textContent(),
      type.title,
    );
    assert.equal(
      await catalogCard.getByTestId("prd.discovery-card.description").textContent(),
      `Scenario PR type for ${typeLabel}`,
    );
    const placeTags = catalogCard.getByTestId("prd.discovery-card.place-tags");
    await placeTags.getByText("Scenario Plaza", { exact: true }).waitFor({ state: "visible" });
    await placeTags.getByText("Scenario Library", { exact: true }).waitFor({ state: "visible" });
    await catalogCard.click();
    await page.waitForURL(`**/prd?type=${encodeURIComponent(type.type)}`);
    await expectDiscoveryPage(page);

    await page.getByTestId("prd.header.back").waitFor({ state: "visible" });
    await page.getByTestId("prd.header.other-types").click();
    await page.getByTestId("prd.other-types.drawer").waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await page.getByTestId("prd.mode-switch").waitFor({ state: "visible" });
    for (const mode of ["list", "card", "form"] as const) {
      await page.getByTestId(`prd.mode.${mode}`).click();
      await page.waitForURL(`**/prd?type=${encodeURIComponent(type.type)}&view=${mode}`);
      await page
        .getByTestId(
          `prd.${mode === "card" ? "card.surface" : mode === "form" ? "form.view" : "list.view"}`,
        )
        .waitFor({ state: "visible", timeout: 10_000 });
    }
    await page.getByTestId("prd.header.back").click();
    await page.waitForURL("**/prd");
    assert.deepEqual(extraneousAttributeWarnings, []);
  });
});

scenario("pr_discovery_reentry_surfaces_keep_type_cards_and_community_access", async (ctx) => {
  const visitor = await givenUser("system-pr-discovery-reentry-visitor");
  const type = await givenPRTypeConfig({
    label: "reentry-surfaces",
    communityQrCode: "https://example.com/scenario-type-community-qr.png",
  });
  ctx.record("visitorUserId", visitor.user.id);
  ctx.record("type", type.type);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);

    await page.goto("/");
    const highlights = page.getByTestId("home.discovery-highlights");
    await highlights.scrollIntoViewIfNeeded();
    await highlights.waitFor({ state: "visible", timeout: 10_000 });
    await highlights.getByText(type.title, { exact: true }).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByTestId("home.discovery-catalog.open").click();
    await page.waitForURL((url) => url.pathname === "/prd" && url.search === "", {
      timeout: 10_000,
    });

    await page.goto("/about");
    const typeCommunities = page.getByTestId("about.type-communities");
    await typeCommunities.waitFor({ state: "visible", timeout: 10_000 });
    const typeCommunityRow = typeCommunities
      .locator(".pr-type-community-directory__row")
      .filter({ hasText: type.title });
    await typeCommunityRow.getByTestId("about.type-community.open").click();
    await page.getByAltText(`${type.title} 搭子群二维码`).waitFor({
      state: "visible",
      timeout: 10_000,
    });

    await page.goto("/contact-support");
    await page.getByTestId("support.type-community.open").click();
    await page.waitForURL((url) => url.pathname === "/about" && url.hash === "#type-communities", {
      timeout: 10_000,
    });
    await page.getByTestId("about.type-communities").waitFor({ state: "visible" });
  });
});

scenario("pr_discovery_all_zero_server_view_falls_back_to_list", async (ctx) => {
  const visitor = await givenUser("system-pr-discovery-zero-view-visitor");
  const type = await givenPRTypeConfig({
    label: "zero-view",
    discoveryFormRatio: 0,
    discoveryCardRatio: 0,
    discoveryListRatio: 0,
  });
  ctx.record("type", type.type);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await page.goto(`/prd?type=${encodeURIComponent(type.type)}`);
    await page.evaluate((prType) => {
      window.localStorage.removeItem(`pr-discovery.view:${prType}`);
      window.localStorage.removeItem(`pr-discovery.view-mode:${prType}`);
    }, type.type);
    await page.reload();
    await expectDiscoveryPage(page);
    await page.getByTestId("prd.list.view").waitFor({ state: "visible", timeout: 10_000 });
    assert.equal(await page.getByTestId("prd.card.surface").count(), 0);
    assert.equal(await page.getByTestId("prd.form.view").count(), 0);
  });
});

scenario("pr_discovery_view_failure_has_an_explicit_catalog_escape", async (ctx) => {
  const visitor = await givenUser("system-pr-discovery-view-error-visitor");
  const type = await givenPRTypeConfig({ label: "view-error" });
  ctx.record("type", type.type);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await page.route("**/api/pr/discovery/view?*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/problem+json",
        body: JSON.stringify({
          type: "about:blank",
          title: "PR Discovery view failed",
          status: 500,
          detail: "Scenario view-resolution failure",
        }),
      });
    });
    await page.goto(`/prd?type=${encodeURIComponent(type.type)}`);
    await page.getByTestId("prd.state.error").waitFor({ state: "visible", timeout: 10_000 });
    await page.getByTestId("prd.header.back").waitFor({ state: "visible", timeout: 10_000 });
    await page.getByTestId("prd.state.error.back").click();
    await page.waitForURL((url) => url.pathname === "/prd" && url.search === "", {
      timeout: 10_000,
    });
    await page.getByTestId("prd.catalog").waitFor({ state: "visible", timeout: 10_000 });
  });
});

scenario("pr_discovery_form_is_not_blocked_by_directory_failure", async (ctx) => {
  const visitor = await givenUser("system-pr-discovery-form-directory-error-visitor");
  const type = await givenPRTypeConfig({
    label: "form-directory-error",
    discoveryFormRatio: 100,
    discoveryCardRatio: 0,
    discoveryListRatio: 0,
  });
  ctx.record("type", type.type);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await page.route("**/api/pr/discovery?*", async (route) => {
      await route.abort("failed");
    });
    await page.goto(`/prd?type=${encodeURIComponent(type.type)}&view=form`);
    await page.getByTestId("prd.form.view").waitFor({ state: "visible", timeout: 10_000 });
  });
});

scenario("pr_discovery_ride_hailing_route_carousel_advanced_reverse_and_apply", async (ctx) => {
  const visitor = await givenUser("system-pr-discovery-ride-hailing-visitor");
  await ensureRideHailingType();
  ctx.record("type", "RIDE_HAILING");

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await installDeterministicShareSidecarStubs(page);
    await openType(page, "RIDE_HAILING", "form");
    await page.getByTestId("prd.form.view").waitFor({ state: "visible", timeout: 10_000 });

    const options = page.locator('[data-testid="pr-discovery.place.option"]');
    assert.ok(
      (await options.count()) >= 2,
      "RIDE_HAILING should expose route cards and route application",
    );
    assert.equal(
      await page
        .locator('[data-testid="pr-discovery.place.option"][data-place-id^="location:"]')
        .count(),
      0,
    );
    await selectPlace(page, "route:route-1");
    const toggle = page.getByTestId("pr-discovery.time-mode-toggle");
    await toggle.waitFor({ state: "visible", timeout: 10_000 });
    await selectFirstWheelOption(page, "pr-discovery.time-date-wheel");
    await selectFirstWheelOption(page, "pr-discovery.time-time-wheel");
    const selectedDate = await page.getByTestId("pr-discovery.time-date-wheel").textContent();
    const selectedTime = await page.getByTestId("pr-discovery.time-time-wheel").textContent();
    const routeNames = page.locator(".place-caption__route-name");
    assert.equal(await routeNames.nth(0).textContent(), "Route origin");
    assert.equal(await routeNames.nth(1).textContent(), "Route destination");
    await page.getByTestId("pr-discovery.place.route-direction-toggle").click({ force: true });
    await page.waitForFunction(() => {
      const names = Array.from(document.querySelectorAll(".place-caption__route-name")).map(
        (element) => element.textContent?.trim(),
      );
      return names[0] === "Route destination" && names[1] === "Route origin";
    });
    assert.equal(await routeNames.nth(0).textContent(), "Route destination");
    assert.equal(await routeNames.nth(1).textContent(), "Route origin");
    assert.equal(
      await page.getByTestId("pr-discovery.time-date-wheel").textContent(),
      selectedDate,
    );
    assert.equal(
      await page.getByTestId("pr-discovery.time-time-wheel").textContent(),
      selectedTime,
    );
    await page.route("**/api/pr/new/form", async (route) => {
      await route.abort("failed");
    });
    const recommendation = page.waitForResponse(
      (response) =>
        response.url().includes("/api/pr/discovery/recommend") &&
        response.request().method() === "POST",
    );
    await completeLongPress(page);
    const recommendResponse = await recommendation;
    assert.equal(recommendResponse.status(), 200);
    const recommendBody = (await recommendResponse.request().postDataJSON()) as {
      place?: { kind?: string; route?: PRRoute };
      timeWindows?: unknown;
    };
    assert.deepEqual(recommendBody.place, { kind: "route", route: [...routeOnlyRoute].reverse() });
    assert.ok(Array.isArray(recommendBody.timeWindows));
    await page.unroute("**/api/pr/new/form");
    await openType(page, "RIDE_HAILING", "form");
    const createRoute = page.locator(
      '[data-testid="pr-discovery.place.option"][data-place-id="__create_route__"]',
    );
    await createRoute.click();
    await createRoute.click();
    await page.waitForURL("**/routes/apply?type=RIDE_HAILING", { timeout: 10_000 });
    await page
      .getByTestId("prd.route-application.submit")
      .waitFor({ state: "visible", timeout: 10_000 });
  });
});

scenario("pr_discovery_list_date_tabs_full_card_and_creation_suggestion", async (ctx) => {
  const creator = await givenUser("system-pr-discovery-list-creator");
  const visitor = await givenUser("system-pr-discovery-list-visitor");
  const type = await givenPRTypeConfig({
    label: "list-rich",
    locations: ["List Court"],
    timeWindows: [
      ["2035-01-10T10:00:00.000Z", "2035-01-10T11:00:00.000Z"],
      ["2035-01-11T10:00:00.000Z", "2035-01-11T11:00:00.000Z"],
    ],
    discoveryFormRatio: 0,
    discoveryCardRatio: 0,
    discoveryListRatio: 100,
  });
  const candidate = await givenPRTypeVisiblePR({
    creator,
    prType: type,
    location: "List Court",
    title: "Full LIST candidate",
    preferences: ["安静"],
  });
  ctx.record("type", type.type);
  ctx.record("candidatePrId", candidate.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await installDeterministicShareSidecarStubs(page);
    await openType(page, type.type, "list");
    await page.getByTestId("prd.list.date-tabs").waitFor({ state: "visible", timeout: 10_000 });
    assert.ok((await page.getByTestId("prd.list.date-tabs").locator('[role="tab"]').count()) > 0);
    await page.getByTestId("prd.list.date-tabs").locator('[role="tab"]').first().click();
    const card = page.getByTestId("prd.list.record").filter({ hasText: "Full LIST candidate" });
    await card.waitFor({ state: "visible", timeout: 10_000 });
    assert.match((await card.textContent()) ?? "", /List Court/);
    await page.getByTestId("prd.list.date-tabs").locator('[role="tab"]').last().click();
    await page
      .getByTestId("prd.list.creation-suggestion")
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
    await page.getByTestId("prd.list.date-tabs").locator('[role="tab"]').first().click();
    await card.click();
    await page.waitForURL(`**/pr/${candidate.id}`, { timeout: 10_000 });
    await page.locator('[data-page="pr-detail"]').waitFor({ state: "visible", timeout: 10_000 });
  });
});

scenario("pr_discovery_list_preserves_current_statuses_and_bounded_closed_history", async (ctx) => {
  const creator = await givenUser("system-pr-discovery-list-history-creator");
  const visitor = await givenUser("system-pr-discovery-list-history-visitor");
  const futureWindow: [string, string] = ["2035-01-10T10:00:00.000Z", "2035-01-10T11:00:00.000Z"];
  const type = await givenPRTypeConfig({
    label: "list-history",
    locations: ["History Court"],
    timeWindows: [futureWindow],
    discoveryFormRatio: 0,
    discoveryCardRatio: 0,
    discoveryListRatio: 100,
  });
  const closedTitles = [
    "Closed oldest",
    "Closed retained one",
    "Closed retained two",
    "Closed retained three",
  ];
  for (const [index, title] of closedTitles.entries()) {
    const day = String(index + 1).padStart(2, "0");
    await givenPRDiscoveryListRecord({
      creator,
      type: type.type,
      title,
      status: "CLOSED",
      timeWindow: [`2020-01-${day}T10:00:00.000Z`, `2020-01-${day}T11:00:00.000Z`],
    });
  }
  await givenPRDiscoveryListRecord({
    creator,
    type: type.type,
    title: "Expired hidden",
    status: "EXPIRED",
    timeWindow: ["2020-01-05T10:00:00.000Z", "2020-01-05T11:00:00.000Z"],
  });
  await givenPRDiscoveryListRecord({
    creator,
    type: type.type,
    title: "Ready visible",
    status: "READY",
    timeWindow: futureWindow,
  });
  await givenPRDiscoveryListRecord({
    creator,
    type: type.type,
    title: "Active visible",
    status: "ACTIVE",
    timeWindow: futureWindow,
  });
  ctx.record("type", type.type);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await installDeterministicShareSidecarStubs(page);
    const directoryResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/pr/discovery?type=${encodeURIComponent(type.type)}`),
    );
    await openType(page, type.type, "list");
    const directory = (await (await directoryResponse).json()) as {
      candidates: Array<{ status: string }>;
      listRecords: Array<{ title: string | null; status: string }>;
    };
    assert.equal(directory.candidates.length, 0);
    assert.deepEqual(directory.listRecords.map((record) => record.status).sort(), [
      "ACTIVE",
      "CLOSED",
      "CLOSED",
      "CLOSED",
      "CLOSED",
      "READY",
    ]);
    assert.equal(
      directory.listRecords.some((record) => record.title === "Expired hidden"),
      false,
    );

    const tabs = page.getByTestId("prd.list.date-tabs").locator('[role="tab"]');
    await tabs.first().waitFor({ state: "visible", timeout: 10_000 });
    assert.equal(await tabs.count(), 4);
    await page
      .getByTestId("prd.list.record")
      .filter({ hasText: "Ready visible" })
      .waitFor({ state: "visible", timeout: 10_000 });
    await page
      .getByTestId("prd.list.record")
      .filter({ hasText: "Active visible" })
      .waitFor({ state: "visible", timeout: 10_000 });

    const retainedHistoryTitles = [
      "Closed retained one",
      "Closed retained two",
      "Closed retained three",
    ];
    for (let index = 0; index < 3; index += 1) {
      await tabs.nth(index).click();
      await page
        .getByTestId("prd.list.record")
        .filter({ hasText: retainedHistoryTitles[index] })
        .waitFor({ state: "visible", timeout: 10_000 });
      assert.equal(await page.getByText("Closed oldest").count(), 0);
      assert.equal(await page.getByText("Expired hidden").count(), 0);
    }
  });
});

scenario("pr_discovery_card_deck_skip_detail_and_zero_empty_create", async (ctx) => {
  const creator = await givenUser("system-pr-discovery-card-creator");
  const visitor = await givenUser("system-pr-discovery-card-visitor");
  const type = await givenPRTypeConfig({
    label: "card-deck",
    locations: ["Card Court"],
    timeWindows: [
      ["2035-01-10T10:00:00.000Z", "2035-01-10T11:00:00.000Z"],
      ["2035-01-11T10:00:00.000Z", "2035-01-11T11:00:00.000Z"],
    ],
    discoveryFormRatio: 0,
    discoveryCardRatio: 100,
    discoveryListRatio: 0,
  });
  const candidate = await givenPRTypeVisiblePR({
    creator,
    prType: type,
    location: "Card Court",
    title: "Card deck candidate",
  });
  const secondCandidate = await givenPRTypeVisiblePR({
    creator,
    prType: type,
    location: "Card Court",
    title: "Card deck second candidate",
    timeWindow: ["2035-01-11T10:00:00.000Z", "2035-01-11T11:00:00.000Z"],
  });
  ctx.record("type", type.type);
  ctx.record("candidatePrId", candidate.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await installDeterministicShareSidecarStubs(page);
    await openType(page, type.type, "card");
    await page
      .locator('[data-testid="prd.card.surface"][data-mode-state="active"]')
      .waitFor({ state: "visible", timeout: 10_000 });
    await page.getByTestId("prd.card.detail").click();
    await page.waitForURL(
      (url) =>
        url.pathname === `/pr/${candidate.id}` || url.pathname === `/pr/${secondCandidate.id}`,
      { timeout: 10_000 },
    );
    await page.locator('[data-page="pr-detail"]').waitFor({ state: "visible", timeout: 10_000 });
    await page.goto(`/prd?type=${encodeURIComponent(type.type)}&view=card`);
    await page
      .locator('[data-testid="prd.card.surface"][data-mode-state="active"]')
      .waitFor({ state: "visible", timeout: 10_000 });
    await page.getByTestId("prd.card.skip").click();
    await page
      .locator('[data-testid="prd.card.surface"]')
      .waitFor({ state: "visible", timeout: 10_000 });
  });

  const emptyType = await givenPRTypeConfig({
    label: "card-empty",
    locations: [],
    timeWindows: [],
    discoveryFormRatio: 0,
    discoveryCardRatio: 100,
    discoveryListRatio: 0,
  });
  ctx.record("emptyType", emptyType.type);
  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await openType(page, emptyType.type, "card");
    await page
      .locator('[data-testid="prd.card.surface"][data-mode-state="empty"]')
      .waitFor({ state: "visible", timeout: 10_000 });
    await page.getByTestId("prd.card.empty-create").waitFor({ state: "visible", timeout: 10_000 });
  });
});

scenario("pr_discovery_form_long_press_matched_handoff_joins_candidate", async (ctx) => {
  const creator = await givenUser("system-pr-discovery-match-creator");
  const visitor = await givenUser("system-pr-discovery-match-visitor");
  const type = await givenPRTypeConfig({
    label: "form-match",
    locations: ["Match Court"],
    discoveryFormRatio: 100,
    discoveryCardRatio: 0,
    discoveryListRatio: 0,
  });
  const candidate = await givenPRTypeVisiblePR({
    creator,
    prType: type,
    location: "Match Court",
    title: "Matched form candidate",
  });
  ctx.record("type", type.type);
  ctx.record("candidatePrId", candidate.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await installDeterministicShareSidecarStubs(page);
    await openType(page, type.type, "form");
    await selectPlace(page, "location:Match Court");
    await selectFirstWheelOption(page, "pr-discovery.time-date-wheel");
    await selectFirstWheelOption(page, "pr-discovery.time-time-wheel");
    const recommendation = page.waitForResponse(
      (response) =>
        response.url().includes("/api/pr/discovery/recommend") &&
        response.request().method() === "POST",
    );
    await completeLongPress(page);
    assert.equal((await recommendation).status(), 200);
    await page
      .getByTestId("pr-discovery.form.matched.join")
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.getByTestId("pr-discovery.form.matched.join").click();
    await page.getByTestId("pr-detail.join.confirm").click();
    await closeJoinSuccessPrompt(page);
    await page.waitForURL(
      (url) => url.pathname === `/pr/${candidate.id}` && url.searchParams.get("entry") === "join",
      { timeout: 20_000 },
    );
  });
});

scenario(
  "pr_discovery_form_no_match_candidate_and_zero_direct_create_are_ordinary_prs",
  async (ctx) => {
    const creator = await givenUser("system-pr-discovery-no-match-creator");
    const visitor = await givenUser("system-pr-discovery-no-match-visitor");
    const type = await givenPRTypeConfig({
      label: "form-candidate",
      locations: ["Target Court"],
      timeWindows: [["2035-01-10T10:00:00.000Z", "2035-01-10T11:00:00.000Z"]],
      discoveryFormRatio: 100,
      discoveryCardRatio: 0,
      discoveryListRatio: 0,
    });
    const candidate = await givenPRTypeVisiblePR({
      creator,
      prType: type,
      location: "Target Court",
      title: "No match candidate",
      timeWindow: ["2035-01-20T10:00:00.000Z", "2035-01-20T11:00:00.000Z"],
    });
    ctx.record("type", type.type);
    ctx.record("candidatePrId", candidate.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, visitor);
      await openType(page, type.type, "form");
      await selectPlace(page, "location:Target Court");
      await selectFirstWheelOption(page, "pr-discovery.time-date-wheel");
      await selectFirstWheelOption(page, "pr-discovery.time-time-wheel");
      await completeLongPress(page);
      await page
        .getByTestId("pr-discovery.candidate-list")
        .waitFor({ state: "visible", timeout: 20_000 });

      const listMode = page.getByTestId("prd.mode.list");
      await listMode.scrollIntoViewIfNeeded();
      await listMode.click();
      await page.waitForURL(`**/prd?type=${encodeURIComponent(type.type)}&view=list`, {
        timeout: 10_000,
      });
      await page.getByTestId("prd.list.view").waitFor({ state: "visible", timeout: 10_000 });

      const formMode = page.getByTestId("prd.mode.form");
      await formMode.scrollIntoViewIfNeeded();
      await formMode.click();
      await page.waitForURL(`**/prd?type=${encodeURIComponent(type.type)}&view=form`, {
        timeout: 10_000,
      });
      await page.getByTestId("prd.form.view").waitFor({ state: "visible", timeout: 10_000 });
      assert.equal(await page.getByTestId("pr-discovery.candidate-list").count(), 0);
      assert.equal(await page.getByTestId("pr-discovery.create-fallback").count(), 0);

      await selectPlace(page, "location:Target Court");
      await selectFirstWheelOption(page, "pr-discovery.time-date-wheel");
      await selectFirstWheelOption(page, "pr-discovery.time-time-wheel");
      await completeLongPress(page);
      await page
        .getByTestId("pr-discovery.candidate-list")
        .waitFor({ state: "visible", timeout: 20_000 });
      await page.getByTestId("pr-discovery.create-fallback").click();
      await page.waitForURL("**/pr/*?entry=create&origin=PR_DISCOVERY", { timeout: 20_000 });
      await page.locator('[data-page="pr-detail"]').waitFor({ state: "visible", timeout: 10_000 });
    });

    const emptyType = await givenPRTypeConfig({
      label: "form-zero",
      locations: ["Zero Court"],
      discoveryFormRatio: 100,
      discoveryCardRatio: 0,
      discoveryListRatio: 0,
    });
    const before = await probePartnerRequestIdsByType(emptyType.type);
    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, visitor);
      await openType(page, emptyType.type, "form");
      await selectPlace(page, "location:Zero Court");
      await selectFirstWheelOption(page, "pr-discovery.time-date-wheel");
      await selectFirstWheelOption(page, "pr-discovery.time-time-wheel");
      await completeLongPress(page);
      await page.waitForURL("**/pr/*?entry=create&origin=PR_DISCOVERY", { timeout: 20_000 });
    });
    const after = await probePartnerRequestIdsByType(emptyType.type);
    assert.equal(after.length, before.length + 1);
    const createdId = after.at(-1);
    assert.ok(createdId);
    const detail = await expectBackendJsonResponse<{
      core: { time: [string | null, string | null] };
    }>(await requestBackendJson(`/api/pr/${createdId}`, { token: visitor.token }), 200);
    assert.ok(
      detail.core.time[0] &&
        detail.core.time[1] &&
        Date.parse(detail.core.time[1]) > Date.parse(detail.core.time[0]),
    );
  },
);
