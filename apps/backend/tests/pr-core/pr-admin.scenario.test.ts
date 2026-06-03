import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenAdminUser, givenUser } from "./_kit/builders/users";
import { givenAnchorEvent } from "../anchor-event/_kit/builders/anchor-events";
import { getTestDb } from "../_infra/probes/sql-probe";
import { partnerRequests, partners } from "../../src/entities";
import type { PRId } from "../../src/entities";

scenario(
  "admin_delete_pr_removes_root_and_partners",
  async (ctx) => {
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
  },
);

scenario("admin_pr_create_and_edit_allow_admin_only_event_type", async (ctx) => {
  const admin = await givenAdminUser("admin-only-pr-operator");
  const creator = await givenUser("admin-only-edit-source");
  const event = await givenAnchorEvent({
    label: "admin-only-admin-pr",
    prCreationPolicy: "ADMIN_ONLY",
  });
  ctx.record("eventId", event.id);

  const createResponse = await requestJson("/api/admin/prs", {
    method: "POST",
    token: admin.token,
    body: {
      timeWindow: event.timeWindow,
      title: "Scenario admin created admin-only PR",
      type: event.type,
      location: event.locationId,
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
  const created = await expectJsonResponse<{ root: { id: PRId } }>(
    createResponse,
    200,
  );

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
      timeWindow: event.timeWindow,
      title: "Scenario admin edited admin-only PR",
      type: event.type,
      location: event.locationId,
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
      .select({ type: partnerRequests.type })
      .from(partnerRequests)
      .where(eq(partnerRequests.id, created.root.id)),
    getTestDb()
      .select({ type: partnerRequests.type })
      .from(partnerRequests)
      .where(eq(partnerRequests.id, editable.id)),
  ]);
  assert.equal(createdRoot[0]?.type, event.type);
  assert.equal(editedRoot[0]?.type, event.type);
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
  const nextType = "scenario-admin-reclassified-type";
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
