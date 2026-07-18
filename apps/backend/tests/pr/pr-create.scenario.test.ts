import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { type PartnerRequestFields, partnerRequests, partners } from "../../src/entities";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { scenario } from "../_infra/scenario/scenario";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenAnonymousUser, givenUser } from "./_kit/builders/users";

type ProblemDetailsResponse = {
  code?: string;
};

const buildPastTimeWindow = (): [string, string] => {
  const startAt = new Date(Date.now() - 60 * 60 * 1000);
  const endAt = new Date(Date.now() + 60 * 60 * 1000);
  return [startAt.toISOString(), endAt.toISOString()];
};

const buildFields = (): PartnerRequestFields => ({
  title: "Scenario past PR create",
  type: "badminton",
  time: buildPastTimeWindow(),
  location: "Scenario Past Court",
  route: null,
  minPartners: 2,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: [],
  notes: null,
  meetingPoint: null,
});

const buildFutureFields = (): PartnerRequestFields => ({
  ...buildFields(),
  title: "Scenario guarded PR create",
  time: ["2031-02-01T10:00:00.000Z", "2031-02-01T12:00:00.000Z"],
});

scenario("structured_pr_create_rejects_past_start_time", async (ctx) => {
  const creator = await givenUser("past-create-creator");
  const before = await getTestDb().select().from(partnerRequests);
  ctx.record("creatorUserId", creator.user.id);

  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: creator.token,
    body: {
      fields: buildFields(),
      createSource: "STRUCTURED_FORM",
    },
  });

  assert.match(response.headers.get("content-type") ?? "", /^application\/problem\+json/);
  const body = await expectJsonResponse<ProblemDetailsResponse>(response, 400);
  assert.equal(body.code, "PR_START_TIME_PASSED");

  const after = await getTestDb().select().from(partnerRequests);
  assert.equal(after.length, before.length);
});

scenario("anonymous_user_pr_create_is_rejected_without_persistence", async (ctx) => {
  const anonymous = await givenAnonymousUser("guarded-create");
  const before = await getTestDb().select({ id: partnerRequests.id }).from(partnerRequests);
  ctx.record("anonymousUserId", anonymous.user.id);

  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: anonymous.token,
    body: { fields: buildFutureFields(), createSource: "STRUCTURED_FORM" },
  });

  assert.match(response.headers.get("content-type") ?? "", /^application\/problem\+json/);
  const body = await expectJsonResponse<ProblemDetailsResponse>(response, 401);
  assert.equal(body.code, "AUTHENTICATED_REQUIRED");

  const after = await getTestDb().select({ id: partnerRequests.id }).from(partnerRequests);
  assert.deepEqual(after, before);
});

scenario("authenticated_user_pr_create_binds_owner", async (ctx) => {
  const creator = await givenUser("guarded-create-owner");
  ctx.record("creatorUserId", creator.user.id);

  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: creator.token,
    body: { fields: buildFutureFields(), createSource: "STRUCTURED_FORM" },
  });
  const created = await expectJsonResponse<{ id: number; status: string }>(response, 201);
  assert.equal(created.status, "OPEN");

  const [stored] = await getTestDb()
    .select({ createdBy: partnerRequests.createdBy, status: partnerRequests.status })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, created.id));
  assert.equal(stored?.createdBy, creator.user.id);
  assert.equal(stored?.status, "OPEN");
});

scenario("authenticated_create_conflict_leaves_owner_bound_draft_residue", async (ctx) => {
  const creator = await givenUser("conflicted-create-owner");
  await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    title: "Scenario overlapping active PR",
  });
  const residueTitle = "Scenario conflict residue draft";
  const conflictFields: PartnerRequestFields = {
    ...buildFutureFields(),
    title: residueTitle,
    time: ["2030-01-01T10:30:00.000Z", "2030-01-01T11:30:00.000Z"],
    location: "Scenario Court",
    minPartners: 1,
    maxPartners: 2,
  };
  ctx.record("creatorUserId", creator.user.id);

  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: creator.token,
    body: { fields: conflictFields, createSource: "STRUCTURED_FORM" },
  });
  const body = await expectJsonResponse<ProblemDetailsResponse>(response, 409);
  assert.equal(body.code, "JOIN_TIME_WINDOW_CONFLICT");

  const [residue] = await getTestDb()
    .select({
      id: partnerRequests.id,
      createdBy: partnerRequests.createdBy,
      status: partnerRequests.status,
    })
    .from(partnerRequests)
    .where(eq(partnerRequests.title, residueTitle));
  assert.ok(residue?.id);
  assert.equal(residue?.createdBy, creator.user.id);
  assert.equal(residue?.status, "DRAFT");

  const residueSlots = await getTestDb()
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.prId, residue.id));
  assert.equal(residueSlots.length, 0);
});
