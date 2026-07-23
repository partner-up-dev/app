import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { createTransactionBoundMeetingPointUpdatedNotificationPort } from "../../src/domains/notification";
import { notificationTaskPayloadSchema } from "../../src/domains/notification/owner/task";
import { createAdminPoiMeetingPointTransactionPort } from "../../src/domains/poi/use-cases/admin-poi-meeting-point-transaction";
import { jobs } from "../../src/entities/job";
import { pois } from "../../src/entities/poi";
import { db } from "../../src/lib/db";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
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

const requestRepo = new PartnerRequestRepository();
const notificationOptRepo = new UserNotificationOptRepository();

const oldPoint = { description: "Old entrance", imageUrl: "https://example.com/old.png" };
const newPoint = { description: "New entrance", imageUrl: "https://example.com/new.png" };
const explicitPoint = {
  description: "Explicit entrance",
  imageUrl: "https://example.com/explicit.png",
};
const typePoint = { description: "Type entrance", imageUrl: "https://example.com/type.png" };

type MeetingPointTask = {
  job: typeof jobs.$inferSelect;
  task: Extract<
    ReturnType<typeof notificationTaskPayloadSchema.parse>,
    { template: "pr.meeting-point-updated" }
  >;
};

const readMeetingPointTasks = async (prIds: readonly number[]): Promise<MeetingPointTask[]> => {
  const requestedIds = new Set(prIds);
  const rows = await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"));
  return rows.flatMap((job) => {
    const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
    return parsed.success &&
      parsed.data.template === "pr.meeting-point-updated" &&
      requestedIds.has(parsed.data.payload.prId)
      ? [{ job, task: parsed.data }]
      : [];
  });
};

const readLegacyMeetingPointJobs = async (prIds: readonly number[]) => {
  const requestedIds = new Set(prIds);
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
      typeof payload.prId === "number" &&
      requestedIds.has(payload.prId)
    );
  });
};

const assertNoLegacyMeetingPointJobs = async (prIds: readonly number[]): Promise<void> => {
  assert.equal((await readLegacyMeetingPointJobs(prIds)).length, 0);
};

const createPoi = async (name: string, meetingPoint: typeof oldPoint | typeof newPoint | null) => {
  const [poi] = await getTestDb()
    .insert(pois)
    .values({
      name,
      status: "PUBLISHED",
      fullAddress: `${name} address`,
      gallery: [`https://example.com/${name.toLowerCase()}-gallery.png`],
      meetingPoint,
      availabilityRules: [],
    })
    .returning();
  assert.ok(poi);
  return poi;
};

const createPR = async (input: {
  creator: Awaited<ReturnType<typeof givenUser>>;
  location: string;
  meetingPoint?: typeof explicitPoint | null;
  type?: string;
}) => {
  const fields = buildScenarioFields(`POI meeting point ${input.location}`);
  return await givenPersistedPartnerRequest({
    creator: input.creator,
    status: "OPEN",
    fields: {
      ...fields,
      type: input.type ?? `scenario-poi-type-${input.location}`,
      location: input.location,
      minPartners: 1,
      maxPartners: 4,
      meetingPoint: input.meetingPoint ?? null,
    },
  });
};

const setupNotificationParticipant = async (
  participant: Awaited<ReturnType<typeof givenUser>>,
  prs: Array<{ id: number }>,
  key: string,
): Promise<void> => {
  await Promise.all(prs.map((pr) => joinPartnerRequest({ pr, user: participant })));
  await bindScenarioWeChatOpenId({
    user: participant,
    openId: `openid-poi-meeting-point-${key}-${participant.user.id}`,
  });
  await notificationOptRepo.addOneWechatNotificationCredit(
    participant.user.id,
    "MEETING_POINT_UPDATED",
  );
};

const routeBody = (input: {
  name: string;
  fullAddress?: string | null;
  gallery?: string[];
  meetingPoint: typeof oldPoint | typeof newPoint;
}) => ({
  name: input.name,
  fullAddress: input.fullAddress ?? `${input.name} address`,
  gallery: input.gallery ?? [`https://example.com/${input.name.toLowerCase()}-gallery.png`],
  gcj02: null,
  wgs84: null,
  bd09: null,
  perTimeWindowCap: null,
  availabilityRules: [],
  meetingPoint: input.meetingPoint,
});

