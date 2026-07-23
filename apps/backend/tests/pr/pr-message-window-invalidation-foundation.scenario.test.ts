import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import {
  createTransactionBoundPRMessageSummaryNotificationPort,
  updatePRMessageNotificationSubscription,
} from "../../src/domains/notification";
import { notificationTaskPayloadSchema } from "../../src/domains/notification/owner/task";
import { jobs, type JobRow } from "../../src/entities/job";
import { config } from "../../src/entities/config";
import { db } from "../../src/lib/db";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { bindScenarioWeChatOpenId } from "./_kit/actions/system-state";
import { joinPartnerRequest } from "./_kit/actions/join";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenAdminUser, givenUser } from "./_kit/builders/users";

const PR_MESSAGE_TEMPLATE_CONFIG_KEY = "wechat.submsg_pr_message_template_id";

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

const activeHeldJobs = (rows: JobRow[]): JobRow[] =>
  rows.filter(
    (job) =>
      (job.status === "PENDING" || job.status === "RETRY" || job.status === "RUNNING") &&
      job.reservationState === "HELD",
  );

scenario(
  "pr_message_subscription_clear_invalidates_held_window_without_historical_replay",
  async (ctx) => {
    const creator = await givenUser("message-window-invalidation-creator");
    const recipient = await givenUser("message-window-invalidation-recipient");
    const admin = await givenAdminUser("message-window-invalidation-admin");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 3,
      expectedCreatedStatus: "OPEN",
      title: "PR message window invalidation foundation",
    });
    ctx.record("prId", pr.id);
    ctx.record("recipientUserId", recipient.user.id);

    await Promise.all([
      joinPartnerRequest({ pr, user: recipient }),
      bindScenarioWeChatOpenId({
        user: recipient,
        openId: "openid-message-window-invalidation-recipient",
      }),
      db
        .insert(config)
        .values({ key: PR_MESSAGE_TEMPLATE_CONFIG_KEY, value: "scenario-pr-message-template" })
        .onConflictDoUpdate({
          target: config.key,
          set: { value: "scenario-pr-message-template" },
        }),
    ]);

    const initialSubscription = await updatePRMessageNotificationSubscription({
      recipientUserId: recipient.user.id,
      action: "ADD_ONE",
    });
    assert.equal(initialSubscription.previous.preferred, false);
    assert.equal(initialSubscription.previous.remainingCredit, 0);
    assert.equal(initialSubscription.current.preferred, true);
    assert.equal(initialSubscription.current.remainingCredit, 1);
    assert.deepEqual(initialSubscription.invalidated, { released: 0, canceled: 0 });

    await expectJsonResponse(
      await requestJson(`/api/pr/${pr.id}/messages`, {
        method: "POST",
        token: creator.token,
        body: { body: "Source message opens the attention window" },
      }),
      200,
    );

    const firstGeneration = await listGenericPRMessageJobs(pr.id);
    assert.equal(firstGeneration.length, 1);
    const firstWindow = firstGeneration[0];
    assert.ok(firstWindow);
    assert.equal(firstWindow.status, "PENDING");
    assert.equal(firstWindow.reservationState, "HELD");
    assert.equal(firstWindow.creationMode, "UNTIL_ACKNOWLEDGED");
    const firstPayload = notificationTaskPayloadSchema.parse(firstWindow.payload);
    assert.equal(firstPayload.template, "pr.message-summary");
    assert.equal(firstPayload.recipientUserId, recipient.user.id);
    assert.equal(firstPayload.payload.prId, pr.id);

    const cleared = await updatePRMessageNotificationSubscription({
      recipientUserId: recipient.user.id,
      action: "CLEAR",
    });
    assert.equal(cleared.previous.preferred, true);
    assert.equal(cleared.previous.remainingCredit, 1);
    assert.equal(cleared.current.preferred, false);
    assert.equal(cleared.current.remainingCredit, 0);
    assert.deepEqual(cleared.invalidated, { released: 1, canceled: 1 });

    const invalidatedWindow = (await listGenericPRMessageJobs(pr.id)).find(
      (job) => job.id === firstWindow.id,
    );
    assert.ok(invalidatedWindow);
    assert.equal(invalidatedWindow.reservationState, "RELEASED");
    assert.equal(invalidatedWindow.status, "CANCELED");

    const reenabled = await updatePRMessageNotificationSubscription({
      recipientUserId: recipient.user.id,
      action: "ADD_ONE",
    });
    assert.equal(reenabled.previous.preferred, false);
    assert.equal(reenabled.previous.remainingCredit, 0);
    assert.equal(reenabled.current.preferred, true);
    assert.equal(reenabled.current.remainingCredit, 1);
    assert.deepEqual(reenabled.invalidated, { released: 0, canceled: 0 });
    assert.equal((await listGenericPRMessageJobs(pr.id)).length, 1);

    await expectJsonResponse(
      await requestJson(`/api/admin/prs/${pr.id}/messages`, {
        method: "POST",
        token: admin.token,
        body: { body: "Later source message opens a fresh window" },
      }),
      200,
    );

    const generationsAfterLaterSource = await listGenericPRMessageJobs(pr.id);
    assert.equal(generationsAfterLaterSource.length, 2);
    assert.equal(activeHeldJobs(generationsAfterLaterSource).length, 1);
    const reopenedWindow = activeHeldJobs(generationsAfterLaterSource)[0];
    assert.ok(reopenedWindow);
    assert.notEqual(reopenedWindow.id, firstWindow.id);
    assert.equal(reopenedWindow.reservationState, "HELD");
    assert.equal(reopenedWindow.status, "PENDING");
    assert.equal(reopenedWindow.creationMode, "UNTIL_ACKNOWLEDGED");
  },
);

