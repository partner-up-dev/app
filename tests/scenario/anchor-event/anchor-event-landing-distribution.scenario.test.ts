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
import {
  givenUser,
  type ScenarioUser,
} from "../../../apps/backend/tests/pr-core/_kit/builders/users";

const FORM_ONLY = {
  FORM: 100,
  CARD_RICH: 0,
  LIST: 0,
};

const CARD_RICH_ONLY = {
  FORM: 0,
  CARD_RICH: 100,
  LIST: 0,
};

const LIST_ONLY = {
  FORM: 0,
  CARD_RICH: 0,
  LIST: 100,
};

type PRDetailProbe = {
  id: number;
  status: string;
  createdBy?: string | null;
  core: {
    type: string;
    location: string | null;
  };
};

const givenWeChatBoundUser = async (label: string): Promise<ScenarioUser> => {
  const user = await givenUser(label);
  await bindScenarioWeChatOpenId({
    user,
    openId: `${label}-openid`,
  });
  return user;
};

const expectLandingPage = async (page: Page) => {
  await page.getByTestId("anchor-event-landing.page").waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

const expectFormMode = async (page: Page) => {
  await expectLandingPage(page);
  await page.getByTestId("anchor-event-form-mode.surface").waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

const expectCardRichMode = async (page: Page) => {
  await expectLandingPage(page);
  await page
    .locator(
      '[data-testid="anchor-event-card-mode.surface"][data-mode-state="active"]',
    )
    .waitFor({
      state: "visible",
      timeout: 10_000,
    });
};

const expectListModeSurface = async (page: Page) => {
  await expectLandingPage(page);
  const listSurface = page.getByTestId("anchor-event-list-mode.surface");
  await listSurface.waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

const expectOtherEventsHeaderAction = async (page: Page) => {
  await page.getByTestId("anchor-event-landing.other-events.open").waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

const expectListMode = async (page: Page, prTitle: string) => {
  await expectListModeSurface(page);
  const prList = page.getByTestId("anchor-event-list-mode.pr-list");
  await prList.waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await prList.getByText(prTitle).waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

const switchLandingMode = async (
  page: Page,
  mode: "list" | "card" | "form",
) => {
  const option = page.getByTestId(`anchor-event-landing.mode.${mode}`);
  await option.evaluate((element) =>
    element.scrollIntoView({ block: "end", inline: "nearest" }),
  );
  await option.click();
};

const expectNoBetaGroupCard = async (page: Page) => {
  assert.equal(
    await page.getByTestId("anchor-event.beta-group-card").count(),
    0,
  );
};

const readPrIdFromCurrentUrl = (page: Page): number => {
  const url = new URL(page.url());
  const match = /^\/pr\/(\d+)$/.exec(url.pathname);
  assert.ok(match, `Expected PR detail URL, got ${url.pathname}`);
  const prId = Number(match[1]);
  assert.ok(Number.isInteger(prId) && prId > 0);
  return prId;
};

const waitForEventAssistedCreateResponse = async (page: Page) => {
  const response = await page.waitForResponse(
    (candidate) =>
      candidate.url().includes("/api/pr/new/form") &&
      candidate.request().method() === "POST",
    { timeout: 20_000 },
  );
  assert.equal(response.status(), 201);
  const body = JSON.parse(response.request().postData() ?? "{}") as Record<
    string,
    unknown
  >;
  assert.equal(body.createSource, "EVENT_ASSISTED");
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

scenario("anchor_event_landing_distribution_renders_all_modes", async (ctx) => {
  const creator = await givenUser("system-anchor-landing-distribution-creator");
  const visitor = await givenUser("system-anchor-landing-distribution-visitor");

  const formEvent = await givenAnchorEvent({ label: "form-mode" });
  const cardEvent = await givenAnchorEvent({ label: "card-rich-mode" });
  const listEvent = await givenAnchorEvent({ label: "list-mode" });

  const cardPrTitle = "System Card Rich distribution PR";
  const listPrTitle = "System List distribution PR";
  const cardPr = await givenAnchorEventVisiblePR({
    creator,
    event: cardEvent,
    title: cardPrTitle,
  });
  const listPr = await givenAnchorEventVisiblePR({
    creator,
    event: listEvent,
    title: listPrTitle,
  });

  await setAnchorEventLandingRollout({
    eventId: formEvent.id,
    ratios: FORM_ONLY,
    assignmentRevision: 1,
  });
  await setAnchorEventLandingRollout({
    eventId: cardEvent.id,
    ratios: CARD_RICH_ONLY,
    assignmentRevision: 1,
  });
  await setAnchorEventLandingRollout({
    eventId: listEvent.id,
    ratios: LIST_ONLY,
    assignmentRevision: 1,
  });

  ctx.record("formEventId", formEvent.id);
  ctx.record("cardEventId", cardEvent.id);
  ctx.record("listEventId", listEvent.id);
  ctx.record("cardPrId", cardPr.id);
  ctx.record("listPrId", listPr.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);

    await page.goto(`/e/${formEvent.id}`);
    await expectFormMode(page);
    await expectOtherEventsHeaderAction(page);

    await page.goto(`/e/${cardEvent.id}`);
    await expectCardRichMode(page);
    await expectOtherEventsHeaderAction(page);

    await page.goto(`/e/${listEvent.id}`);
    await expectListMode(page, listPrTitle);
    await expectOtherEventsHeaderAction(page);
    await expectNoBetaGroupCard(page);
  });
});

scenario("anchor_event_landing_footer_switches_modes", async (ctx) => {
  const creator = await givenUser("system-anchor-landing-switch-creator");
  const visitor = await givenUser("system-anchor-landing-switch-visitor");
  const event = await givenAnchorEvent({ label: "footer-mode-switch" });
  const prTitle = "System footer switch PR";
  const pr = await givenAnchorEventVisiblePR({
    creator,
    event,
    title: prTitle,
  });

  await setAnchorEventLandingRollout({
    eventId: event.id,
    ratios: FORM_ONLY,
    assignmentRevision: 1,
  });

  ctx.record("eventId", event.id);
  ctx.record("prId", pr.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);

    await page.goto(`/e/${event.id}`);
    await expectFormMode(page);
    await page.getByTestId("anchor-event-landing.mode-switch").waitFor({
      state: "visible",
      timeout: 10_000,
    });

    await switchLandingMode(page, "list");
    await expectListMode(page, prTitle);

    await switchLandingMode(page, "card");
    await expectCardRichMode(page);

    await switchLandingMode(page, "form");
    await expectFormMode(page);
  });
});

scenario("anchor_event_card_mode_event_assisted_create_happy_path", async (ctx) => {
  const visitor = await givenWeChatBoundUser(
    "system-anchor-card-assisted-create-visitor",
  );
  const event = await givenAnchorEvent({ label: "card-assisted-create" });

  await setAnchorEventLandingRollout({
    eventId: event.id,
    ratios: CARD_RICH_ONLY,
    assignmentRevision: 1,
  });

  ctx.record("eventId", event.id);
  ctx.record("visitorUserId", visitor.user.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/e/${event.id}`);
    await expectLandingPage(page);
    await page
      .locator(
        '[data-testid="anchor-event-card-mode.surface"][data-mode-state="empty"]',
      )
      .waitFor({
        state: "visible",
        timeout: 10_000,
      });

    const createResponsePromise = waitForEventAssistedCreateResponse(page);
    await page.getByTestId("anchor-event-card-mode.empty-create").click();
    await createResponsePromise;

    await page.waitForURL(
      (url) =>
        /^\/pr\/\d+$/.test(url.pathname) &&
        url.searchParams.get("entry") === "create" &&
        url.searchParams.get("fromEvent") === String(event.id),
      { timeout: 20_000 },
    );
    const createdPrId = readPrIdFromCurrentUrl(page);
    await expectCreatedPRDetail({
      prId: createdPrId,
      token: visitor.token,
      creatorUserId: visitor.user.id,
      event,
      locationId: event.locationId,
    });
  });
});

scenario("anchor_event_list_mode_event_assisted_create_happy_path", async (ctx) => {
  const visitor = await givenWeChatBoundUser(
    "system-anchor-list-assisted-create-visitor",
  );
  const event = await givenAnchorEvent({ label: "list-assisted-create" });

  await setAnchorEventLandingRollout({
    eventId: event.id,
    ratios: LIST_ONLY,
    assignmentRevision: 1,
  });

  ctx.record("eventId", event.id);
  ctx.record("visitorUserId", visitor.user.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/e/${event.id}`);
    await expectListModeSurface(page);

    const createResponsePromise = waitForEventAssistedCreateResponse(page);
    await page.getByTestId("anchor-event.create-card.create").click();
    await createResponsePromise;

    await page.waitForURL(
      (url) =>
        /^\/pr\/\d+$/.test(url.pathname) &&
        url.searchParams.get("entry") === "create" &&
        url.searchParams.get("fromEvent") === String(event.id),
      { timeout: 20_000 },
    );
    const createdPrId = readPrIdFromCurrentUrl(page);
    await expectCreatedPRDetail({
      prId: createdPrId,
      token: visitor.token,
      creatorUserId: visitor.user.id,
      event,
      locationId: event.locationId,
    });
  });
});

