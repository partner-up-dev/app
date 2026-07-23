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

const isActivityTaskFor = (job: JobRow, input: { prId: number; recipientUserId: string }) => {
  const aggregate = job.payload.aggregate;
  return (
    job.payload.template === "pr.activity-start-reminder" &&
    job.payload.recipientUserId === input.recipientUserId &&
    aggregate !== null &&
    typeof aggregate === "object" &&
    "type" in aggregate &&
    aggregate.type === "partner_request" &&
    "id" in aggregate &&
    aggregate.id === String(input.prId)
  );
};

const listActivityTasks = async (input: { prId: number; recipientUserId: string }) =>
  (
    await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.jobType, "notification.send.v1"), eq(jobs.jobVersion, 1)))
  ).filter((job) => isActivityTaskFor(job, input));

const listActiveActivityTasks = async (input: { prId: number; recipientUserId: string }) =>
  (await listActivityTasks(input)).filter((job) => activeJobStatuses.has(job.status));

scenario("activity_start_reminder_reconciles_join_time_change_and_exit", async (ctx) => {
  const creator = await givenUser("activity-reminder-creator");
  const participant = await givenUser("activity-reminder-participant");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 3,
    expectedCreatedStatus: "OPEN",
    title: "Activity reminder reconciliation",
  });
  const taskIdentity = { prId: pr.id, recipientUserId: participant.user.id };
  ctx.record("prId", pr.id);
  ctx.record("participantUserId", participant.user.id);

  await prRepo.updatePartnerRules(pr.id, {
    confirmationEnabled: false,
    confirmationStartOffsetMinutes: 120,
    confirmationEndOffsetMinutes: 30,
    joinLockOffsetMinutes: 30,
  });
  await userNotificationOptRepo.addOneWechatNotificationCredit(
    participant.user.id,
    "ACTIVITY_START_REMINDER",
  );

  await joinPartnerRequest({ pr, user: participant });
  const currentOption = await userNotificationOptRepo.findByUserId(participant.user.id);
  assert.equal(currentOption?.wechatActivityStartReminderOptIn, true);
  assert.equal(currentOption?.wechatActivityStartReminderRemainingCount, 1);
  const afterJoin = await listActiveActivityTasks(taskIdentity);
  assert.equal(
    afterJoin.length,
    1,
    JSON.stringify(
      await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1")),
      null,
      2,
    ),
  );
  assert.equal(afterJoin[0]?.status, "PENDING");
  assert.equal(afterJoin[0]?.creationMode, "ONCE");
  assert.equal(afterJoin[0]?.payload.template, "pr.activity-start-reminder");
  assert.deepEqual(afterJoin[0]?.payload.payload, {
    prId: pr.id,
    activityStartAt: "2030-01-01T10:00:00.000Z",
  });

  await joinPartnerRequest({ pr, user: participant });
  const afterRepeatedJoin = await listActiveActivityTasks(taskIdentity);
  assert.equal(afterRepeatedJoin.length, 1);
  assert.equal(afterRepeatedJoin[0]?.id, afterJoin[0]?.id);

  const changedStartAt = "2030-01-02T10:00:00.000Z";
  const changedEndAt = "2030-01-02T12:00:00.000Z";
  await expectJsonResponse(
    await requestJson(`/api/pr/${pr.id}/content`, {
      method: "PATCH",
      token: creator.token,
      body: {
        fields: {
          title: "Activity reminder reconciliation",
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

  const afterTimeChange = await listActiveActivityTasks(taskIdentity);
  assert.equal(afterTimeChange.length, 1);
  assert.notEqual(afterTimeChange[0]?.id, afterJoin[0]?.id);
  assert.deepEqual(afterTimeChange[0]?.payload.payload, {
    prId: pr.id,
    activityStartAt: changedStartAt,
  });
  const priorTask = (await listActivityTasks(taskIdentity)).find(
    (job) => job.id === afterJoin[0]?.id,
  );
  assert.equal(priorTask?.status, "CANCELED");

  await exitPR({ pr, user: participant });
  assert.equal((await listActiveActivityTasks(taskIdentity)).length, 0);
  const currentTask = (await listActivityTasks(taskIdentity)).find(
    (job) => job.id === afterTimeChange[0]?.id,
  );
  assert.equal(currentTask?.status, "CANCELED");
});

scenario(
  "activity_start_subscription_rebuilds_generic_tasks_without_legacy_rebuild",
  async (ctx) => {
    const creator = await givenUser("activity-subscription-creator");
    const participant = await givenUser("activity-subscription-participant");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 3,
      expectedCreatedStatus: "OPEN",
      title: "Activity subscription reconciliation",
    });
    const taskIdentity = { prId: pr.id, recipientUserId: participant.user.id };
    ctx.record("prId", pr.id);
    ctx.record("participantUserId", participant.user.id);

    await prRepo.updatePartnerRules(pr.id, {
      confirmationEnabled: false,
      confirmationStartOffsetMinutes: 120,
      confirmationEndOffsetMinutes: 30,
      joinLockOffsetMinutes: 30,
    });
    await joinPartnerRequest({ pr, user: participant });
    assert.equal((await listActiveActivityTasks(taskIdentity)).length, 0);

    await bindScenarioWeChatOpenId({
      user: participant,
      openId: "openid-activity-subscription-participant",
    });
    const granted = await expectJsonResponse<{
      ok: boolean;
      remainingCount: number;
      deletedJobs: number;
    }>(
      await requestJson("/api/wechat/notifications/subscriptions", {
        method: "POST",
        token: participant.token,
        body: { kind: "ACTIVITY_START_REMINDER", action: "ADD_ONE" },
      }),
      200,
    );
    assert.equal(granted.ok, true);
    assert.equal(granted.remainingCount, 1);
    assert.equal(granted.deletedJobs, 0);
    assert.equal((await listActiveActivityTasks(taskIdentity)).length, 1);
    assert.equal(
      (
        await db
          .select()
          .from(jobs)
          .where(eq(jobs.jobType, "wechat.notification.activity-start-reminder"))
      ).length,
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
        body: { kind: "ACTIVITY_START_REMINDER", action: "CLEAR" },
      }),
      200,
    );
    assert.equal(cleared.ok, true);
    assert.equal(cleared.remainingCount, 0);
    assert.equal(cleared.deletedJobs, 1);
    assert.equal((await listActiveActivityTasks(taskIdentity)).length, 0);
    assert.equal((await listActivityTasks(taskIdentity))[0]?.status, "CANCELED");
  },
);
