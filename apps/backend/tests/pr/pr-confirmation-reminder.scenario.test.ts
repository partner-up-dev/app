import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { jobs, type JobRow } from "../../src/entities/job";
import { db } from "../../src/lib/db";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { UserNotificationOptRepository } from "../../src/repositories/UserNotificationOptRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { exitPR } from "./_kit/actions/exit";
import { joinPartnerRequest } from "./_kit/actions/join";
import { bindScenarioWeChatOpenId } from "./_kit/actions/system-state";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";

const userNotificationOptRepo = new UserNotificationOptRepository();
const prRepo = new PartnerRequestRepository();
const activeJobStatuses = new Set(["PENDING", "RETRY", "RUNNING"]);

const isConfirmationTaskFor = (job: JobRow, input: { prId: number; recipientUserId: string }) => {
  const aggregate = job.payload.aggregate;
  return (
    job.payload.template === "pr.confirmation-reminder" &&
    job.payload.recipientUserId === input.recipientUserId &&
    aggregate !== null &&
    typeof aggregate === "object" &&
    "type" in aggregate &&
    aggregate.type === "partner_request" &&
    "id" in aggregate &&
    aggregate.id === String(input.prId)
  );
};

const listConfirmationTasks = async (input: { prId: number; recipientUserId: string }) =>
  (
    await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.jobType, "notification.send.v1"), eq(jobs.jobVersion, 1)))
  ).filter((job) => isConfirmationTaskFor(job, input));

const listActiveConfirmationTasks = async (input: { prId: number; recipientUserId: string }) =>
  (await listConfirmationTasks(input)).filter((job) => activeJobStatuses.has(job.status));

const taskForTrigger = (jobsForPr: JobRow[], trigger: "CONFIRM_START" | "CONFIRM_END_MINUS_30M") =>
  jobsForPr.find(
    (job) =>
      job.payload.payload !== null &&
      typeof job.payload.payload === "object" &&
      "reminder" in job.payload.payload &&
      job.payload.payload.reminder === trigger,
  );

const enableConfirmationPolicy = async (prId: number) =>
  prRepo.updatePartnerRules(prId, {
    confirmationEnabled: true,
    confirmationStartOffsetMinutes: 120,
    confirmationEndOffsetMinutes: 30,
    joinLockOffsetMinutes: 30,
  });

scenario("confirmation_reminder_reconciles_two_triggers_time_change_and_exit", async (ctx) => {
  const creator = await givenUser("confirmation-reminder-creator");
  const participant = await givenUser("confirmation-reminder-participant");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 3,
    expectedCreatedStatus: "OPEN",
    title: "Confirmation reminder reconciliation",
  });
  const taskIdentity = { prId: pr.id, recipientUserId: participant.user.id };
  ctx.record("prId", pr.id);
  ctx.record("participantUserId", participant.user.id);

  await enableConfirmationPolicy(pr.id);
  await userNotificationOptRepo.addOneWechatNotificationCredit(
    participant.user.id,
    "REMINDER_CONFIRMATION",
  );

  await joinPartnerRequest({ pr, user: participant });
  const afterJoin = await listActiveConfirmationTasks(taskIdentity);
  assert.equal(
    afterJoin.length,
    2,
    JSON.stringify(await listConfirmationTasks(taskIdentity), null, 2),
  );

  const confirmationStart = taskForTrigger(afterJoin, "CONFIRM_START");
  const confirmationEnd = taskForTrigger(afterJoin, "CONFIRM_END_MINUS_30M");
  assert.ok(confirmationStart);
  assert.ok(confirmationEnd);
  assert.equal(confirmationStart.status, "PENDING");
  assert.equal(confirmationStart.runAt.toISOString(), "2030-01-01T08:00:00.000Z");
  assert.equal(confirmationStart.resolutionMs, 1);
  assert.equal(confirmationStart.earlyToleranceUnits, 0);
  assert.equal(confirmationStart.lateToleranceUnits, -1);
  assert.equal(confirmationEnd.status, "PENDING");
  assert.equal(confirmationEnd.runAt.toISOString(), "2030-01-01T09:00:00.000Z");
  assert.equal(confirmationEnd.resolutionMs, 5 * 60 * 1_000);
  assert.equal(confirmationEnd.earlyToleranceUnits, 3);
  assert.equal(confirmationEnd.lateToleranceUnits, -1);

  await joinPartnerRequest({ pr, user: participant });
  const afterRepeatedJoin = await listActiveConfirmationTasks(taskIdentity);
  assert.equal(afterRepeatedJoin.length, 2);
  assert.equal(taskForTrigger(afterRepeatedJoin, "CONFIRM_START")?.id, confirmationStart.id);
  assert.equal(taskForTrigger(afterRepeatedJoin, "CONFIRM_END_MINUS_30M")?.id, confirmationEnd.id);

  const changedStartAt = "2030-01-02T10:00:00.000Z";
  const changedEndAt = "2030-01-02T12:00:00.000Z";
  await expectJsonResponse(
    await requestJson(`/api/pr/${pr.id}/content`, {
      method: "PATCH",
      token: creator.token,
      body: {
        fields: {
          title: "Confirmation reminder reconciliation",
          time: [changedStartAt, changedEndAt],
          location: "Scenario Court",
          route: null,
          minPartners: 1,
          maxPartners: 3,
          partners: [],
          budget: null,
          preferences: [],
          notes: null,
          meetingPoint: null,
        },
      },
    }),
    200,
  );

  const afterTimeChange = await listActiveConfirmationTasks(taskIdentity);
  assert.equal(afterTimeChange.length, 2);
  const changedConfirmationStart = taskForTrigger(afterTimeChange, "CONFIRM_START");
  const changedConfirmationEnd = taskForTrigger(afterTimeChange, "CONFIRM_END_MINUS_30M");
  assert.ok(changedConfirmationStart);
  assert.ok(changedConfirmationEnd);
  assert.notEqual(changedConfirmationStart.id, confirmationStart.id);
  assert.notEqual(changedConfirmationEnd.id, confirmationEnd.id);
  assert.equal(changedConfirmationStart.runAt.toISOString(), "2030-01-02T08:00:00.000Z");
  assert.equal(changedConfirmationEnd.runAt.toISOString(), "2030-01-02T09:00:00.000Z");
  assert.equal(
    (await listConfirmationTasks(taskIdentity)).find((job) => job.id === confirmationStart.id)
      ?.status,
    "CANCELED",
  );
  assert.equal(
    (await listConfirmationTasks(taskIdentity)).find((job) => job.id === confirmationEnd.id)
      ?.status,
    "CANCELED",
  );

  await exitPR({ pr, user: participant });
  assert.equal((await listActiveConfirmationTasks(taskIdentity)).length, 0);
  assert.equal(
    (await listConfirmationTasks(taskIdentity)).find(
      (job) => job.id === changedConfirmationStart.id,
    )?.status,
    "CANCELED",
  );
  assert.equal(
    (await listConfirmationTasks(taskIdentity)).find((job) => job.id === changedConfirmationEnd.id)
      ?.status,
    "CANCELED",
  );
});

