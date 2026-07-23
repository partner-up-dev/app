import assert from "node:assert/strict";
import { ConfigRepository } from "../../../apps/backend/src/repositories/ConfigRepository";
import { UserNotificationOptRepository } from "../../../apps/backend/src/repositories/UserNotificationOptRepository";
import { bindScenarioWeChatOpenId } from "../../../apps/backend/tests/pr/_kit/actions/system-state";
import { joinPartnerRequest } from "../../../apps/backend/tests/pr/_kit/actions/join";
import { givenPublishedPartnerRequest } from "../../../apps/backend/tests/pr/_kit/builders/partner-requests";
import { givenUser } from "../../../apps/backend/tests/pr/_kit/builders/users";
import { probePRMessageAttentionWindows } from "../../../apps/backend/tests/pr/_kit/probes/message-attention";
import { withScenarioPage } from "../_infra/browser/browser";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { expectBackendJsonResponse, requestBackendJson } from "../_infra/http/backend";
import { scenario } from "../_infra/scenario/scenario";

type CreatedMessageResponse = {
  message: { id: number };
  thread: { acknowledgementCursor: number | null };
};

const PR_MESSAGE_TEMPLATE_CONFIG_KEY = "wechat.submsg_pr_message_template_id";
const notificationOptRepo = new UserNotificationOptRepository();
const configRepo = new ConfigRepository();

const createMessage = async (input: {
  prId: number;
  token: string;
  body: string;
}): Promise<CreatedMessageResponse> =>
  expectBackendJsonResponse<CreatedMessageResponse>(
    await requestBackendJson(`/api/pr/${input.prId}/messages`, {
      method: "POST",
      token: input.token,
      body: { body: input.body },
    }),
    200,
  );

scenario(
  "pr_messages_visible_route_acknowledges_only_after_render_and_reopens_later_window",
  async (ctx) => {
    const author = await givenUser("system-message-attention-author");
    const recipient = await givenUser("system-message-attention-recipient");
    const pr = await givenPublishedPartnerRequest({
      creator: author,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "OPEN",
      title: "System visible message acknowledgement",
    });
    ctx.record("prId", pr.id);
    ctx.record("recipientUserId", recipient.user.id);

    await Promise.all([
      joinPartnerRequest({ pr, user: recipient }),
      bindScenarioWeChatOpenId({
        user: recipient,
        openId: "openid-system-message-attention-recipient",
      }),
      notificationOptRepo.addOneWechatNotificationCredit(recipient.user.id, "PR_MESSAGE"),
      configRepo.upsertValueByKey(
        PR_MESSAGE_TEMPLATE_CONFIG_KEY,
        "system-message-attention-template",
      ),
    ]);

    const firstMessage = await createMessage({
      prId: pr.id,
      token: author.token,
      body: "A visible route must acknowledge this attention window",
    });
    const firstCursor = firstMessage.thread.acknowledgementCursor;
    assert.equal(firstCursor, firstMessage.message.id);

    const beforeRoute = (await probePRMessageAttentionWindows(pr.id))[0]?.job;
    assert.ok(beforeRoute);
    assert.equal(beforeRoute.reservationState, "HELD");
    assert.equal(beforeRoute.highWaterCursor, firstCursor);
    ctx.record("firstWindowJobId", beforeRoute.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, recipient);
      await installDeterministicShareSidecarStubs(page);

      const acknowledgementResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === `/api/pr/${pr.id}/messages/acknowledgement` &&
          response.request().method() === "POST",
      );
      await page.goto(`/pr/${pr.id}/messages`);
      await page.getByTestId("pr-messages.thread").waitFor({
        state: "visible",
        timeout: 10_000,
      });

      const response = await acknowledgementResponse;
      assert.equal(response.status(), 200);
      assert.deepEqual(response.request().postDataJSON(), {
        acknowledgementCursor: firstCursor,
      });
    });

    const released = (await probePRMessageAttentionWindows(pr.id)).find(
      ({ job }) => job.id === beforeRoute.id,
    )?.job;
    assert.ok(released);
    assert.equal(released.reservationState, "RELEASED");
    assert.equal(released.status, "CANCELED");

    const laterMessage = await createMessage({
      prId: pr.id,
      token: author.token,
      body: "A later source message opens a later attention generation",
    });
    const laterCursor = laterMessage.thread.acknowledgementCursor;
    assert.ok(laterCursor && laterCursor > firstCursor);

    const laterWindow = (await probePRMessageAttentionWindows(pr.id)).find(
      ({ job }) => job.id !== beforeRoute.id,
    )?.job;
    assert.ok(laterWindow);
    assert.equal(laterWindow.reservationState, "HELD");
    assert.equal(laterWindow.highWaterCursor, laterCursor);
    assert.ok((laterWindow.windowStartCursor ?? 0) > (released.highWaterCursor ?? 0));
    ctx.record("laterWindowJobId", laterWindow.id);
  },
);
