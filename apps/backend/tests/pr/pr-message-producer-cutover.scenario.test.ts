import assert from "node:assert/strict";
import { desc, eq } from "drizzle-orm";
import type { PartnerRequest, PartnerRequestFields } from "../../src/entities/partner-request";
import { jobs, type JobRow } from "../../src/entities/job";
import { prMessages } from "../../src/entities/pr-message";
import { config } from "../../src/entities/config";
import {
  notificationTaskPayloadSchema,
  type PRMessageSummaryNotificationTask,
} from "../../src/domains/notification/owner/task";
import { PostgresJobStore } from "../../src/infra/jobs/postgres-job-store";
import { db } from "../../src/lib/db";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { UserNotificationOptRepository } from "../../src/repositories/UserNotificationOptRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { bindScenarioWeChatOpenId } from "./_kit/actions/system-state";
import { joinPartnerRequest } from "./_kit/actions/join";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenAdminUser, givenUser } from "./_kit/builders/users";

type GenericMessageJob = { job: JobRow; task: PRMessageSummaryNotificationTask };

type CreatedMessageResponse = {
  message: { id: number };
  thread: {
    acknowledgementCursor: number | null;
  };
};

const prRepo = new PartnerRequestRepository();
const notificationOptRepo = new UserNotificationOptRepository();
const PR_MESSAGE_TEMPLATE_CONFIG_KEY = "wechat.submsg_pr_message_template_id";

const getGenericMessageJobs = async (prId: number): Promise<GenericMessageJob[]> => {
  const rows = await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"));
  return rows.flatMap((job) => {
    const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
    if (!parsed.success || parsed.data.template !== "pr.message-summary") return [];
    return parsed.data.payload.prId === prId ? [{ job, task: parsed.data }] : [];
  });
};

const getLatestMessageId = async (prId: number): Promise<number> => {
  const rows = await db
    .select({ id: prMessages.id })
    .from(prMessages)
    .where(eq(prMessages.prId, prId))
    .orderBy(desc(prMessages.id))
    .limit(1);
  assert.ok(rows[0]);
  return rows[0].id;
};

const toUserContentFields = (
  request: PartnerRequest,
  overrides: Partial<Omit<PartnerRequestFields, "type">> = {},
): Omit<PartnerRequestFields, "type"> => {
  const { type: _type, ...fields } = {
    title: request.title ?? undefined,
    type: request.type,
    time: request.time,
    location: request.location,
    route: request.route,
    minPartners: request.minPartners,
    maxPartners: request.maxPartners,
    partners: [],
    budget: request.budget,
    preferences: request.preferences,
    notes: request.notes,
    meetingPoint: request.meetingPoint,
    ...overrides,
  } satisfies PartnerRequestFields;
  return fields;
};

