import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND } from "../../src/domains/notification";
import { prepareWaitlistAlternativeAvailableNotificationDispatch } from "../../src/domains/notification/services/waitlist-alternative-available-dispatch.service";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { UserNotificationOptRepository } from "../../src/repositories/UserNotificationOptRepository";
import {
  partnerRequests,
  type PartnerRequestFields,
  type PRId,
  type PRRoute,
  type PRStatus,
} from "../../src/entities";
import { bindScenarioWeChatOpenId } from "./_kit/actions/system-state";
import { joinPartnerRequest } from "./_kit/actions/join";
import { waitlistPR } from "./_kit/actions/waitlist";
import { givenUser, type ScenarioUser } from "./_kit/builders/users";

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

const userNotificationOptRepo = new UserNotificationOptRepository();

const buildRouteFields = (
  route: PRRoute,
  overrides: Partial<Omit<PartnerRequestFields, "location" | "route">> = {},
): PartnerRequestFields => ({
  title: undefined,
  type: "通勤拼车",
  time: ["2036-02-01T00:00:00.000Z", "2036-02-01T01:00:00.000Z"],
  minPartners: 2,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: ["安静"],
  notes: null,
  meetingPoint: null,
  ...overrides,
  location: null,
  route,
});

const createRoutePR = async (input: {
  creator: ScenarioUser;
  route: PRRoute;
  fields?: Partial<Omit<PartnerRequestFields, "location" | "route">>;
}): Promise<CreatePRResponse> => {
  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: input.creator.token,
    body: {
      fields: buildRouteFields(input.route, input.fields),
      createSource: "FORM",
    },
  });

  return await expectJsonResponse<CreatePRResponse>(response, 201);
};

scenario("route_pr_create_read_and_update", async (ctx) => {
  const creator = await givenUser("route-pr-creator");
  const initialRoute = buildRoute();
  const created = await createRoutePR({
    creator,
    route: initialRoute,
  });
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

scenario("route_pr_stays_out_of_location_based_waitlist_alternatives", async (ctx) => {
  const sourceCreator = await givenUser("route-alt-source-creator");
  const sourceJoiner = await givenUser("route-alt-source-joiner");
  const alternativeCreator = await givenUser("route-alt-alt-creator");
  const candidate = await givenUser("route-alt-candidate");

  const source = await createRoutePR({
    creator: sourceCreator,
    route: buildRoute("珠江新城"),
    fields: {
      title: "Route alternative source",
      minPartners: 1,
      maxPartners: 2,
    },
  });
  const alternative = await createRoutePR({
    creator: alternativeCreator,
    route: buildRoute("琶洲会展中心"),
    fields: {
      title: "Route alternative candidate",
      minPartners: 1,
      maxPartners: 2,
    },
  });
  ctx.record("sourcePrId", source.id);
  ctx.record("alternativePrId", alternative.id);
  ctx.record("candidateUserId", candidate.user.id);

  const joined = await joinPartnerRequest({
    pr: source,
    user: sourceJoiner,
  });
  assert.equal(joined.status, "FULL");

  await bindScenarioWeChatOpenId({
    user: candidate,
    openId: "openid-route-alt-candidate",
  });
  await userNotificationOptRepo.addOneWechatNotificationCredit(
    candidate.user.id,
    WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND,
  );

  const waitlisted = await waitlistPR({
    pr: source,
    user: candidate,
    alternativePrReminderOptIn: true,
  });
  if (waitlisted.myPendingPartnerId === null) {
    throw new Error("Expected route PR pending waitlist slot");
  }

  const prepared =
    await prepareWaitlistAlternativeAvailableNotificationDispatch({
      sourcePrId: source.id,
      sourcePartnerId: waitlisted.myPendingPartnerId,
      candidatePrId: alternative.id,
      recipientUserId: candidate.user.id,
    });
  assert.equal(prepared.status, "SKIPPED");
  if (prepared.status !== "READY") {
    assert.equal(prepared.errorCode, "CANDIDATE_PR_MISMATCH");
  }
});
