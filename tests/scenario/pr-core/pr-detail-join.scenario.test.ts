import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { withScenarioPage } from "../_infra/browser/browser";
import { scenario } from "../_infra/scenario/scenario";
import {
  givenAnchorEvent,
  givenAnchorEventVisiblePR,
} from "../../../apps/backend/tests/anchor-event/_kit/builders/anchor-events";
import { givenPublishedPartnerRequest } from "../../../apps/backend/tests/pr-core/_kit/builders/partner-requests";
import { givenUser } from "../../../apps/backend/tests/pr-core/_kit/builders/users";

scenario("pr_detail_join_flow_reaches_confirm_action", async (ctx) => {
  const creator = await givenUser("system-pr-detail-creator");
  const joiner = await givenUser("system-pr-detail-joiner");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 2,
    maxPartners: null,
    title: "System scenario badminton partner request",
  });

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("joinerUserId", joiner.user.id);
  ctx.record("prId", pr.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, joiner);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.join.open").click();
    await page.getByTestId("pr-detail.join.confirm").click();
    await page.getByTestId("pr-detail.join-success.subscriptions").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByTestId("pr-detail.join-success.done").click();

    const confirmAction = page.getByTestId("pr-detail.participant.confirm-action");
    await confirmAction.waitFor({
      state: "visible",
      timeout: 10_000,
    });
  });
});

scenario("pr_detail_join_success_shows_event_beta_group_followup", async (ctx) => {
  const creator = await givenUser("system-pr-detail-beta-group-creator");
  const joiner = await givenUser("system-pr-detail-beta-group-joiner");
  const event = await givenAnchorEvent({
    label: "pr-detail-beta-group-followup",
    betaGroupQrCode: "https://example.com/system-event-beta-group.png",
  });
  const pr = await givenAnchorEventVisiblePR({
    creator,
    event,
    title: "System PR beta group followup",
  });

  ctx.record("eventId", event.id);
  ctx.record("prId", pr.id);
  ctx.record("joinerUserId", joiner.user.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, joiner);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.join.open").click();
    await page.getByTestId("pr-detail.join.confirm").click();
    await page.getByTestId("pr-detail.join-success.subscriptions").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByTestId("pr-detail.join-success.done").click();
    await page
      .getByTestId("pr-detail.join-success.community-followup")
      .waitFor({
        state: "visible",
        timeout: 10_000,
      });
    await page
      .getByRole("img", { name: `${event.title} 活动群二维码` })
      .waitFor({ state: "visible", timeout: 10_000 });
    await page
      .getByTestId("pr-detail.join-success.community-followup.done")
      .click();

    await page.getByTestId("pr-detail.participant.confirm-action").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByTestId("pr-detail.beta-group.open").click();
    await page.getByTestId("pr-detail.beta-group.panel").waitFor({
      state: "visible",
      timeout: 10_000,
    });
  });
});
