import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { partnerRequests } from "../../src/entities";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { scenario } from "../_infra/scenario/scenario";
import { givenAdminUser, givenUser } from "../pr/_kit/builders/users";

type ProblemDetails = { code?: string; detail: string };
type OperatorDetail = {
  type: string;
  discovery: { title: string; viewRatios: { FORM: number; CARD: number; LIST: number } };
  authoring: { routePool: Array<{ id: string; route: Array<{ name: string }> }> };
};

type RouteApplication = { id: number; status: "PENDING" | "ACCEPTED" | "REJECTED" };
type CreatedPR = { id: number };

const type = "scenario-admin-pr-type-config-owner";
const route = [
  { name: "Start", full_address: null, wgs84: null, bd09: null, gcj02: [120.1, 30.2] },
  { name: "Finish", full_address: null, wgs84: null, bd09: null, gcj02: [120.2, 30.3] },
] as const;

const proposedRoute = [
  { name: "Proposal start", full_address: null, wgs84: null, bd09: null, gcj02: [120.3, 30.4] },
  { name: "Proposal finish", full_address: null, wgs84: null, bd09: null, gcj02: [120.4, 30.5] },
] as const;

const buildSnapshotFields = (title: string) => ({
  title,
  type,
  time: ["2035-01-20T10:00:00.000Z", "2035-01-20T11:30:00.000Z"],
  location: null,
  route,
  minPartners: 2,
  maxPartners: 4,
  partners: [],
  budget: null,
  preferences: [],
  notes: null,
  meetingPoint: null,
});

const readPRNotes = async (id: number): Promise<string | null | undefined> =>
  (
    await getTestDb()
      .select({ notes: partnerRequests.notes })
      .from(partnerRequests)
      .where(eq(partnerRequests.id, id))
  )[0]?.notes;

const body = {
  authoring: {
    locationPool: [],
    routePool: [{ id: "baseline-route", route }],
    timePoolConfig: { durationMinutes: 90, earliestLeadMinutes: null, startRules: [] },
    timeWindowEditorDefaultMode: "NORMAL",
    defaultMinPartners: 2,
    defaultMaxPartners: 4,
    defaultNotes: "Owner command defaults",
    authoringCreationPolicy: "USER_AND_ADMIN",
  },
  discovery: {
    title: "Owner command type",
    description: "Scenario proof for the PR Type Config owner",
    coverImage: null,
    communityQrCode: null,
    viewRatios: { FORM: 50, CARD: 50, LIST: 0 },
  },
  participation: {
    defaultConfirmationEnabled: true,
    defaultConfirmationStartOffsetMinutes: 120,
    defaultConfirmationEndOffsetMinutes: 30,
    defaultJoinLockOffsetMinutes: 30,
    joinGateConfig: [],
    participationFrequencyLimit: null,
    fullCapacityExpansionPolicy: "DISABLED",
  },
  coordination: { meetingPoint: null, locationMeetingPoints: {} },
  completion: { feedbackQuestionnaireTemplateId: null },
} as const;

