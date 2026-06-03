import assert from "node:assert/strict";
import type { Page } from "playwright";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { withScenarioPage } from "../_infra/browser/browser";
import {
  expectBackendJsonResponse,
  requestBackendJson,
} from "../_infra/http/backend";
import { scenario } from "../_infra/scenario/scenario";
import {
  givenAnchorEvent,
  givenAnchorEventVisiblePR,
  setAnchorEventLandingRollout,
  type ScenarioAnchorEvent,
} from "../../../apps/backend/tests/anchor-event/_kit/builders/anchor-events";
import { bindScenarioWeChatOpenId } from "../../../apps/backend/tests/pr-core/_kit/actions/system-state";
import { probeLatestPartnerSlot } from "../../../apps/backend/tests/pr-core/_kit/probes/system-state";
import {
  givenUser,
  type ScenarioUser,
} from "../../../apps/backend/tests/pr-core/_kit/builders/users";
import type { PRRoute } from "../../../apps/backend/src/entities";
import { buildPRRouteSummary } from "../../../apps/backend/src/domains/pr-core/services/pr-place-mode.service";

const FORM_ONLY = {
  FORM: 100,
  CARD_RICH: 0,
  LIST: 0,
};

const productLocalDateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formModeRoutePoolRoute: PRRoute = [
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.0674, 113.2698],
    name: "System Route Origin",
    full_address: "System Route Origin Address",
  },
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.1405, 113.327],
    name: "System Route Destination",
    full_address: "System Route Destination Address",
  },
];

const addDaysToDateKey = (dateKey: string, days: number): string => {
  const [yearText, monthText, dayText] = dateKey.split("-");
  const date = new Date(
    Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)),
  );
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

const buildProductLocalIso = (dateKey: string, timeKey: string): string =>
  new Date(`${dateKey}T${timeKey}:00+08:00`).toISOString();

const buildTomorrowDuskWindow = (): [string, string] => {
  const tomorrowKey = addDaysToDateKey(
    productLocalDateKeyFormatter.format(new Date()),
    1,
  );
  return [
    buildProductLocalIso(tomorrowKey, "18:00"),
    buildProductLocalIso(tomorrowKey, "19:00"),
  ];
};

type PRDetailProbe = {
  id: number;
  status: string;
  createdBy?: string | null;
  core: {
    type: string;
    location: string | null;
    route: PRRoute | null;
    placeDisplayName: string | null;
    time: [string | null, string | null];
  };
};

type FormModeRecommendationProbe = {
  selection: {
    kind: "location" | "route";
    locationId: string | null;
    routePoolEntryId: string | null;
    timeWindows?: Array<{
      startAt: string;
      endAt: string;
    }>;
  };
  matchedRecommendation: {
    pr: {
      id: number;
    };
  } | null;
  orderedCandidates: Array<{
    pr: {
      id: number;
    };
  }>;
};

const expectFormMode = async (page: Page): Promise<void> => {
  await page.getByTestId("anchor-event-form-mode.surface").waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

const forceFormMode = async (event: ScenarioAnchorEvent): Promise<void> => {
  await setAnchorEventLandingRollout({
    eventId: event.id,
    ratios: FORM_ONLY,
    assignmentRevision: 1,
  });
};

const givenWeChatBoundUser = async (label: string): Promise<ScenarioUser> => {
  const user = await givenUser(label);
  await bindScenarioWeChatOpenId({
    user,
    openId: `${label}-openid`,
  });
  return user;
};

const selectLocation = async (page: Page, locationId: string): Promise<void> => {
  const selector = `[data-testid="anchor-event-form-mode.place.option"][data-place-id="location:${locationId}"]`;
  const option = page.locator(selector);
  await option.waitFor({ state: "attached", timeout: 10_000 });
  await option.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error("Place option should be an HTMLElement");
    }
    element.click();
  });
  await page.waitForFunction(
    (selectorValue) => {
      const element = document.querySelector(selectorValue);
      return element?.classList.contains("place-card--selected") === true;
    },
    selector,
    { timeout: 10_000 },
  );
};

