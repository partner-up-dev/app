import assert from "node:assert/strict";
import type { Page } from "playwright";
import { installScenarioUserSession } from "../_infra/browser/session";
import { withScenarioPage } from "../_infra/browser/browser";
import { scenario } from "../_infra/scenario/scenario";
import {
  givenAnchorEvent,
  givenAnchorEventVisiblePR,
  setAnchorEventLandingRollout,
} from "../../../apps/backend/tests/anchor-event/_kit/builders/anchor-events";
import { givenUser } from "../../../apps/backend/tests/pr-core/_kit/builders/users";

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

    await page.goto(`/e/${cardEvent.id}`);
    await expectCardRichMode(page);

    await page.goto(`/e/${listEvent.id}`);
    await expectListMode(page, listPrTitle);
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
