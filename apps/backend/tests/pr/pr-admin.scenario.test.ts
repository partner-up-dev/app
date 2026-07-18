import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import type { PRId } from "../../src/entities";
import { partnerRequests, partners } from "../../src/entities";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { scenario } from "../_infra/scenario/scenario";
import { givenPRTypeConfig } from "../pr-discovery/_kit/builders/pr-type-config";
import {
  buildScenarioFields,
  givenPublishedPartnerRequest,
} from "./_kit/builders/partner-requests";
import { givenAdminUser, givenUser } from "./_kit/builders/users";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";

scenario("admin_draft_surface_remains_explicit_and_user_admin_access_is_denied", async (ctx) => {
  const admin = await givenAdminUser("draft-operator");
  const ordinaryUser = await givenUser("draft-admin-denied");
  const prType = await givenPRTypeConfig({ label: "scenario-admin-draft-type" });
  const fields = { ...buildScenarioFields("Scenario admin draft"), type: prType.type };
  const pr = await new PartnerRequestRepository().create({
    title: fields.title,
    type: fields.type,
    time: fields.time,
    location: fields.location,
    route: fields.route,
    minPartners: fields.minPartners,
    maxPartners: fields.maxPartners,
    budget: fields.budget,
    preferences: fields.preferences,
    notes: fields.notes,
    meetingPoint: fields.meetingPoint ?? null,
    joinGateConfig: [],
    status: "DRAFT",
    createdBy: admin.user.id,
  });
  ctx.record("prId", pr.id);

  const ordinaryDetail = await requestJson(`/api/admin/prs/${pr.id}`, {
    method: "GET",
    token: ordinaryUser.token,
  });
  assert.equal(ordinaryDetail.status, 401);

  const adminDetail = await expectJsonResponse<{
    prId: number;
    status: string;
    partnerCount: number;
  }>(await requestJson(`/api/admin/prs/${pr.id}`, { method: "GET", token: admin.token }), 200);
  assert.equal(adminDetail.prId, pr.id);
  assert.equal(adminDetail.status, "DRAFT");
  assert.equal(adminDetail.partnerCount, 0);

  await expectJsonResponse(
    await requestJson(`/api/admin/prs/${pr.id}/content`, {
      method: "PATCH",
      token: admin.token,
      body: {
        timeWindow: fields.time,
        title: "Scenario admin draft edited",
        type: fields.type,
        location: fields.location,
        route: fields.route,
        minPartners: fields.minPartners,
        maxPartners: fields.maxPartners,
        preferences: fields.preferences,
        notes: fields.notes,
        meetingPoint: fields.meetingPoint,
        joinGateConfig: [],
        confirmationEnabled: true,
        confirmationStartOffsetMinutes: 120,
        confirmationEndOffsetMinutes: 30,
        joinLockOffsetMinutes: 30,
      },
    }),
    200,
  );

  await expectJsonResponse(
    await requestJson(`/api/admin/prs/${pr.id}/messages`, {
      method: "POST",
      token: admin.token,
      body: { body: "Scenario admin draft note" },
    }),
    200,
  );
  const messages = await expectJsonResponse<{ items: Array<{ body: string }> }>(
    await requestJson(`/api/admin/prs/${pr.id}/messages`, {
      method: "GET",
      token: admin.token,
    }),
    200,
  );
  assert.equal(messages.items.length, 1);
  assert.equal(messages.items[0]?.body, "Scenario admin draft note");

  const status = await expectJsonResponse<{ status: string }>(
    await requestJson(`/api/admin/prs/${pr.id}/status`, {
      method: "PATCH",
      token: admin.token,
      body: { status: "OPEN" },
    }),
    200,
  );
  assert.equal(status.status, "OPEN");

  const deleted = await expectJsonResponse<{ ok: true }>(
    await requestJson(`/api/admin/prs/${pr.id}`, { method: "DELETE", token: admin.token }),
    200,
  );
  assert.equal(deleted.ok, true);
});