scenario("admin_poi_route_fans_out_only_poi_fallback_delta", async (ctx) => {
  const admin = await givenAdminUser("poi-meeting-point-route");
  const creator = await givenUser("poi-meeting-point-route-creator");
  const participant = await givenUser("poi-meeting-point-route-participant");
  const oldName = "Scenario POI Route Old";
  const poi = await createPoi(oldName, oldPoint);
  const typeFallbackConfig = await givenPRTypeConfig({
    label: "poi-route-type-fallback",
    locations: [oldName],
    meetingPoint: typePoint,
    defaultMinPartners: 1,
  });
  const explicit = await createPR({ creator, location: oldName, meetingPoint: explicitPoint });
  const typeFallback = await createPR({
    creator,
    location: oldName,
    type: typeFallbackConfig.type,
  });
  const poiFallback = await createPR({ creator, location: oldName, type: "scenario-poi-type-poi" });
  await setupNotificationParticipant(participant, [explicit, typeFallback, poiFallback], "route");
  ctx.record("poiId", poi.id);
  ctx.record("prIds", [explicit.id, typeFallback.id, poiFallback.id]);

  const response = await expectJsonResponse<Record<string, unknown>>(
    await requestJson(`/api/admin/pois/${poi.id}`, {
      method: "PUT",
      token: admin.token,
      body: routeBody({ name: oldName, meetingPoint: newPoint }),
    }),
    200,
  );
  assert.deepEqual(Object.keys(response).sort(), [
    "availabilityRules",
    "bd09",
    "createdAt",
    "fullAddress",
    "gallery",
    "gcj02",
    "id",
    "meetingPoint",
    "name",
    "perTimeWindowCap",
    "rejectReason",
    "reviewedAt",
    "reviewedByUserId",
    "status",
    "submittedByUserId",
    "updatedAt",
    "wgs84",
  ]);
  assert.equal(response.id, poi.id);
  assert.equal(response.name, oldName);
  assert.deepEqual(response.meetingPoint, newPoint);

  const tasks = await readMeetingPointTasks([explicit.id, typeFallback.id, poiFallback.id]);
  assert.equal(tasks.length, 1);
  const task = tasks[0];
  assert.ok(task);
  assert.equal(task.job.jobType, "notification.send.v1");
  assert.equal(task.job.creationMode, "ONCE_PER_CAUSE");
  assert.equal(task.task.template, "pr.meeting-point-updated");
  assert.equal(task.task.payload.prId, poiFallback.id);
  assert.equal(task.task.payload.meetingPointDescription, newPoint.description);
  assert.match(task.task.payload.meetingPointUpdateId, /^[0-9a-f]{8}-/i);
  assert.equal(task.task.aggregate.type, "partner_request");
  assert.equal(task.task.aggregate.id, String(poiFallback.id));
  assert.equal(
    task.task.causationId,
    `partner_request:${poiFallback.id}:meeting-point:${task.task.payload.meetingPointUpdateId}`,
  );
  assert.equal(
    task.task.correlationId,
    `meeting-point:poi:${task.task.payload.meetingPointUpdateId}`,
  );
  assert.equal(task.task.recipientUserId, participant.user.id);
  await assertNoLegacyMeetingPointJobs([explicit.id, typeFallback.id, poiFallback.id]);
});

scenario("admin_poi_route_persists_non_point_fields_without_notification_delta", async (ctx) => {
  const admin = await givenAdminUser("poi-meeting-point-no-delta");
  const creator = await givenUser("poi-meeting-point-no-delta-creator");
  const participant = await givenUser("poi-meeting-point-no-delta-participant");
  const name = "Scenario POI No Delta";
  const poi = await createPoi(name, oldPoint);
  const pr = await createPR({ creator, location: name });
  await setupNotificationParticipant(participant, [pr], "no-delta");
  ctx.record("poiId", poi.id);
  ctx.record("prId", pr.id);

  const response = await expectJsonResponse<Record<string, unknown>>(
    await requestJson(`/api/admin/pois/${poi.id}`, {
      method: "PUT",
      token: admin.token,
      body: routeBody({
        name,
        fullAddress: "Updated full address",
        gallery: ["https://example.com/updated-gallery.png"],
        meetingPoint: oldPoint,
      }),
    }),
    200,
  );
  assert.equal(response.fullAddress, "Updated full address");
  assert.deepEqual(response.gallery, ["https://example.com/updated-gallery.png"]);
  assert.deepEqual(response.meetingPoint, oldPoint);
  assert.equal((await readMeetingPointTasks([pr.id])).length, 0);
  await assertNoLegacyMeetingPointJobs([pr.id]);
});

