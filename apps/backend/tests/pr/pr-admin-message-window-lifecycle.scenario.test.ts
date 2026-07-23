import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { createAdminPRMessageWindowLifecycleTransactionPort } from "../../src/domains/admin-pr-management/use-cases/pr-message-window-lifecycle-transaction";
import { updatePRMessageNotificationSubscription } from "../../src/domains/notification";
import { notificationTaskPayloadSchema } from "../../src/domains/notification/owner/task";
import { config } from "../../src/entities/config";
import { jobs, type JobRow } from "../../src/entities/job";
import { db } from "../../src/lib/db";
import { PRMessageRepository } from "../../src/repositories/PRMessageRepository";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { bindScenarioWeChatOpenId } from "./_kit/actions/system-state";
import { joinPartnerRequest } from "./_kit/actions/join";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenAdminUser, givenUser } from "./_kit/builders/users";

const PR_MESSAGE_TEMPLATE_CONFIG_KEY = "wechat.submsg_pr_message_template_id";
const messageRepo = new PRMessageRepository();
const prRepo = new PartnerRequestRepository();

const listGenericPRMessageJobs = async (prId: number): Promise<JobRow[]> => {
  const rows = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.jobType, "notification.send.v1"), eq(jobs.jobVersion, 1)));
  return rows.filter((job) => {
    const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
    return (
      parsed.success &&
      parsed.data.template === "pr.message-summary" &&
      parsed.data.payload.prId === prId
    );
  });
};

const preparePRMessageWindow = async (input: {
  prefix: string;
  title: string;
}): Promise<{
  admin: Awaited<ReturnType<typeof givenAdminUser>>;
  creator: Awaited<ReturnType<typeof givenUser>>;
  recipient: Awaited<ReturnType<typeof givenUser>>;
  pr: Awaited<ReturnType<typeof givenPublishedPartnerRequest>>;
  messageId: number;
  window: JobRow;
}> => {
  const creator = await givenUser(`${input.prefix}-creator`);
  const recipient = await givenUser(`${input.prefix}-recipient`);
  const admin = await givenAdminUser(`${input.prefix}-admin`);
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 3,
    expectedCreatedStatus: "OPEN",
    title: input.title,
  });

  await Promise.all([
    joinPartnerRequest({ pr, user: recipient }),
    bindScenarioWeChatOpenId({
      user: recipient,
      openId: `openid-${input.prefix}-recipient`,
    }),
    db
      .insert(config)
      .values({ key: PR_MESSAGE_TEMPLATE_CONFIG_KEY, value: "scenario-pr-message-template" })
      .onConflictDoUpdate({
        target: config.key,
        set: { value: "scenario-pr-message-template" },
      }),
  ]);
  await updatePRMessageNotificationSubscription({
    recipientUserId: recipient.user.id,
    action: "ADD_ONE",
  });

  const created = await expectJsonResponse<{
    message: { id: number };
  }>(
    await requestJson(`/api/pr/${pr.id}/messages`, {
      method: "POST",
      token: creator.token,
      body: { body: "Source message that opens an attention window" },
    }),
    200,
  );
  const [window] = await listGenericPRMessageJobs(pr.id);
  assert.ok(window);
  assert.equal(window.status, "PENDING");
  assert.equal(window.reservationState, "HELD");

  return {
    admin,
    creator,
    recipient,
    pr,
    messageId: created.message.id,
    window,
  };
};

