import assert from "node:assert/strict";
import {
  bindScenarioWeChatOpenId,
  configureScenarioConfirmationReminderTemplate,
} from "../../../apps/backend/tests/pr-core/_kit/actions/system-state";
import { givenPublishedPartnerRequest } from "../../../apps/backend/tests/pr-core/_kit/builders/partner-requests";
import { givenUser } from "../../../apps/backend/tests/pr-core/_kit/builders/users";
import {
  givenPRTypeConfig,
  givenPRTypeVisiblePR,
} from "../../../apps/backend/tests/pr-discovery/_kit/builders/pr-type-config";
import { withScenarioPage } from "../_infra/browser/browser";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { scenario } from "../_infra/scenario/scenario";

const PENDING_WECHAT_ACTION_STORAGE_KEY = "partner_up_pending_wechat_action";

scenario("pr_detail_join_flow_reaches_confirm_action", async (ctx) => {
  const creator = await givenUser("system-pr-detail-creator");
  const joiner = await givenUser("system-pr-detail-joiner");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 2,
    maxPartners: null,
    title: "System scenario badminton partner request",
  });
  await bindScenarioWeChatOpenId({
    user: joiner,
    openId: "system-pr-detail-joiner-openid",
  });
  await configureScenarioConfirmationReminderTemplate();

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("joinerUserId", joiner.user.id);
  ctx.record("prId", pr.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, joiner);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.join.open").click();
    await page.getByTestId("pr-detail.join.confirm").click();
    const confirmationFollowup = page.getByTestId("pr-detail.join-success.confirmation-followup");
    await confirmationFollowup.waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await confirmationFollowup.getByRole("button", { name: "订阅 1 次" }).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByTestId("pr-detail.join-success.confirmation-followup.done").click();
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

scenario("pr_detail_type_community_survives_detail_and_join_followup", async (ctx) => {
  const creator = await givenUser("system-pr-detail-type-community-creator");
  const joiner = await givenUser("system-pr-detail-type-community-joiner");
  const type = await givenPRTypeConfig({
    label: "detail-type-community",
    communityQrCode: "https://example.com/pr-detail-type-community-qr.png",
  });
  const pr = await givenPRTypeVisiblePR({
    creator,
    prType: type,
    title: "System scenario type community partner request",
  });
  await bindScenarioWeChatOpenId({
    user: joiner,
    openId: "system-pr-detail-type-community-joiner-openid",
  });
  await configureScenarioConfirmationReminderTemplate();

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("joinerUserId", joiner.user.id);
  ctx.record("prId", pr.id);
  ctx.record("type", type.type);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, joiner);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.type-community.open").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByTestId("pr-detail.type-community.open").click();
    await page.getByAltText(`${type.title} 搭子群二维码`).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.keyboard.press("Escape");

    await page.getByTestId("pr-detail.discovery.open").click();
    await page.waitForURL((url) => url.pathname === "/prd" && url.search === "", {
      timeout: 10_000,
    });

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.join.open").click();
    await page.getByTestId("pr-detail.join.confirm").click();
    await page.getByTestId("pr-detail.join-success.confirmation-followup").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByTestId("pr-detail.join-success.confirmation-followup.done").click();
    await page.getByTestId("pr-detail.join-success.subscriptions").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByTestId("pr-detail.join-success.done").click();
    await page.getByTestId("pr-detail.join-success.type-community").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByAltText(`${type.title} 搭子群二维码`).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByTestId("pr-detail.join-success.community-followup.done").click();

    await page.getByTestId("pr-detail.participant.confirm-action").waitFor({
      state: "visible",
      timeout: 10_000,
    });
  });
});

scenario("pr_detail_pending_wechat_join_replay_opens_join_gate", async (ctx) => {
  const creator = await givenUser("system-pending-replay-creator");
  const joiner = await givenUser("system-pending-replay-joiner");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 2,
    maxPartners: null,
    title: "System pending WeChat replay partner request",
  });

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("joinerUserId", joiner.user.id);
  ctx.record("prId", pr.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, joiner);
    await installDeterministicShareSidecarStubs(page);

    await page.goto("/");
    await page.evaluate(
      ({ prId, storageKey }) => {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            createdAt: Date.now(),
            kind: "PR_JOIN",
            prId,
          }),
        );
      },
      {
        prId: pr.id,
        storageKey: PENDING_WECHAT_ACTION_STORAGE_KEY,
      },
    );

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.join.confirm").waitFor({
      state: "visible",
      timeout: 10_000,
    });

    const pendingAfterReplay = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      PENDING_WECHAT_ACTION_STORAGE_KEY,
    );
    assert.equal(pendingAfterReplay, null);
  });
});
