import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { createTransactionBoundMeetingPointUpdatedNotificationPort } from "../../src/domains/notification";
import { notificationTaskPayloadSchema } from "../../src/domains/notification/owner/task";
import { createPRTypeCoordinationMeetingPointTransactionPort } from "../../src/domains/admin-pr-type-config/use-cases/pr-type-coordination-meeting-point-transaction";
import { jobs } from "../../src/entities/job";
import { pois } from "../../src/entities/poi";
import { db } from "../../src/lib/db";
import { PRTypeConfigRepository } from "../../src/repositories/PRTypeConfigRepository";
import { UserNotificationOptRepository } from "../../src/repositories/UserNotificationOptRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { scenario } from "../_infra/scenario/scenario";
import { joinPartnerRequest } from "../pr/_kit/actions/join";
import { bindScenarioWeChatOpenId } from "../pr/_kit/actions/system-state";
import {
  buildScenarioFields,
  givenPersistedPartnerRequest,
} from "../pr/_kit/builders/partner-requests";
import { givenAdminUser, givenUser } from "../pr/_kit/builders/users";
import { givenPRTypeConfig } from "./_kit/builders/pr-type-config";

const configRepo = new PRTypeConfigRepository();
const notificationOptRepo = new UserNotificationOptRepository();

const oldPoint = { description: "Loc-A old", imageUrl: "https://example.com/loc-a-old.png" };
const newPoint = { description: "Type new", imageUrl: "https://example.com/type-new.png" };
const explicitPoint = {
  description: "Explicit override",
  imageUrl: "https://example.com/explicit.png",
};
const poiPoint = { description: "POI old", imageUrl: "https://example.com/poi-old.png" };

type MeetingPointTask = {
  job: typeof jobs.$inferSelect;
  task: Extract<
    ReturnType<typeof notificationTaskPayloadSchema.parse>,
    { template: "pr.meeting-point-updated" }
  >;
};

const readMeetingPointTasks = async (prIds?: readonly number[]): Promise<MeetingPointTask[]> => {
  const requestedIds = prIds ? new Set(prIds) : null;
  const rows = await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"));
  return rows.flatMap((job) => {
    const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
    return parsed.success &&
      parsed.data.template === "pr.meeting-point-updated" &&
      (requestedIds === null || requestedIds.has(parsed.data.payload.prId))
      ? [{ job, task: parsed.data }]
      : [];
  });
};

const readLegacyMeetingPointJobs = async (prIds?: readonly number[]) => {
  const requestedIds = prIds ? new Set(prIds) : null;
  const rows = await db
    .select()
    .from(jobs)
    .where(eq(jobs.jobType, "wechat.notification.meeting-point-updated"));
  return rows.filter((job) => {
    if (requestedIds === null) return true;
    const payload = job.payload;
    return (
      typeof payload === "object" &&
      payload !== null &&
      !Array.isArray(payload) &&
      "prId" in payload &&
      typeof payload.prId === "number" &&
      requestedIds.has(payload.prId)
    );
  });
};

const assertNoLegacyMeetingPointJobs = async (prIds: readonly number[]): Promise<void> => {
  assert.equal((await readLegacyMeetingPointJobs(prIds)).length, 0);
};

const createPR = async (input: {
  creator: Awaited<ReturnType<typeof givenUser>>;
  type: string;
  location: string;
  meetingPoint?: typeof explicitPoint | null;
}) => {
  const fields = buildScenarioFields(`PR type meeting point ${input.location}`);
  return await givenPersistedPartnerRequest({
    creator: input.creator,
    status: "OPEN",
    fields: {
      ...fields,
      type: input.type,
      location: input.location,
      minPartners: 1,
      maxPartners: 4,
      meetingPoint: input.meetingPoint ?? null,
    },
  });
};

const configureInitialLocationRule = async (type: string): Promise<void> => {
  await configRepo.updateByType(type, {
    locationMeetingPoints: { "Loc-A": oldPoint },
  });
};