scenario("admin_poi_route_rename_uses_old_new_union_and_suppresses_removed_point", async (ctx) => {
  const admin = await givenAdminUser("poi-meeting-point-rename");
  const creator = await givenUser("poi-meeting-point-rename-creator");
  const participant = await givenUser("poi-meeting-point-rename-participant");
  const oldName = "Scenario POI Rename Old";
  const newName = "Scenario POI Rename New";
  const poi = await createPoi(oldName, oldPoint);
  const oldPR = await createPR({ creator, location: oldName });
  const newPR = await createPR({ creator, location: newName });
  await setupNotificationParticipant(participant, [oldPR, newPR], "rename");
  ctx.record("poiId", poi.id);
  ctx.record("prIds", [oldPR.id, newPR.id]);

  await expectJsonResponse(
    await requestJson(`/api/admin/pois/${poi.id}`, {
      method: "PUT",
      token: admin.token,
      body: routeBody({ name: newName, meetingPoint: newPoint }),
    }),
    200,
  );
  const tasks = await readMeetingPointTasks([oldPR.id, newPR.id]);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.task.payload.prId, newPR.id);
  assert.equal(tasks[0]?.task.payload.meetingPointDescription, newPoint.description);
  await assertNoLegacyMeetingPointJobs([oldPR.id, newPR.id]);
});

scenario("admin_poi_named_port_rolls_back_poi_and_generic_handoffs", async (ctx) => {
  const creator = await givenUser("poi-meeting-point-rollback-creator");
  const firstParticipant = await givenUser("poi-meeting-point-rollback-first");
  const secondParticipant = await givenUser("poi-meeting-point-rollback-second");
  const oldName = "Scenario POI Rollback Old";
  const newName = "Scenario POI Rollback New";
  const poi = await createPoi(oldName, oldPoint);
  const firstPR = await createPR({ creator, location: newName });
  const secondPR = await createPR({ creator, location: newName });
  await setupNotificationParticipant(firstParticipant, [firstPR], "rollback-first");
  await setupNotificationParticipant(secondParticipant, [secondPR], "rollback-second");
  ctx.record("poiId", poi.id);
  ctx.record("prIds", [firstPR.id, secondPR.id]);

  const before = await requestRepo.findById(firstPR.id);
  assert.ok(before);
  let handoffCount = 0;
  const failingPort = createAdminPoiMeetingPointTransactionPort({
    createNotificationPort: (input) => {
      const realPort = createTransactionBoundMeetingPointUpdatedNotificationPort(input);
      return {
        requestForSourceRecipients: async (request) => {
          handoffCount += 1;
          if (handoffCount === 2) {
            throw new Error("INJECTED_ADMIN_POI_MEETING_POINT_HANDOFF_FAILURE");
          }
          return await realPort.requestForSourceRecipients(request);
        },
      };
    },
  });

  await assert.rejects(
    failingPort.update({
      poiId: poi.id,
      input: routeBody({ name: newName, meetingPoint: newPoint }),
    }),
    /INJECTED_ADMIN_POI_MEETING_POINT_HANDOFF_FAILURE/,
  );
  assert.equal(handoffCount, 2);

  const after = await getTestDb().select().from(pois).where(eq(pois.id, poi.id));
  assert.equal(after[0]?.name, oldName);
  assert.deepEqual(after[0]?.meetingPoint, oldPoint);
  assert.equal((await readMeetingPointTasks([firstPR.id, secondPR.id])).length, 0);
  await assertNoLegacyMeetingPointJobs([firstPR.id, secondPR.id]);
});