scenario(
  "anchor_event_landing_distribution_keeps_mode_stable_until_revision_changes",
  async (ctx) => {
    const creator = await givenUser("system-anchor-landing-stability-creator");
    const visitor = await givenUser("system-anchor-landing-stability-visitor");
    const event = await givenAnchorEvent({ label: "revision-stability" });
    const prTitle = "System revision stable list PR";
    const pr = await givenAnchorEventVisiblePR({
      creator,
      event,
      title: prTitle,
    });

    await setAnchorEventLandingRollout({
      eventId: event.id,
      ratios: LIST_ONLY,
      assignmentRevision: 10,
    });

    ctx.record("eventId", event.id);
    ctx.record("prId", pr.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, visitor);

      await page.goto(`/e/${event.id}`);
      await expectListMode(page, prTitle);

      await setAnchorEventLandingRollout({
        eventId: event.id,
        ratios: FORM_ONLY,
        assignmentRevision: 10,
      });
      await page.reload();
      await expectListMode(page, prTitle);

      await setAnchorEventLandingRollout({
        eventId: event.id,
        ratios: FORM_ONLY,
        assignmentRevision: 11,
      });
      await page.reload();
      await expectFormMode(page);
    });
  },
);

scenario(
  "anchor_event_card_mode_empty_state_hides_beta_group_card_without_qr",
  async (ctx) => {
    const visitor = await givenUser(
      "system-anchor-card-no-beta-group-visitor",
    );
    const event = await givenAnchorEvent({ label: "card-no-beta-group" });

    await setAnchorEventLandingRollout({
      eventId: event.id,
      ratios: CARD_RICH_ONLY,
      assignmentRevision: 1,
    });

    ctx.record("eventId", event.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, visitor);

      await page.goto(`/e/${event.id}`);
      await expectLandingPage(page);
      await page
        .locator(
          '[data-testid="anchor-event-card-mode.surface"][data-mode-state="empty"]',
        )
        .waitFor({
          state: "visible",
          timeout: 10_000,
        });
      await expectNoBetaGroupCard(page);
    });
  },
);

