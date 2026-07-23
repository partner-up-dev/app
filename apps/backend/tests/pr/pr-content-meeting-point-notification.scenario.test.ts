import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { notificationTaskPayloadSchema } from "../../src/domains/notification/owner/task";
import { createPRContentMeetingPointTransactionPort } from "../../src/domains/pr/adapters/pr-content-meeting-point-transaction";
import type { PartnerRequest, PartnerRequestFields } from "../../src/entities/partner-request";
import { jobs } from "../../src/entities/job";
import { db } from "../../src/lib/db";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../src/repositories/PartnerRepository";
import { UserNotificationOptRepository } from "../../src/repositories/UserNotificationOptRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import {
  givenPRTypeConfig,
  givenPRTypeVisiblePR,
} from "../pr-discovery/_kit/builders/pr-type-config";
import { joinPartnerRequest } from "./_kit/actions/join";
import { bindScenarioWeChatOpenId } from "./_kit/actions/system-state";
import {
  buildScenarioFields,
  givenPersistedPartnerRequest,
  givenPublishedPartnerRequest,
} from "./_kit/builders/partner-requests";
import { givenAdminUser, givenUser } from "./_kit/builders/users";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const notificationOptRepo = new UserNotificationOptRepository();

const toFullFields = (
  request: PartnerRequest,
  overrides: Partial<PartnerRequestFields> = {},
): PartnerRequestFields => ({
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
});

const toUserContentFields = (
  request: PartnerRequest,
  overrides: Partial<Omit<PartnerRequestFields, "type">> = {},
): Omit<PartnerRequestFields, "type"> => {
  const { type: _type, ...fields } = toFullFields(request, overrides);
  return fields;
};

const getMeetingPointJobs = async (prId: number) => {
  const rows = await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"));
  return rows.flatMap((job) => {
    const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
    if (
      !parsed.success ||
      parsed.data.template !== "pr.meeting-point-updated" ||
      parsed.data.payload.prId !== prId
    ) {
      return [];
    }
    return [{ job, task: parsed.data }];
  });
};

const getLegacyMeetingPointJobs = async (prId: number) => {
  const rows = await db
    .select()
    .from(jobs)
    .where(eq(jobs.jobType, "wechat.notification.meeting-point-updated"));
  return rows.filter((job) => {
    const payload = job.payload;
    return (
      typeof payload === "object" &&
      payload !== null &&
      !Array.isArray(payload) &&
      "prId" in payload &&
      payload.prId === prId
    );
  });
};