scenario(
  "admin_message_tombstone_hides_thread_keeps_cursor_and_releases_current_window",
  async (ctx) => {
    const fixture = await preparePRMessageWindow({
      prefix: "admin-message-tombstone-window",
      title: "Admin message tombstone window",
    });
    ctx.record("prId", fixture.pr.id);
    ctx.record("messageId", fixture.messageId);
    ctx.record("recipientUserId", fixture.recipient.user.id);

    await expectJsonResponse(
      await requestJson(`/api/admin/prs/${fixture.pr.id}/messages/${fixture.messageId}`, {
        method: "DELETE",
        token: fixture.admin.token,
      }),
      200,
    );

    const [visibleThread, visibleMessage, tombstonedMessage, acknowledgementCursor, currentJobs] =
      await Promise.all([
        expectJsonResponse<{ items: Array<{ id: number }> }>(
          await requestJson(`/api/pr/${fixture.pr.id}/messages`, {
            token: fixture.creator.token,
          }),
          200,
        ),
        messageRepo.findByPrIdAndId(fixture.pr.id, fixture.messageId),
        messageRepo.findByPrIdAndIdIncludingTombstone(fixture.pr.id, fixture.messageId),
        messageRepo.findLatestAcknowledgementCursorByPrId(fixture.pr.id),
        listGenericPRMessageJobs(fixture.pr.id),
      ]);
    assert.deepEqual(visibleThread.items, []);
    assert.equal(visibleMessage, null);
    assert.equal(tombstonedMessage?.id, fixture.messageId);
    assert.ok(tombstonedMessage?.deletedAt);
    assert.equal(acknowledgementCursor, fixture.messageId);

    const releasedWindow = currentJobs.find((job) => job.id === fixture.window.id);
    assert.equal(releasedWindow?.status, "CANCELED");
    assert.equal(releasedWindow?.reservationState, "RELEASED");

    const repeatedDelete = await requestJson(
      `/api/admin/prs/${fixture.pr.id}/messages/${fixture.messageId}`,
      {
        method: "DELETE",
        token: fixture.admin.token,
      },
    );
    assert.equal(repeatedDelete.status, 404);
  },
);

scenario("admin_message_tombstone_rolls_back_when_window_release_fails", async (ctx) => {
  const creator = await givenUser("admin-message-tombstone-rollback-creator");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Admin message tombstone rollback",
  });
  ctx.record("prId", pr.id);
  const message = await messageRepo.create({
    prId: pr.id,
    authorUserId: creator.user.id,
    body: "Source row must remain visible if invalidation fails",
  });
  assert.ok(message);

  const failingLifecycle = createAdminPRMessageWindowLifecycleTransactionPort({
    createNotificationPort: () => ({
      async invalidateForRecipientAndAggregate() {
        throw new Error("SCENARIO_NOTIFICATION_RELEASE_FAILED");
      },
      async invalidateForRecipient() {
        throw new Error("SCENARIO_NOTIFICATION_RELEASE_FAILED");
      },
    }),
  });

  await assert.rejects(
    failingLifecycle.tombstoneMessage({ prId: pr.id, messageId: message.id }),
    /SCENARIO_NOTIFICATION_RELEASE_FAILED/,
  );

  const stillVisible = await messageRepo.findByPrIdAndId(pr.id, message.id);
  assert.equal(stillVisible?.id, message.id);
  assert.equal(stillVisible?.deletedAt, null);

  await assert.rejects(
    failingLifecycle.deleteRoot({ prId: pr.id }),
    /SCENARIO_NOTIFICATION_RELEASE_FAILED/,
  );
  const rootAfterFailedDelete = await prRepo.findById(pr.id);
  assert.equal(rootAfterFailedDelete?.id, pr.id);
});

scenario("admin_root_delete_releases_windows_before_cascade", async (ctx) => {
  const fixture = await preparePRMessageWindow({
    prefix: "admin-root-delete-window",
    title: "Admin root delete window",
  });
  ctx.record("prId", fixture.pr.id);
  ctx.record("recipientUserId", fixture.recipient.user.id);

  await expectJsonResponse(
    await requestJson(`/api/admin/prs/${fixture.pr.id}`, {
      method: "DELETE",
      token: fixture.admin.token,
    }),
    200,
  );

  const [deletedPR, currentJobs] = await Promise.all([
    prRepo.findById(fixture.pr.id),
    listGenericPRMessageJobs(fixture.pr.id),
  ]);
  assert.equal(deletedPR, null);

  // Job rows deliberately do not have an FK to PR. The admin transaction
  // therefore has to release this held generation before root cascade removes
  // the source record and its messages.
  const releasedWindow = currentJobs.find((job) => job.id === fixture.window.id);
  assert.ok(releasedWindow);
  assert.equal(releasedWindow.status, "CANCELED");
  assert.equal(releasedWindow.reservationState, "RELEASED");
});