scenario("admin_pr_type_config_owner_preserves_typed_operator_contract", async (ctx) => {
  const unauthenticated = await requestJson("/api/admin/pr-type-configs/catalog");
  await expectJsonResponse<ProblemDetails>(unauthenticated, 401);

  const admin = await givenAdminUser("pr-type-config-owner");
  const createResponse = await requestJson(`/api/admin/pr-type-configs/${type}`, {
    method: "PUT",
    token: admin.token,
    body,
  });
  const created = await expectJsonResponse<OperatorDetail>(createResponse, 201);
  ctx.record("type", created.type);
  assert.equal(created.type, type);
  assert.equal(created.authoring.routePool[0]?.id, "baseline-route");

  const detailResponse = await requestJson(`/api/admin/pr-type-configs/${type}`, {
    token: admin.token,
  });
  const detail = await expectJsonResponse<OperatorDetail>(detailResponse, 200);
  assert.equal(detail.discovery.title, "Owner command type");
  assert.deepEqual(detail.discovery.viewRatios, { FORM: 50, CARD: 50, LIST: 0 });

  const firstCreator = await givenUser("pr-type-config-snapshot-first");
  const firstCreateResponse = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: firstCreator.token,
    body: {
      fields: buildSnapshotFields("Snapshot before config change"),
      createSource: "PR_DISCOVERY",
    },
  });
  const firstCreated = await expectJsonResponse<CreatedPR>(firstCreateResponse, 201);
  assert.equal(await readPRNotes(firstCreated.id), "Owner command defaults");

  const authoringUpdateResponse = await requestJson(
    `/api/admin/pr-type-configs/${type}/authoring`,
    {
      method: "PUT",
      token: admin.token,
      body: { ...body.authoring, defaultNotes: "Later owner default" },
    },
  );
  await expectJsonResponse<OperatorDetail>(authoringUpdateResponse, 200);
  assert.equal(await readPRNotes(firstCreated.id), "Owner command defaults");

  const secondCreator = await givenUser("pr-type-config-snapshot-second");
  const secondCreateResponse = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: secondCreator.token,
    body: {
      fields: buildSnapshotFields("Snapshot after config change"),
      createSource: "PR_DISCOVERY",
    },
  });
  const secondCreated = await expectJsonResponse<CreatedPR>(secondCreateResponse, 201);
  assert.equal(await readPRNotes(secondCreated.id), "Later owner default");

  const applicant = await givenUser("pr-type-config-route-applicant");
  const submitRouteResponse = await requestJson("/api/pr/authoring/route-applications", {
    method: "POST",
    token: applicant.token,
    body: { type, route: proposedRoute },
  });
  const submittedRouteApplication = await expectJsonResponse<RouteApplication>(
    submitRouteResponse,
    201,
  );
  assert.equal(submittedRouteApplication.status, "PENDING");

  const reviewedRouteResponse = await requestJson(
    `/api/admin/pr-type-configs/route-applications/${submittedRouteApplication.id}/review`,
    {
      method: "POST",
      token: admin.token,
      body: { status: "ACCEPTED" },
    },
  );
  const reviewedRouteApplication = await expectJsonResponse<RouteApplication>(
    reviewedRouteResponse,
    200,
  );
  assert.equal(reviewedRouteApplication.status, "ACCEPTED");

  const detailAfterReviewResponse = await requestJson(`/api/admin/pr-type-configs/${type}`, {
    token: admin.token,
  });
  const detailAfterReview = await expectJsonResponse<OperatorDetail>(
    detailAfterReviewResponse,
    200,
  );
  assert.equal(detailAfterReview.authoring.routePool.length, 2);
  assert.equal(
    detailAfterReview.authoring.routePool[1]?.id,
    `application-${submittedRouteApplication.id}`,
  );
  assert.equal(detailAfterReview.authoring.routePool[1]?.route[0]?.name, "Proposal start");

  const updateResponse = await requestJson(`/api/admin/pr-type-configs/${type}/discovery`, {
    method: "PUT",
    token: admin.token,
    body: {
      ...body.discovery,
      title: "Owner command type updated",
      viewRatios: { FORM: 0, CARD: 0, LIST: 100 },
    },
  });
  const updated = await expectJsonResponse<OperatorDetail>(updateResponse, 200);
  assert.equal(updated.discovery.title, "Owner command type updated");
  assert.deepEqual(updated.discovery.viewRatios, { FORM: 0, CARD: 0, LIST: 100 });

  const duplicateResponse = await requestJson(
    "/api/admin/pr-type-configs/SCENARIO-ADMIN-PR-TYPE-CONFIG-OWNER",
    { method: "PUT", token: admin.token, body },
  );
  const duplicate = await expectJsonResponse<ProblemDetails>(duplicateResponse, 409);
  assert.equal(duplicate.code, "PR_TYPE_CONFIG_ALREADY_EXISTS");
});
