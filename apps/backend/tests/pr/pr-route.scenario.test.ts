import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { getWaitlistAlternativeAvailableNotificationContext } from "../../src/domains/pr/notification-contexts";
import {
  type PartnerRequestFields,
  type PRId,
  type PRRoute,
  type PRStatus,
  partnerRequests,
} from "../../src/entities";
import { PartnerRepository } from "../../src/repositories/PartnerRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { scenario } from "../_infra/scenario/scenario";
import { givenDraftPR } from "./_kit/builders/partner-requests";
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

type ProblemDetailsResponse = {
  code?: string;
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

const partnerRepo = new PartnerRepository();

scenario("public_share_cache_rejects_draft_without_writing_cache", async (ctx) => {
  const pr = await givenDraftPR({ creator: null, title: "Scenario draft share cache" });
  ctx.record("prId", pr.id);

  for (const [path, body] of [
    [
      "/api/share/xiaohongshu/cache-poster",
      {
        prId: pr.id,
        caption: "draft",
        posterStylePrompt: "plain",
        posterUrl: "https://example.com/draft.png",
      },
    ],
    [
      "/api/share/xiaohongshu/get-cached-poster",
      {
        prId: pr.id,
        caption: "draft",
        posterStylePrompt: "plain",
      },
    ],
    [
      "/api/share/wechat-card/cache-thumbnail",
      {
        prId: pr.id,
        style: 0,
        posterUrl: "https://example.com/draft.png",
      },
    ],
    ["/api/share/wechat-card/get-cached-thumbnail", { prId: pr.id, style: 0 }],
  ] as const) {
    const response = await requestJson(path, { method: "POST", body });
    const problem = await expectJsonResponse<ProblemDetailsResponse>(response, 404);
    assert.equal(problem.code, "PR_NOT_ACCESSIBLE");
  }

  const [stored] = await getTestDb()
    .select({
      xiaohongshuPoster: partnerRequests.xiaohongshuPoster,
      wechatThumbnail: partnerRequests.wechatThumbnail,
    })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, pr.id));
  assert.equal(stored?.xiaohongshuPoster, null);
  assert.equal(stored?.wechatThumbnail, null);
});

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
      createSource: "STRUCTURED_FORM",
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
  assert.equal(detail.share.canonical.title, "通勤拼车");
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
  assert.equal(updatedDetail.share.canonical.title, "通勤拼车");
  assert.notEqual(updatedDetail.share.canonical.revision, detail.share.canonical.revision);
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
  assert.equal(joined.status, "OPEN");

  const waitlisted = await waitlistPR({
    pr: source,
    user: candidate,
    alternativePrReminderOptIn: true,
  });
  if (waitlisted.myPendingPartnerId === null) {
    throw new Error("Expected route PR pending waitlist slot");
  }
  const sourceSlot = await partnerRepo.findById(waitlisted.myPendingPartnerId);
  assert.ok(sourceSlot?.waitlistCycleId, "Expected current source waitlist cycle");

  const context = await getWaitlistAlternativeAvailableNotificationContext({
    sourcePrId: source.id,
    sourcePartnerId: waitlisted.myPendingPartnerId,
    sourceWaitlistCycleId: sourceSlot.waitlistCycleId,
    candidatePrId: alternative.id,
    recipientUserId: candidate.user.id,
  });
  assert.equal(context.state, "SKIPPED");
  if (context.state !== "READY") {
    assert.equal(context.reason, "CANDIDATE_PR_MISMATCH");
  }
});