scenario("admin_delete_pr_removes_root_and_partners", async (ctx) => {
  const creator = await givenUser("delete-creator");
  const admin = await givenAdminUser("delete-operator");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Scenario delete target",
  });

  ctx.record("prId", pr.id);

  const response = await requestJson(`/api/admin/prs/${pr.id}`, {
    method: "DELETE",
    token: admin.token,
  });
  const body = await expectJsonResponse<{
    ok: true;
    prId: number;
    deletedPartnerCount: number;
  }>(response, 200);

  assert.equal(body.ok, true);
  assert.equal(body.prId, pr.id);
  assert.equal(body.deletedPartnerCount, 1);

  const [rootRows, partnerCountRows] = await Promise.all([
    getTestDb()
      .select({ id: partnerRequests.id })
      .from(partnerRequests)
      .where(eq(partnerRequests.id, pr.id)),
    getTestDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(partners)
      .where(eq(partners.prId, pr.id)),
  ]);

  assert.equal(rootRows.length, 0);
  assert.equal(partnerCountRows[0]?.count ?? 0, 0);
});

scenario("admin_pr_create_and_edit_allow_admin_only_pr_type", async (ctx) => {
  const admin = await givenAdminUser("admin-only-pr-operator");
  const creator = await givenUser("admin-only-edit-source");
  const prType = await givenPRTypeConfig({
    label: "admin-only-admin-pr",
    authoringCreationPolicy: "ADMIN_ONLY",
  });
  ctx.record("type", prType.type);

  const createResponse = await requestJson("/api/admin/prs", {
    method: "POST",
    token: admin.token,
    body: {
      timeWindow: prType.timeWindow,
      title: "Scenario admin created admin-only PR",
      type: prType.type,
      location: prType.locations[0] ?? "Scenario Court",
      minPartners: 2,
      maxPartners: null,
      preferences: [],
      notes: null,
      meetingPoint: null,
      joinGateConfig: [],
      confirmationStartOffsetMinutes: 120,
      confirmationEndOffsetMinutes: 30,
      joinLockOffsetMinutes: 30,
    },
  });
  const created = await expectJsonResponse<{ id: PRId }>(createResponse, 201);

  const editable = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Scenario admin editable source",
  });
  const editResponse = await requestJson(`/api/admin/prs/${editable.id}/content`, {
    method: "PATCH",
    token: admin.token,
    body: {
      timeWindow: prType.timeWindow,
      title: "Scenario admin edited admin-only PR",
      type: prType.type,
      location: prType.locations[0] ?? "Scenario Court",
      minPartners: 2,
      maxPartners: null,
      preferences: [],
      notes: null,
      meetingPoint: null,
      joinGateConfig: [],
      confirmationStartOffsetMinutes: 120,
      confirmationEndOffsetMinutes: 30,
      joinLockOffsetMinutes: 30,
    },
  });
  await expectJsonResponse(editResponse, 200);

  const [createdRoot, editedRoot] = await Promise.all([
    getTestDb()
      .select({
        type: partnerRequests.type,
        createdBy: partnerRequests.createdBy,
        status: partnerRequests.status,
      })
      .from(partnerRequests)
      .where(eq(partnerRequests.id, created.id)),
    getTestDb()
      .select({ type: partnerRequests.type })
      .from(partnerRequests)
      .where(eq(partnerRequests.id, editable.id)),
  ]);
  assert.equal(createdRoot[0]?.type, prType.type);
  assert.equal(createdRoot[0]?.createdBy, admin.user.id);
  assert.equal(createdRoot[0]?.status, "OPEN");
  assert.equal(editedRoot[0]?.type, prType.type);
});

scenario("admin_pr_content_edit_can_reclassify_type", async (ctx) => {
  const admin = await givenAdminUser("type-reclassify-operator");
  const creator = await givenUser("type-reclassify-source");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Scenario admin type reclassify source",
  });
  const nextType = (await givenPRTypeConfig({ label: "admin-reclassified-type" })).type;
  ctx.record("prId", pr.id);

  const editResponse = await requestJson(`/api/admin/prs/${pr.id}/content`, {
    method: "PATCH",
    token: admin.token,
    body: {
      timeWindow: ["2031-02-01T10:00:00.000Z", "2031-02-01T12:00:00.000Z"],
      title: "Scenario admin type reclassified",
      type: nextType,
      location: "Scenario Admin Reclassified Location",
      minPartners: 2,
      maxPartners: null,
      preferences: [],
      notes: null,
      meetingPoint: null,
      joinGateConfig: [],
      confirmationStartOffsetMinutes: 120,
      confirmationEndOffsetMinutes: 30,
      joinLockOffsetMinutes: 30,
    },
  });
  await expectJsonResponse(editResponse, 200);

  const [storedRoot] = await getTestDb()
    .select({ type: partnerRequests.type })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, pr.id));

  assert.equal(storedRoot?.type, nextType);
});