const expectRouteSelected = async (
  page: Page,
  routePoolEntryId: string,
): Promise<void> => {
  const selector = `[data-testid="anchor-event-form-mode.place.option"][data-place-id="route:${routePoolEntryId}"]`;
  const option = page.locator(selector);
  await option.waitFor({ state: "attached", timeout: 10_000 });
  await page.waitForFunction(
    (selectorValue) => {
      const element = document.querySelector(selectorValue);
      return element?.classList.contains("place-card--selected") === true;
    },
    selector,
    { timeout: 10_000 },
  );
};

const completePrimaryLongPress = async (page: Page): Promise<void> => {
  const primaryAction = page.getByTestId("anchor-event-form-mode.primary-action");
  await primaryAction.waitFor({ state: "visible", timeout: 10_000 });
  await primaryAction.scrollIntoViewIfNeeded();

  const box = await primaryAction.boundingBox();
  assert.ok(box, "Form Mode primary action should have a browser box");

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1_250);
  await page.mouse.up();
};

const submitFormAndReadRecommendation = async (input: {
  page: Page;
  event: ScenarioAnchorEvent;
}): Promise<FormModeRecommendationProbe> => {
  const responsePromise = input.page.waitForResponse(
    (response) =>
      response.url().includes(
        `/api/events/${input.event.id}/form-mode/recommendation`,
      ) && response.request().method() === "POST",
    { timeout: 20_000 },
  );

  await completePrimaryLongPress(input.page);
  const response = await responsePromise;
  assert.equal(response.status(), 200);
  return (await response.json()) as FormModeRecommendationProbe;
};

const selectFuzzyTomorrowDusk = async (page: Page): Promise<void> => {
  const toggle = page.getByTestId("anchor-event-form-mode.time-mode-toggle");
  await toggle.click();
  await toggle.click();
  await page.getByTestId("anchor-event-form-mode.time-date-wheel").click();
  await page.keyboard.press("ArrowDown");
  await page.getByTestId("anchor-event-form-mode.time-time-wheel").click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() =>
    document
      .querySelector('[data-testid="anchor-event-form-mode.primary-action"]')
      ?.textContent?.includes("明天傍晚") === true,
  );
};

const expectJoinedSlot = async (input: {
  prId: number;
  user: ScenarioUser;
}): Promise<void> => {
  const slot = await probeLatestPartnerSlot({
    pr: { id: input.prId },
    user: input.user,
  });
  assert.equal(slot?.status, "JOINED");
};

const readPrIdFromCurrentUrl = (page: Page): number => {
  const url = new URL(page.url());
  const match = /^\/pr\/(\d+)$/.exec(url.pathname);
  assert.ok(match, `Expected PR detail URL, got ${url.pathname}`);
  const prId = Number(match[1]);
  assert.ok(Number.isInteger(prId) && prId > 0);
  return prId;
};

const expectCreatedPRDetail = async (input: {
  prId: number;
  token: string;
  creatorUserId: string;
  event: ScenarioAnchorEvent;
  locationId: string;
}): Promise<void> => {
  const detail = await expectBackendJsonResponse<PRDetailProbe>(
    await requestBackendJson(`/api/pr/${input.prId}`, {
      token: input.token,
    }),
    200,
  );

  assert.equal(detail.createdBy, input.creatorUserId);
  assert.equal(detail.status, "OPEN");
  assert.equal(detail.core.type, input.event.type);
  assert.equal(detail.core.location, input.locationId);
};

const expectCreatedRoutePRDetail = async (input: {
  prId: number;
  token: string;
  creatorUserId: string;
  event: ScenarioAnchorEvent;
  route: PRRoute;
}): Promise<void> => {
  const detail = await expectBackendJsonResponse<PRDetailProbe>(
    await requestBackendJson(`/api/pr/${input.prId}`, {
      token: input.token,
    }),
    200,
  );

  assert.equal(detail.createdBy, input.creatorUserId);
  assert.equal(detail.status, "OPEN");
  assert.equal(detail.core.type, input.event.type);
  assert.equal(detail.core.location, null);
  assert.deepEqual(detail.core.route, input.route);
  assert.equal(detail.core.placeDisplayName, buildPRRouteSummary(input.route));
};