scenario(
  "pr_content_user_meeting_point_updates_commit_exact_generic_fanout_without_legacy_rows",
  async (ctx) => {
    const creator = await givenUser("meeting-point-content-creator");
    const eligibleParticipant = await givenUser("meeting-point-content-eligible");
    const noCreditParticipant = await givenUser("meeting-point-content-no-credit");
    const missingOpenIdParticipant = await givenUser("meeting-point-content-no-openid");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 5,
      expectedCreatedStatus: "OPEN",
      title: "PR content meeting-point atomic fanout",
    });
    ctx.record("prId", pr.id);

    await Promise.all([
      joinPartnerRequest({ pr, user: eligibleParticipant }),
      joinPartnerRequest({ pr, user: noCreditParticipant }),
      joinPartnerRequest({ pr, user: missingOpenIdParticipant }),
    ]);
    await Promise.all([
      bindScenarioWeChatOpenId({
        user: creator,
        openId: "openid-meeting-point-content-creator",
      }),
      bindScenarioWeChatOpenId({
        user: eligibleParticipant,
        openId: "openid-meeting-point-content-eligible",
      }),
      bindScenarioWeChatOpenId({
        user: noCreditParticipant,
        openId: "openid-meeting-point-content-no-credit",
      }),
      notificationOptRepo.addOneWechatNotificationCredit(creator.user.id, "MEETING_POINT_UPDATED"),
      notificationOptRepo.addOneWechatNotificationCredit(
        eligibleParticipant.user.id,
        "MEETING_POINT_UPDATED",
      ),
      notificationOptRepo.addOneWechatNotificationCredit(
        missingOpenIdParticipant.user.id,
        "MEETING_POINT_UPDATED",
      ),
    ]);

    const before = await prRepo.findById(pr.id);
    assert.ok(before);
    await expectJsonResponse(
      await requestJson(`/api/pr/${pr.id}/content`, {
        method: "PATCH",
        token: creator.token,
        body: {
          fields: toUserContentFields(before, {
            meetingPoint: {
              description: "东门 Gate A",
              imageUrl: "https://example.com/gate-a.png",
            },
          }),
        },
      }),
      200,
    );

    const firstJobs = await getMeetingPointJobs(pr.id);
    assert.equal(firstJobs.length, 2);
    assert.deepEqual(
      new Set(firstJobs.map(({ task }) => task.recipientUserId)),
      new Set([creator.user.id, eligibleParticipant.user.id]),
    );
    for (const { job, task } of firstJobs) {
      assert.equal(job.creationMode, "ONCE_PER_CAUSE");
      assert.equal(task.payload.meetingPointDescription, "东门 Gate A");
      assert.match(task.payload.meetingPointUpdateId, /^[0-9a-f]{8}-/i);
      assert.equal(
        task.causationId,
        `partner_request:${pr.id}:meeting-point:${task.payload.meetingPointUpdateId}`,
      );
      assert.equal(
        job.creationKey,
        [
          "notification",
          "pr.meeting-point-updated",
          "WECHAT_SUBSCRIPTION",
          task.recipientUserId,
          pr.id,
          task.payload.meetingPointUpdateId,
        ].join(":"),
      );
    }
    assert.equal((await getLegacyMeetingPointJobs(pr.id)).length, 0);

    const afterFirst = await prRepo.findById(pr.id);
    assert.ok(afterFirst);
    await expectJsonResponse(
      await requestJson(`/api/pr/${pr.id}/content`, {
        method: "PATCH",
        token: creator.token,
        body: {
          fields: toUserContentFields(afterFirst, {
            title: "PR content meeting-point unchanged effective point",
          }),
        },
      }),
      200,
    );
    assert.equal((await getMeetingPointJobs(pr.id)).length, 2);

    const afterNoDelta = await prRepo.findById(pr.id);
    assert.ok(afterNoDelta);
    await expectJsonResponse(
      await requestJson(`/api/pr/${pr.id}/content`, {
        method: "PATCH",
        token: creator.token,
        body: {
          fields: toUserContentFields(afterNoDelta, {
            meetingPoint: {
              description: "西门 Gate B",
              imageUrl: "https://example.com/gate-b.png",
            },
          }),
        },
      }),
      200,
    );

    const secondJobs = await getMeetingPointJobs(pr.id);
    assert.equal(secondJobs.length, 4);
    assert.equal(new Set(secondJobs.map(({ task }) => task.payload.meetingPointUpdateId)).size, 2);
    assert.deepEqual(
      new Set(secondJobs.map(({ task }) => task.payload.meetingPointDescription)),
      new Set(["东门 Gate A", "西门 Gate B"]),
    );
    assert.equal((await getLegacyMeetingPointJobs(pr.id)).length, 0);
  },
);

scenario("admin_pr_content_uses_the_same_atomic_meeting_point_bridge", async (ctx) => {
  const admin = await givenAdminUser("meeting-point-content-admin");
  const creator = await givenUser("meeting-point-content-admin-source");
  const prType = await givenPRTypeConfig({
    label: "meeting-point-admin-content",
    locations: ["Admin meeting-point court"],
    defaultMinPartners: 1,
  });
  const pr = await givenPRTypeVisiblePR({
    creator,
    prType,
    title: "Admin content meeting-point bridge",
    minPartners: 1,
    maxPartners: 3,
    expectedStatus: "OPEN",
  });
  ctx.record("prId", pr.id);

  await Promise.all([
    bindScenarioWeChatOpenId({
      user: creator,
      openId: "openid-meeting-point-content-admin-source",
    }),
    notificationOptRepo.addOneWechatNotificationCredit(creator.user.id, "MEETING_POINT_UPDATED"),
  ]);

  await expectJsonResponse(
    await requestJson(`/api/admin/prs/${pr.id}/content`, {
      method: "PATCH",
      token: admin.token,
      body: {
        timeWindow: prType.timeWindow,
        title: "Admin content meeting-point bridge updated",
        type: prType.type,
        location: prType.locations[0] ?? null,
        route: null,
        minPartners: 1,
        maxPartners: 3,
        preferences: [],
        notes: null,
        meetingPoint: { description: "管理员入口", imageUrl: null },
        joinGateConfig: [],
        confirmationEnabled: true,
        confirmationStartOffsetMinutes: 120,
        confirmationEndOffsetMinutes: 30,
        joinLockOffsetMinutes: 30,
      },
    }),
    200,
  );

  const scheduled = await getMeetingPointJobs(pr.id);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0]?.task.recipientUserId, creator.user.id);
  assert.equal(scheduled[0]?.task.payload.meetingPointDescription, "管理员入口");
  assert.equal((await getLegacyMeetingPointJobs(pr.id)).length, 0);
});