scenario("pr_message_producer_uses_one_generic_window", async (ctx) => {
  await db.delete(config).where(eq(config.key, PR_MESSAGE_TEMPLATE_CONFIG_KEY));
  const noChannelCreator = await givenUser("message-cutover-no-channel-creator");
  const noChannelRecipient = await givenUser("message-cutover-no-channel-recipient");
  const noChannelPR = await givenPublishedPartnerRequest({
    creator: noChannelCreator,
    minPartners: 1,
    maxPartners: 3,
    expectedCreatedStatus: "OPEN",
    title: "PR message producer cutover missing channel",
  });
  await joinPartnerRequest({ pr: noChannelPR, user: noChannelRecipient });
  await bindScenarioWeChatOpenId({
    user: noChannelRecipient,
    openId: "openid-message-cutover-no-channel-recipient",
  });
  await notificationOptRepo.addOneWechatNotificationCredit(
    noChannelRecipient.user.id,
    "PR_MESSAGE",
  );
  await expectJsonResponse(
    await requestJson(`/api/pr/${noChannelPR.id}/messages`, {
      method: "POST",
      token: noChannelCreator.token,
      body: { body: "Missing channel still persists source message" },
    }),
    200,
  );
  assert.equal(
    (await db.select().from(prMessages).where(eq(prMessages.prId, noChannelPR.id))).length,
    1,
  );
  assert.equal((await getGenericMessageJobs(noChannelPR.id)).length, 0);

  const creator = await givenUser("message-cutover-creator");
  const recipient = await givenUser("message-cutover-recipient");
  const creditWithoutOpenIdRecipient = await givenUser("message-cutover-credit-without-openid");
  const openIdWithoutCreditRecipient = await givenUser("message-cutover-openid-without-credit");
  const admin = await givenAdminUser("message-cutover-admin");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 6,
    expectedCreatedStatus: "OPEN",
    title: "PR message producer cutover",
  });
  ctx.record("prId", pr.id);

  await Promise.all([
    joinPartnerRequest({ pr, user: recipient }),
    joinPartnerRequest({ pr, user: creditWithoutOpenIdRecipient }),
    joinPartnerRequest({ pr, user: openIdWithoutCreditRecipient }),
    bindScenarioWeChatOpenId({ user: recipient, openId: "openid-message-cutover-recipient" }),
    bindScenarioWeChatOpenId({
      user: openIdWithoutCreditRecipient,
      openId: "openid-message-cutover-openid-without-credit",
    }),
    notificationOptRepo.addOneWechatNotificationCredit(recipient.user.id, "PR_MESSAGE"),
    notificationOptRepo.addOneWechatNotificationCredit(
      creditWithoutOpenIdRecipient.user.id,
      "PR_MESSAGE",
    ),
  ]);
  await db
    .insert(config)
    .values({
      key: PR_MESSAGE_TEMPLATE_CONFIG_KEY,
      value: "scenario-pr-message-template",
    })
    .onConflictDoUpdate({
      target: config.key,
      set: { value: "scenario-pr-message-template" },
    });

  const participantResponse = await expectJsonResponse<CreatedMessageResponse>(
    await requestJson(`/api/pr/${pr.id}/messages`, {
      method: "POST",
      token: creator.token,
      body: { body: "M1 participant message" },
    }),
    200,
  );
  const m1 = participantResponse.message.id;
  assert.equal(participantResponse.thread.acknowledgementCursor, m1);

  const adminResponse = await expectJsonResponse<CreatedMessageResponse>(
    await requestJson(`/api/admin/prs/${pr.id}/messages`, {
      method: "POST",
      token: admin.token,
      body: { body: "M2 admin message" },
    }),
    200,
  );
  const m2 = adminResponse.message.id;
  assert.equal(adminResponse.thread.acknowledgementCursor, m2);

  const beforeContent = await prRepo.findById(pr.id);
  assert.ok(beforeContent);
  await expectJsonResponse<{ id: number }>(
    await requestJson(`/api/pr/${pr.id}/content`, {
      method: "PATCH",
      token: creator.token,
      body: {
        fields: toUserContentFields(beforeContent, { location: "Scenario Cutover Court 2" }),
      },
    }),
    200,
  );
  const m3 = await getLatestMessageId(pr.id);

  const firstGeneration = await getGenericMessageJobs(pr.id);
  assert.equal(firstGeneration.length, 1);
  const held = firstGeneration[0];
  assert.ok(held);
  assert.equal(held.task.recipientUserId, recipient.user.id);
  assert.equal(held.task.payload.prId, pr.id);
  assert.equal(held.job.creationMode, "UNTIL_ACKNOWLEDGED");
  assert.equal(held.job.reservationState, "HELD");
  assert.equal(held.job.windowStartCursor, m1);
  assert.equal(held.job.highWaterCursor, m3);
  assert.deepEqual(
    firstGeneration.map(({ task }) => task.recipientUserId),
    [recipient.user.id],
  );
  assert.ok(m1 < m2 && m2 < m3);

  const store = new PostgresJobStore();
  assert.ok(held.job.creationKey);
  await db
    .update(jobs)
    .set({ status: "SUCCEEDED", completedAt: new Date() })
    .where(eq(jobs.id, held.job.id));
  const terminalHeld = await db.select().from(jobs).where(eq(jobs.id, held.job.id));
  assert.equal(terminalHeld[0]?.status, "SUCCEEDED");
  assert.equal(terminalHeld[0]?.reservationState, "HELD");
  assert.equal(terminalHeld[0]?.highWaterCursor, m3);
  const staleAck = await store.acknowledgeUntilAcknowledged({
    jobType: "notification.send.v1",
    creationKey: held.job.creationKey,
    throughCursor: m2,
  });
  assert.equal(staleAck.released, false);
  assert.equal(staleAck.stale, true);
  const coveringAck = await store.acknowledgeUntilAcknowledged({
    jobType: "notification.send.v1",
    creationKey: held.job.creationKey,
    throughCursor: m3,
  });
  assert.equal(coveringAck.released, true);
  assert.equal(coveringAck.stale, false);

  const afterRelease = await db.select().from(jobs).where(eq(jobs.id, held.job.id));
  assert.equal(afterRelease[0]?.reservationState, "RELEASED");

  const afterContent = await prRepo.findById(pr.id);
  assert.ok(afterContent);
  await expectJsonResponse(
    await requestJson(`/api/pr/${pr.id}/content`, {
      method: "PATCH",
      token: creator.token,
      body: {
        fields: toUserContentFields(afterContent, { location: "Scenario Cutover Court 3" }),
      },
    }),
    200,
  );
  const generations = await getGenericMessageJobs(pr.id);
  assert.equal(generations.length, 2);
  const reopened = generations.find(({ job }) => job.id !== held.job.id);
  assert.ok(reopened);
  assert.notEqual(reopened.job.id, held.job.id);
  assert.equal(reopened.job.reservationState, "HELD");
  assert.ok((reopened.job.windowStartCursor ?? 0) > (held.job.highWaterCursor ?? 0));
});