scenario(
  "anchor_event_list_mode_admin_only_highlights_beta_group_card",
  async (ctx) => {
    const visitor = await givenUser("system-anchor-list-beta-group-visitor");
    const event = await givenAnchorEvent({
      label: "list-beta-group",
      prCreationPolicy: "ADMIN_ONLY",
      betaGroupQrCode: "https://example.com/list-beta-group.png",
    });

    await setAnchorEventLandingRollout({
      eventId: event.id,
      ratios: LIST_ONLY,
      assignmentRevision: 1,
    });

    ctx.record("eventId", event.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, visitor);

      await page.goto(`/e/${event.id}`);
      await expectLandingPage(page);
      await page.getByTestId("anchor-event-list-mode.surface").waitFor({
        state: "visible",
        timeout: 10_000,
      });

      const betaGroupCard = page.getByTestId("anchor-event.beta-group-card");
      await betaGroupCard.waitFor({ state: "visible", timeout: 10_000 });
      const betaGroupCardElement = await betaGroupCard.elementHandle();
      assert.ok(betaGroupCardElement);
      await page.waitForFunction(
        (element) =>
          element instanceof HTMLElement &&
          element.classList.contains(
            "anchor-event-beta-group-card-shell--flash",
          ),
        betaGroupCardElement,
        { timeout: 4_000 },
      );
      await betaGroupCard
        .getByRole("img", { name: `${event.title} 搭子群二维码` })
        .waitFor({ state: "visible", timeout: 4_000 });
    });
  },
);

scenario(
  "anchor_event_landing_distribution_uses_list_fallback_on_assignment_timeout",
  async (ctx) => {
    const creator = await givenUser("system-anchor-landing-timeout-creator");
    const visitor = await givenUser("system-anchor-landing-timeout-visitor");
    const event = await givenAnchorEvent({ label: "timeout-fallback" });
    const prTitle = "System timeout fallback list PR";
    const pr = await givenAnchorEventVisiblePR({
      creator,
      event,
      title: prTitle,
    });

    await setAnchorEventLandingRollout({
      eventId: event.id,
      ratios: LIST_ONLY,
      assignmentRevision: 1,
    });

    ctx.record("eventId", event.id);
    ctx.record("prId", pr.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, visitor);
      let assignmentRequestCount = 0;
      await page.route(
        `**/api/events/${event.id}/landing-assignment`,
        async (route) => {
          assignmentRequestCount += 1;
          await new Promise((resolve) => setTimeout(resolve, 800));
          await route.continue();
        },
      );

      await page.goto(`/e/${event.id}`);
      await expectListMode(page, prTitle);
      assert.equal(assignmentRequestCount, 1);

      await page.goto(`/e/${event.id}?mode=form`);
      await expectFormMode(page);
      assert.equal(assignmentRequestCount, 1);
    });
  },
);