scenario("confirmation_subscription_rebuilds_generic_tasks_without_legacy_rebuild", async (ctx) => {
  const creator = await givenUser("confirmation-subscription-creator");
  const participant = await givenUser("confirmation-subscription-participant");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 3,
    expectedCreatedStatus: "OPEN",
    title: "Confirmation subscription reconciliation",
  });
  const taskIdentity = { prId: pr.id, recipientUserId: participant.user.id };
  ctx.record("prId", pr.id);
  ctx.record("participantUserId", participant.user.id);

  await enableConfirmationPolicy(pr.id);
  await joinPartnerRequest({ pr, user: participant });
  assert.equal((await listActiveConfirmationTasks(taskIdentity)).length, 0);

  await bindScenarioWeChatOpenId({
    user: participant,
    openId: "openid-confirmation-subscription-participant",
  });
  const granted = await expectJsonResponse<{
    ok: boolean;
    remainingCount: number;
    deletedJobs: number;
  }>(
    await requestJson("/api/wechat/notifications/subscriptions", {
      method: "POST",
      token: participant.token,
      body: { kind: "REMINDER_CONFIRMATION", action: "ADD_ONE" },
    }),
    200,
  );
  assert.equal(granted.ok, true);
  assert.equal(granted.remainingCount, 1);
  assert.equal(granted.deletedJobs, 0);
  assert.equal((await listActiveConfirmationTasks(taskIdentity)).length, 2);
  assert.equal(
    (await db.select().from(jobs).where(eq(jobs.jobType, "wechat.reminder.confirmation"))).length,
    0,
  );

  const cleared = await expectJsonResponse<{
    ok: boolean;
    remainingCount: number;
    deletedJobs: number;
  }>(
    await requestJson("/api/wechat/notifications/subscriptions", {
      method: "POST",
      token: participant.token,
      body: { kind: "REMINDER_CONFIRMATION", action: "CLEAR" },
    }),
    200,
  );
  assert.equal(cleared.ok, true);
  assert.equal(cleared.remainingCount, 0);
  assert.equal(cleared.deletedJobs, 2);
  assert.equal((await listActiveConfirmationTasks(taskIdentity)).length, 0);
  assert.equal((await listConfirmationTasks(taskIdentity)).length, 2);
  assert.ok((await listConfirmationTasks(taskIdentity)).every((job) => job.status === "CANCELED"));
});