scenario("pr_message_subscription_clear_waits_for_source_window_transaction", async (ctx) => {
  const creator = await givenUser("message-window-invalidation-race-creator");
  const recipient = await givenUser("message-window-invalidation-race-recipient");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 3,
    expectedCreatedStatus: "OPEN",
    title: "PR message window invalidation serialization",
  });
  ctx.record("prId", pr.id);
  ctx.record("recipientUserId", recipient.user.id);

  await Promise.all([
    joinPartnerRequest({ pr, user: recipient }),
    bindScenarioWeChatOpenId({
      user: recipient,
      openId: "openid-message-window-invalidation-race-recipient",
    }),
  ]);
  await updatePRMessageNotificationSubscription({
    recipientUserId: recipient.user.id,
    action: "ADD_ONE",
  });

  let sourceWritten!: () => void;
  const sourceReady = new Promise<void>((resolve) => {
    sourceWritten = resolve;
  });
  let releaseSource!: () => void;
  const sourceGate = new Promise<void>((resolve) => {
    releaseSource = resolve;
  });
  const sourceTransaction = db.transaction(async (tx) => {
    const sourcePort = createTransactionBoundPRMessageSummaryNotificationPort({
      executor: tx,
      isChannelConfigured: async () => true,
    });
    const sourceResult = await sourcePort.requestForSourceRecipients({
      prId: pr.id,
      authorUserId: creator.user.id,
      windowStartCursor: 900001,
      windowOpenedAt: new Date("2036-05-01T10:00:00.000Z"),
      activeRecipientCandidateUserIds: [recipient.user.id],
    });
    assert.deepEqual(sourceResult.recipientUserIds, [recipient.user.id]);
    sourceWritten();
    await sourceGate;
    return sourceResult;
  });

  await sourceReady;
  let clearCompleted = false;
  const clearPromise = updatePRMessageNotificationSubscription({
    recipientUserId: recipient.user.id,
    action: "CLEAR",
  }).then((result) => {
    clearCompleted = true;
    return result;
  });
  await new Promise<void>((resolve) => setTimeout(resolve, 25));
  assert.equal(clearCompleted, false);

  releaseSource();
  const [, cleared] = await Promise.all([sourceTransaction, clearPromise]);
  assert.equal(cleared.current.preferred, false);
  assert.equal(cleared.current.remainingCredit, 0);
  assert.deepEqual(cleared.invalidated, { released: 1, canceled: 1 });

  const sourceJobs = await listGenericPRMessageJobs(pr.id);
  assert.equal(sourceJobs.length, 1);
  assert.equal(sourceJobs[0]?.status, "CANCELED");
  assert.equal(sourceJobs[0]?.reservationState, "RELEASED");
  assert.equal(sourceJobs[0]?.creationMode, "UNTIL_ACKNOWLEDGED");
});