const setupNotificationParticipant = async (
  participant: Awaited<ReturnType<typeof givenUser>>,
  prs: Array<{ id: number }>,
): Promise<void> => {
  await Promise.all(prs.map((pr) => joinPartnerRequest({ pr, user: participant })));
  await bindScenarioWeChatOpenId({
    user: participant,
    openId: `openid-pr-type-meeting-point-${participant.user.id}`,
  });
  await notificationOptRepo.addOneWechatNotificationCredit(
    participant.user.id,
    "MEETING_POINT_UPDATED",
  );
};

scenario("admin_pr_type_coordination_route_fans_out_only_effective_deltas", async (ctx) => {
  const admin = await givenAdminUser("pr-type-meeting-point-route");
  const creator = await givenUser("pr-type-meeting-point-route-creator");
  const participant = await givenUser("pr-type-meeting-point-route-participant");
  const prType = await givenPRTypeConfig({
    label: "meeting-point-route",
    locations: ["Loc-A", "Loc-B", "Loc-C"],
    meetingPoint: null,
    defaultMinPartners: 1,
  });
  await configureInitialLocationRule(prType.type);
  await getTestDb()
    .insert(pois)
    .values({ name: "Loc-C", status: "PUBLISHED", meetingPoint: poiPoint });

  const explicit = await createPR({
    creator,
    type: prType.type,
    location: "Loc-A",
    meetingPoint: explicitPoint,
  });
  const locationRule = await createPR({ creator, type: prType.type, location: "Loc-A" });
  const typeFallback = await createPR({ creator, type: prType.type, location: "Loc-B" });
  const poiFallback = await createPR({ creator, type: prType.type, location: "Loc-C" });
  await setupNotificationParticipant(participant, [
    explicit,
    locationRule,
    typeFallback,
    poiFallback,
  ]);
  ctx.record("type", prType.type);
  ctx.record("prIds", [explicit.id, locationRule.id, typeFallback.id, poiFallback.id]);

  const response = await requestJson(`/api/admin/pr-type-configs/${prType.type}/coordination`, {
    method: "PUT",
    token: admin.token,
    body: {
      meetingPoint: newPoint,
      locationMeetingPoints: { "Loc-A": { description: "Loc-A new", imageUrl: null } },
    },
  });
  await expectJsonResponse(response, 200);

  const tasks = await readMeetingPointTasks([
    explicit.id,
    locationRule.id,
    typeFallback.id,
    poiFallback.id,
  ]);
  assert.equal(tasks.length, 3);
  assert.deepEqual(
    new Set(tasks.map(({ task }) => task.payload.prId)),
    new Set([locationRule.id, typeFallback.id, poiFallback.id]),
  );
  const updateIds = new Set(tasks.map(({ task }) => task.payload.meetingPointUpdateId));
  assert.equal(updateIds.size, 1);
  const meetingPointUpdateId = tasks[0]?.task.payload.meetingPointUpdateId;
  assert.ok(meetingPointUpdateId);
  assert.match(meetingPointUpdateId, /^[0-9a-f]{8}-/i);
  assert.equal(new Set(tasks.map(({ task }) => task.correlationId)).size, 1);
  assert.equal(tasks[0]?.task.correlationId, `meeting-point:pr-type:${meetingPointUpdateId}`);
  assert.deepEqual(
    new Set(tasks.map(({ task }) => task.payload.meetingPointDescription)),
    new Set(["Loc-A new", "Type new"]),
  );
  assert.equal(new Set(tasks.map(({ task }) => task.causationId)).size, 3);
  for (const { job, task } of tasks) {
    assert.equal(job.creationMode, "ONCE_PER_CAUSE");
    assert.equal(task.recipientUserId, participant.user.id);
    assert.equal(task.aggregate.type, "partner_request");
    assert.equal(task.aggregate.id, String(task.payload.prId));
    assert.equal(
      task.causationId,
      `partner_request:${task.payload.prId}:meeting-point:${meetingPointUpdateId}`,
    );
  }
  await assertNoLegacyMeetingPointJobs([
    explicit.id,
    locationRule.id,
    typeFallback.id,
    poiFallback.id,
  ]);
});