scenario(
  "pr_content_meeting_point_handoff_failure_rolls_back_the_core_row_and_generic_jobs",
  async (ctx) => {
    const creator = await givenUser("meeting-point-content-rollback");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "OPEN",
      title: "PR content meeting-point rollback",
    });
    ctx.record("prId", pr.id);
    await Promise.all([
      bindScenarioWeChatOpenId({
        user: creator,
        openId: "openid-meeting-point-content-rollback",
      }),
      notificationOptRepo.addOneWechatNotificationCredit(creator.user.id, "MEETING_POINT_UPDATED"),
    ]);

    const before = await prRepo.findById(pr.id);
    assert.ok(before);
    const failingPort = createPRContentMeetingPointTransactionPort({
      createNotificationPort: () => ({
        requestForSourceRecipients: async () => {
          throw new Error("INJECTED_PR_CONTENT_MEETING_POINT_HANDOFF_FAILURE");
        },
      }),
    });
    await assert.rejects(
      failingPort.update({
        prId: pr.id,
        fields: toFullFields(before, {
          meetingPoint: { description: "不应持久化的入口", imageUrl: null },
        }),
        releaseParticipants: [],
        validateSlotCapacity: false,
        recalculateStatus: false,
      }),
      /INJECTED_PR_CONTENT_MEETING_POINT_HANDOFF_FAILURE/,
    );

    const after = await prRepo.findById(pr.id);
    assert.ok(after);
    assert.equal(after.meetingPoint, null);
    assert.equal((await getMeetingPointJobs(pr.id)).length, 0);
    assert.equal((await getLegacyMeetingPointJobs(pr.id)).length, 0);
  },
);

scenario(
  "pr_content_meeting_point_handoff_failure_restores_preflighted_release_slots",
  async (ctx) => {
    const creator = await givenUser("meeting-point-content-release-creator");
    const conflictedParticipant = await givenUser("meeting-point-content-release-participant");
    const conflictCreator = await givenUser("meeting-point-content-release-conflict-creator");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 3,
      expectedCreatedStatus: "OPEN",
      title: "PR content meeting-point release rollback",
    });
    await joinPartnerRequest({ pr, user: conflictedParticipant });
    const targetTime: [string, string] = ["2032-03-01T10:00:00.000Z", "2032-03-01T12:00:00.000Z"];
    const conflictPr = await givenPersistedPartnerRequest({
      creator: conflictCreator,
      fields: {
        ...buildScenarioFields("Meeting-point release conflict"),
        time: targetTime,
        minPartners: 1,
        maxPartners: null,
      },
      status: "OPEN",
    });
    await joinPartnerRequest({ pr: conflictPr, user: conflictedParticipant });
    ctx.record("prId", pr.id);
    ctx.record("conflictPrId", conflictPr.id);

    await Promise.all([
      bindScenarioWeChatOpenId({
        user: creator,
        openId: "openid-meeting-point-content-release-creator",
      }),
      notificationOptRepo.addOneWechatNotificationCredit(creator.user.id, "MEETING_POINT_UPDATED"),
    ]);
    const joinedSlot = await partnerRepo.findActiveByPrIdAndUserId(
      pr.id,
      conflictedParticipant.user.id,
    );
    assert.ok(joinedSlot);
    const before = await prRepo.findById(pr.id);
    assert.ok(before);

    const failingPort = createPRContentMeetingPointTransactionPort({
      createNotificationPort: () => ({
        requestForSourceRecipients: async () => {
          throw new Error("INJECTED_PR_CONTENT_RELEASE_HANDOFF_FAILURE");
        },
      }),
    });
    await assert.rejects(
      failingPort.update({
        prId: pr.id,
        fields: toFullFields(before, {
          time: targetTime,
          meetingPoint: { description: "不应释放后的入口", imageUrl: null },
        }),
        releaseParticipants: [
          {
            partnerId: joinedSlot.id,
            releaseReason: "TIME_CONFLICT_AFTER_CORE_FIELD_CHANGE",
          },
        ],
        validateSlotCapacity: false,
        recalculateStatus: false,
      }),
      /INJECTED_PR_CONTENT_RELEASE_HANDOFF_FAILURE/,
    );

    const after = await prRepo.findById(pr.id);
    assert.ok(after);
    assert.deepEqual(after.time, before.time);
    assert.equal(after.meetingPoint, null);
    assert.ok(await partnerRepo.findActiveByPrIdAndUserId(pr.id, conflictedParticipant.user.id));
    assert.equal((await getMeetingPointJobs(pr.id)).length, 0);
    assert.equal((await getLegacyMeetingPointJobs(pr.id)).length, 0);
  },
);
