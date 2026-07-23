import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { updatePRMessageNotificationSubscription } from "../../src/domains/notification";
import { notificationTaskPayloadSchema } from "../../src/domains/notification/owner/task";
import { config } from "../../src/entities/config";
import { jobs, type JobRow } from "../../src/entities/job";
import type { JobHandlerContext } from "../../src/infra/jobs";
import { createNotificationOwnerRuntime } from "../../src/infra/notifications/notification-owner-runtime";
import { db } from "../../src/lib/db";
import { UserNotificationOptRepository } from "../../src/repositories/UserNotificationOptRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { joinPartnerRequest } from "./_kit/actions/join";
import { bindScenarioWeChatOpenId } from "./_kit/actions/system-state";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";

const PR_MESSAGE_TEMPLATE_CONFIG_KEY = "wechat.submsg_pr_message_template_id";
const notificationOptRepo = new UserNotificationOptRepository();

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

const contextFor = (job: JobRow): JobHandlerContext => {
  if (job.windowStartCursor === null) {
    throw new Error("SCENARIO_EXPECTED_HELD_MESSAGE_WINDOW_CURSOR");
  }
  return {
    jobId: job.id,
    jobVersion: job.jobVersion,
    attempts: job.attempts,
    runAt: job.runAt,
    windowStartCursor: job.windowStartCursor,
    source: "manual",
    leaseToken: "scenario-generic-revocation",
    isCreationReservationHeld: async () => true,
  };
};

scenario("generic_pr_message_43101_uses_canonical_clear_without_historical_replay", async (ctx) => {
  const creator = await givenUser("generic-revocation-creator");
  const recipient = await givenUser("generic-revocation-recipient");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 3,
    expectedCreatedStatus: "OPEN",
    title: "Generic PR-message revocation",
  });
  ctx.record("prId", pr.id);
  ctx.record("recipientUserId", recipient.user.id);

  await Promise.all([
    joinPartnerRequest({ pr, user: recipient }),
    bindScenarioWeChatOpenId({
      user: recipient,
      openId: "openid-generic-pr-message-revocation",
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

  await expectJsonResponse(
    await requestJson(`/api/pr/${pr.id}/messages`, {
      method: "POST",
      token: creator.token,
      body: { body: "The held generation that receives a generic 43101" },
    }),
    200,
  );
  const [heldWindow] = await listGenericPRMessageJobs(pr.id);
  assert.ok(heldWindow);
  assert.equal(heldWindow.status, "PENDING");
  assert.equal(heldWindow.reservationState, "HELD");

  const task = notificationTaskPayloadSchema.parse(heldWindow.payload);
  if (task.template !== "pr.message-summary") {
    throw new Error("SCENARIO_EXPECTED_PR_MESSAGE_SUMMARY_TASK");
  }
  const owner = createNotificationOwnerRuntime({
    channel: {
      send: async () => ({
        outcome: "RECIPIENT_PERMISSION_REVOKED",
        errorCode: "43101",
        errorMessage: "subscription permission revoked",
      }),
    },
  });
  assert.deepEqual(await owner.dispatch(task, contextFor(heldWindow)), {
    disposition: "PERMANENT_FAILURE",
    reason: "RECIPIENT_PERMISSION_REVOKED",
  });

  const [optionAfterRevocation, jobsAfterRevocation] = await Promise.all([
    notificationOptRepo.findByUserId(recipient.user.id),
    listGenericPRMessageJobs(pr.id),
  ]);
  assert.equal(optionAfterRevocation?.wechatPrMessageOptIn, false);
  assert.equal(optionAfterRevocation?.wechatPrMessageRemainingCount, 0);
  const revokedWindow = jobsAfterRevocation.find((job) => job.id === heldWindow.id);
  assert.equal(revokedWindow?.status, "CANCELED");
  assert.equal(revokedWindow?.reservationState, "RELEASED");

  const restored = await updatePRMessageNotificationSubscription({
    recipientUserId: recipient.user.id,
    action: "ADD_ONE",
  });
  assert.deepEqual(restored.current, { preferred: true, remainingCredit: 1 });
  assert.deepEqual(restored.invalidated, { released: 0, canceled: 0 });
  assert.equal((await listGenericPRMessageJobs(pr.id)).length, 1);

  await expectJsonResponse(
    await requestJson(`/api/pr/${pr.id}/messages`, {
      method: "POST",
      token: creator.token,
      body: { body: "Only this later source fact can open a fresh generation" },
    }),
    200,
  );
  const allGenerations = await listGenericPRMessageJobs(pr.id);
  assert.equal(allGenerations.length, 2);
  assert.equal(
    allGenerations.filter((job) => job.status === "PENDING" && job.reservationState === "HELD")
      .length,
    1,
  );
});
