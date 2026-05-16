import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import {
  partnerRequests,
  type PartnerRequestFields,
  type PRId,
  type PRRoute,
  type PRStatus,
} from "../../src/entities";
import { givenUser } from "./_kit/builders/users";

type CreatePRResponse = {
  id: PRId;
  status: PRStatus;
  canonicalPath: string;
};

type PRDetailResponse = {
  id: PRId;
  core: {
    type: string;
    location: string | null;
    route: PRRoute | null;
    placeDisplayName: string | null;
  };
  share: {
    canonical: {
      title: string;
      description: string;
      revision: string;
    };
  };
};

type PublicPRResponse = {
  id: PRId;
  location: string | null;
  route: PRRoute | null;
};

const buildRoute = (endName = "天河体育中心"): PRRoute => [
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.0674, 113.2698],
    name: "广州南站",
    full_address: "广州市番禺区石壁街道",
  },
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.1405, 113.327],
    name: endName,
    full_address: null,
  },
];

const buildRouteFields = (route: PRRoute): PartnerRequestFields => ({
  title: undefined,
  type: "通勤拼车",
  time: ["2036-02-01T00:00:00.000Z", "2036-02-01T01:00:00.000Z"],
  location: null,
  route,
  minPartners: 2,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: ["安静"],
  notes: null,
  meetingPoint: null,
});

scenario("route_pr_create_read_and_update", async (ctx) => {
  const creator = await givenUser("route-pr-creator");
  const initialRoute = buildRoute();
  const createResponse = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: creator.token,
    body: {
      fields: buildRouteFields(initialRoute),
      createSource: "FORM",
    },
  });
  const created = await expectJsonResponse<CreatePRResponse>(createResponse, 201);
  ctx.record("prId", created.id);

  assert.equal(created.status, "OPEN");

  const [storedAfterCreate] = await getTestDb()
    .select({
      location: partnerRequests.location,
      route: partnerRequests.route,
    })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, created.id));
  assert.equal(storedAfterCreate?.location, null);
  assert.deepEqual(storedAfterCreate?.route, initialRoute);

  const detail = await expectJsonResponse<PRDetailResponse>(
    await requestJson(`/api/pr/${created.id}`, {
      method: "GET",
      token: creator.token,
    }),
    200,
  );
  assert.equal(detail.core.location, null);
  assert.deepEqual(detail.core.route, initialRoute);
  assert.equal(detail.core.placeDisplayName, "广州南站~天河体育中心");
  assert.equal(detail.share.canonical.title, "广州南站~天河体育中心");
  assert.match(detail.share.canonical.description, /广州南站~天河体育中心/);

  const updatedRoute = buildRoute("琶洲会展中心");
  const updatedFields = buildRouteFields(updatedRoute);
  const updateResponse = await requestJson(`/api/pr/${created.id}/content`, {
    method: "PATCH",
    token: creator.token,
    body: {
      fields: {
        title: updatedFields.title,
        time: updatedFields.time,
        location: updatedFields.location,
        route: updatedFields.route,
        minPartners: updatedFields.minPartners,
        maxPartners: updatedFields.maxPartners,
        partners: updatedFields.partners,
        budget: updatedFields.budget,
        preferences: updatedFields.preferences,
        notes: updatedFields.notes,
        meetingPoint: updatedFields.meetingPoint,
      },
    },
  });
  const updated = await expectJsonResponse<PublicPRResponse>(updateResponse, 200);
  assert.equal(updated.location, null);
  assert.deepEqual(updated.route, updatedRoute);

  const updatedDetail = await expectJsonResponse<PRDetailResponse>(
    await requestJson(`/api/pr/${created.id}`, {
      method: "GET",
      token: creator.token,
    }),
    200,
  );
  assert.equal(updatedDetail.core.placeDisplayName, "广州南站~琶洲会展中心");
  assert.equal(updatedDetail.share.canonical.title, "广州南站~琶洲会展中心");
  assert.notEqual(
    updatedDetail.share.canonical.revision,
    detail.share.canonical.revision,
  );
});