scenario("admin_pr_type_coordination_route_ignores_unused_map_change", async () => {
  const admin = await givenAdminUser("pr-type-meeting-point-no-delta");
  const creator = await givenUser("pr-type-meeting-point-no-delta-creator");
  const participant = await givenUser("pr-type-meeting-point-no-delta-participant");
  const prType = await givenPRTypeConfig({
    label: "meeting-point-no-delta",
    locations: ["Loc-A"],
    meetingPoint: null,
    defaultMinPartners: 1,
  });
  await configureInitialLocationRule(prType.type);
  const explicit = await createPR({
    creator,
    type: prType.type,
    location: "Loc-A",
    meetingPoint: explicitPoint,
  });
  const locationRule = await createPR({ creator, type: prType.type, location: "Loc-A" });
  await setupNotificationParticipant(participant, [explicit, locationRule]);

  const response = await requestJson(`/api/admin/pr-type-configs/${prType.type}/coordination`, {
    method: "PUT",
    token: admin.token,
    body: {
      meetingPoint: null,
      locationMeetingPoints: {
        "Loc-A": oldPoint,
        Unused: { description: "Unused map entry", imageUrl: null },
      },
    },
  });
  await expectJsonResponse(response, 200);
  assert.equal((await readMeetingPointTasks([explicit.id, locationRule.id])).length, 0);
  const saved = await configRepo.findByType(prType.type);
  assert.ok(saved);
  assert.deepEqual(saved.locationMeetingPoints.Unused, {
    description: "Unused map entry",
    imageUrl: null,
  });
  await assertNoLegacyMeetingPointJobs([explicit.id, locationRule.id]);
});

scenario("admin_pr_type_coordination_named_port_rolls_back_on_second_handoff", async () => {
  const creator = await givenUser("pr-type-meeting-point-rollback-creator");
  const participant = await givenUser("pr-type-meeting-point-rollback-participant");
  const prType = await givenPRTypeConfig({
    label: "meeting-point-rollback",
    locations: ["Loc-A", "Loc-B"],
    meetingPoint: null,
    defaultMinPartners: 1,
  });
  await configureInitialLocationRule(prType.type);
  const locationRule = await createPR({ creator, type: prType.type, location: "Loc-A" });
  const typeFallback = await createPR({ creator, type: prType.type, location: "Loc-B" });
  await setupNotificationParticipant(participant, [locationRule, typeFallback]);
  const before = await configRepo.findByType(prType.type);
  assert.ok(before);
  let handoffCount = 0;
  const failingPort = createPRTypeCoordinationMeetingPointTransactionPort({
    createNotificationPort: (input) => {
      const realPort = createTransactionBoundMeetingPointUpdatedNotificationPort(input);
      return {
        requestForSourceRecipients: async (request) => {
          handoffCount += 1;
          if (handoffCount === 2) {
            throw new Error("INJECTED_PR_TYPE_MEETING_POINT_HANDOFF_FAILURE");
          }
          return await realPort.requestForSourceRecipients(request);
        },
      };
    },
  });

  await assert.rejects(
    failingPort.update({
      type: prType.type,
      input: {
        meetingPoint: newPoint,
        locationMeetingPoints: { "Loc-A": { description: "Loc-A new", imageUrl: null } },
      },
    }),
    /INJECTED_PR_TYPE_MEETING_POINT_HANDOFF_FAILURE/,
  );
  assert.equal(handoffCount, 2);
  const after = await configRepo.findByType(prType.type);
  assert.ok(after);
  assert.deepEqual(after.meetingPoint, before.meetingPoint);
  assert.deepEqual(after.locationMeetingPoints, before.locationMeetingPoints);
  assert.equal((await readMeetingPointTasks([locationRule.id, typeFallback.id])).length, 0);
  await assertNoLegacyMeetingPointJobs([locationRule.id, typeFallback.id]);
});