const waitForJoinResultDetail = async (
  page: Page,
  prId: number,
): Promise<void> => {
  await page.waitForURL(
    (url) =>
      url.pathname === `/pr/${prId}` &&
      url.searchParams.get("entry") === "join",
    { timeout: 20_000 },
  );
  await page.getByTestId("pr-detail.participant.confirm-action").waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

const closeJoinSuccessPrompt = async (page: Page): Promise<void> => {
  await page
    .getByTestId("pr-detail.join-success.confirmation-followup")
    .waitFor({
      state: "visible",
      timeout: 10_000,
    });
  await page
    .getByTestId("pr-detail.join-success.confirmation-followup.done")
    .click();
  await page.getByTestId("pr-detail.join-success.subscriptions").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.getByTestId("pr-detail.join-success.done").click();
};

scenario("anchor_event_form_mode_matched_join_reaches_pr_detail", async (ctx) => {
  const creator = await givenUser("system-form-mode-matched-creator");
  const visitor = await givenUser("system-form-mode-matched-visitor");
  const event = await givenAnchorEvent({ label: "form-mode-matched-join" });
  const pr = await givenAnchorEventVisiblePR({
    creator,
    event,
    title: "System Form Mode matched PR",
  });
  await forceFormMode(event);

  ctx.record("eventId", event.id);
  ctx.record("prId", pr.id);
  ctx.record("visitorUserId", visitor.user.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/e/${event.id}`);
    await expectFormMode(page);
    const recommendation = await submitFormAndReadRecommendation({ page, event });
    assert.equal(recommendation.matchedRecommendation?.pr.id, pr.id);

    await page.getByTestId("anchor-event-form-mode.matched.join").click();
    await page.getByTestId("pr-detail.join.confirm").click();
    await closeJoinSuccessPrompt(page);
    await waitForJoinResultDetail(page, pr.id);
  });

  await expectJoinedSlot({ prId: pr.id, user: visitor });
});

scenario(
  "anchor_event_form_mode_fuzzy_time_matches_pr_start_inside_submitted_window",
  async (ctx) => {
    const creator = await givenUser("system-form-mode-fuzzy-creator");
    const visitor = await givenUser("system-form-mode-fuzzy-visitor");
    const fuzzyMatchedWindow = buildTomorrowDuskWindow();
    const event = await givenAnchorEvent({
      label: "form-mode-fuzzy-matched",
      timeWindows: [fuzzyMatchedWindow],
    });
    const pr = await givenAnchorEventVisiblePR({
      creator,
      event,
      timeWindow: fuzzyMatchedWindow,
      title: "System Form Mode fuzzy matched PR",
    });
    await forceFormMode(event);

    ctx.record("eventId", event.id);
    ctx.record("prId", pr.id);
    ctx.record("visitorUserId", visitor.user.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, visitor);
      await installDeterministicShareSidecarStubs(page);

      await page.goto(`/e/${event.id}`);
      await expectFormMode(page);
      await selectFuzzyTomorrowDusk(page);

      const recommendation = await submitFormAndReadRecommendation({ page, event });
      const submittedWindow = recommendation.selection.timeWindows?.[0];
      assert.ok(submittedWindow);
      assert.ok(submittedWindow.startAt <= fuzzyMatchedWindow[0]);
      assert.ok(fuzzyMatchedWindow[0] < submittedWindow.endAt);
      assert.equal(recommendation.matchedRecommendation?.pr.id, pr.id);
    });
  },
);

scenario(
  "anchor_event_form_mode_unmatched_candidate_join_reaches_pr_detail",
  async (ctx) => {
    const creator = await givenUser("system-form-mode-candidate-creator");
    const visitor = await givenUser("system-form-mode-candidate-visitor");
    const targetLocation = "System Form Mode Target Court";
    const candidateLocation = "System Form Mode Candidate Court";
    const event = await givenAnchorEvent({
      label: "form-mode-candidate-join",
      locationIds: [targetLocation, candidateLocation],
    });
    const candidate = await givenAnchorEventVisiblePR({
      creator,
      event,
      location: candidateLocation,
      title: "System Form Mode candidate PR",
    });
    await forceFormMode(event);

    ctx.record("eventId", event.id);
    ctx.record("candidatePrId", candidate.id);
    ctx.record("visitorUserId", visitor.user.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, visitor);
      await installDeterministicShareSidecarStubs(page);

      await page.goto(`/e/${event.id}`);
      await expectFormMode(page);
      await selectLocation(page, targetLocation);
      const recommendation = await submitFormAndReadRecommendation({ page, event });
      assert.equal(recommendation.selection.locationId, targetLocation);
      assert.equal(recommendation.matchedRecommendation, null);
      assert.equal(recommendation.orderedCandidates[0]?.pr.id, candidate.id);

      await page.getByTestId("anchor-event-form-mode.candidate-list").waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await page
        .locator(
          `[data-testid="anchor-event-form-mode.candidate.join"][data-pr-id="${candidate.id}"]`,
        )
        .click();
      await page.getByTestId("pr-detail.join.confirm").click();
      await closeJoinSuccessPrompt(page);
      await waitForJoinResultDetail(page, candidate.id);
    });

    await expectJoinedSlot({ prId: candidate.id, user: visitor });
  },
);

scenario(
  "anchor_event_form_mode_unmatched_create_reaches_published_pr_detail",
  async (ctx) => {
    const creator = await givenUser("system-form-mode-create-creator");
    const visitor = await givenWeChatBoundUser("system-form-mode-create-visitor");
    const targetLocation = "System Form Mode Create Target Court";
    const candidateLocation = "System Form Mode Create Candidate Court";
    const event = await givenAnchorEvent({
      label: "form-mode-unmatched-create",
      locationIds: [targetLocation, candidateLocation],
    });
    const candidate = await givenAnchorEventVisiblePR({
      creator,
      event,
      location: candidateLocation,
      title: "System Form Mode manual fallback candidate PR",
    });
    await forceFormMode(event);

    ctx.record("eventId", event.id);
    ctx.record("candidatePrId", candidate.id);
    ctx.record("visitorUserId", visitor.user.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, visitor);
      await installDeterministicShareSidecarStubs(page);

      await page.goto(`/e/${event.id}`);
      await expectFormMode(page);
      await selectLocation(page, targetLocation);
      const recommendation = await submitFormAndReadRecommendation({ page, event });
      assert.equal(recommendation.selection.locationId, targetLocation);
      assert.equal(recommendation.matchedRecommendation, null);
      assert.equal(recommendation.orderedCandidates[0]?.pr.id, candidate.id);

      await page.getByTestId("anchor-event-form-mode.candidate-list").waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await page.getByTestId("anchor-event-form-mode.create-fallback").click();

      await page.waitForURL(
        (url) =>
          /^\/pr\/\d+$/.test(url.pathname) &&
          url.searchParams.get("entry") === "create" &&
          url.searchParams.get("fromEvent") === String(event.id),
        { timeout: 20_000 },
      );
      const createdPrId = readPrIdFromCurrentUrl(page);
      assert.notEqual(createdPrId, candidate.id);
      await expectCreatedPRDetail({
        prId: createdPrId,
        token: visitor.token,
        creatorUserId: visitor.user.id,
        event,
        locationId: targetLocation,
      });
    });
  },
);

scenario(
  "anchor_event_form_mode_unmatched_zero_candidates_auto_creates_pr",
  async (ctx) => {
    const visitor = await givenWeChatBoundUser(
      "system-form-mode-zero-candidates-visitor",
    );
    const event = await givenAnchorEvent({
      label: "form-mode-zero-candidates",
    });
    await forceFormMode(event);

    ctx.record("eventId", event.id);
    ctx.record("visitorUserId", visitor.user.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, visitor);
      await installDeterministicShareSidecarStubs(page);

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/pr/new/form") &&
          response.request().method() === "POST",
        { timeout: 20_000 },
      );

      await page.goto(`/e/${event.id}`);
      await expectFormMode(page);
      const recommendation = await submitFormAndReadRecommendation({ page, event });
      assert.equal(recommendation.matchedRecommendation, null);
      assert.deepEqual(recommendation.orderedCandidates, []);
      const createResponse = await createResponsePromise;
      assert.equal(createResponse.status(), 201);
      const createRequestBody = JSON.parse(
        createResponse.request().postData() ?? "{}",
      ) as Record<string, unknown>;
      assert.equal(createRequestBody.createSource, "EVENT_ASSISTED");

      await page.waitForURL(
        (url) =>
          /^\/pr\/\d+$/.test(url.pathname) &&
          url.searchParams.get("entry") === "create" &&
          url.searchParams.get("fromEvent") === String(event.id) &&
          url.searchParams.get("handoff") === "event_assisted_create",
        { timeout: 20_000 },
      );
      const createdPrId = readPrIdFromCurrentUrl(page);
      await page
        .getByTestId("pr-detail.event-assisted-create.notice")
        .waitFor({
          state: "visible",
          timeout: 10_000,
        });
      await expectCreatedPRDetail({
        prId: createdPrId,
        token: visitor.token,
        creatorUserId: visitor.user.id,
        event,
        locationId: event.locationId,
      });
    });
  },
);

scenario(
  "anchor_event_form_mode_route_pool_zero_candidates_auto_creates_route_pr",
  async (ctx) => {
    const visitor = await givenWeChatBoundUser(
      "system-form-mode-route-create-visitor",
    );
    const event = await givenAnchorEvent({
      label: "form-mode-route-zero-candidates",
      routePool: [
        {
          id: "system-route-pool-entry",
          route: formModeRoutePoolRoute,
        },
      ],
    });
    await forceFormMode(event);

    ctx.record("eventId", event.id);
    ctx.record("visitorUserId", visitor.user.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, visitor);
      await installDeterministicShareSidecarStubs(page);

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/pr/new/form") &&
          response.request().method() === "POST",
        { timeout: 20_000 },
      );

      await page.goto(`/e/${event.id}`);
      await expectFormMode(page);
      await expectRouteSelected(page, "system-route-pool-entry");

      const recommendation = await submitFormAndReadRecommendation({
        page,
        event,
      });
      assert.equal(recommendation.selection.kind, "route");
      assert.equal(recommendation.selection.locationId, null);
      assert.equal(
        recommendation.selection.routePoolEntryId,
        "system-route-pool-entry",
      );
      assert.equal(recommendation.matchedRecommendation, null);
      assert.deepEqual(recommendation.orderedCandidates, []);

      const createResponse = await createResponsePromise;
      assert.equal(createResponse.status(), 201);
      const createRequestBody = JSON.parse(
        createResponse.request().postData() ?? "{}",
      ) as {
        createSource?: unknown;
        fields?: {
          location?: unknown;
          route?: unknown;
        };
      };
      assert.equal(createRequestBody.createSource, "EVENT_ASSISTED");
      assert.equal(createRequestBody.fields?.location, null);
      assert.deepEqual(createRequestBody.fields?.route, formModeRoutePoolRoute);

      await page.waitForURL(
        (url) =>
          /^\/pr\/\d+$/.test(url.pathname) &&
          url.searchParams.get("entry") === "create" &&
          url.searchParams.get("fromEvent") === String(event.id) &&
          url.searchParams.get("handoff") === "event_assisted_create",
        { timeout: 20_000 },
      );
      const createdPrId = readPrIdFromCurrentUrl(page);
      await page
        .getByTestId("pr-detail.event-assisted-create.notice")
        .waitFor({
          state: "visible",
          timeout: 10_000,
        });
      await page.getByTestId("pr-detail.route").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await expectCreatedRoutePRDetail({
        prId: createdPrId,
        token: visitor.token,
        creatorUserId: visitor.user.id,
        event,
        route: formModeRoutePoolRoute,
      });
    });
  },
);
