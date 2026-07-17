import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { partnerRequests } from "../../src/entities";
import { PRTypeConfigRepository } from "../../src/repositories/PRTypeConfigRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { scenario } from "../_infra/scenario/scenario";
import { givenPersistedPartnerRequest } from "../pr-core/_kit/builders/partner-requests";
import { givenUser } from "../pr-core/_kit/builders/users";
import { givenPRTypeConfig, givenPRTypeVisiblePR } from "./_kit/builders/pr-type-config";

type Candidate = { prId: number; status: "OPEN"; canonicalPath: string };
type DirectoryResponse = {
  criteria: { type: string; dates: string[] };
  candidates: Candidate[];
  cardGroups: Array<{ candidates: Candidate[]; candidateCount: number }>;
};
type RecommendationResponse = {
  matchedCandidate:
    | (Candidate & { match: { exactPlace: boolean; startWithinWindow: boolean } })
    | null;
  orderedCandidates: Candidate[];
};

const configRepo = new PRTypeConfigRepository();

scenario("pr_discovery_list_and_card_share_one_persisted_open_feed", async (ctx) => {
  const firstCreator = await givenUser("pr-discovery-feed-first-creator");
  const secondCreator = await givenUser("pr-discovery-feed-second-creator");
  const viewer = await givenUser("pr-discovery-feed-viewer");
  const prType = await givenPRTypeConfig({ label: "feed", locations: ["Feed Library"] });
  const first = await givenPRTypeVisiblePR({
    creator: firstCreator,
    prType,
    title: "Feed candidate one",
  });
  const second = await givenPRTypeVisiblePR({
    creator: secondCreator,
    prType,
    title: "Feed candidate two",
  });
  const draft = await givenPersistedPartnerRequest({
    creator: firstCreator,
    status: "DRAFT",
    fields: {
      title: "Feed draft",
      type: prType.type,
      time: prType.timeWindow,
      location: "Feed Library",
      route: null,
      minPartners: 2,
      maxPartners: null,
      partners: [],
      budget: null,
      preferences: [],
      notes: null,
    },
  });

  ctx.record("type", prType.type);
  ctx.record("candidatePrIds", [first.id, second.id]);
  ctx.record("draftPrId", draft.id);

  const response = await expectJsonResponse<DirectoryResponse>(
    await requestJson(`/api/pr/discovery?type=${encodeURIComponent(prType.type)}`, {
      method: "GET",
      token: viewer.token,
    }),
    200,
  );
  assert.deepEqual(
    response.candidates.map(({ prId }) => prId).sort((a, b) => a - b),
    [first.id, second.id].sort((a, b) => a - b),
  );
  assert.deepEqual(
    response.cardGroups
      .flatMap((group) => group.candidates.map(({ prId }) => prId))
      .sort((a, b) => a - b),
    [first.id, second.id].sort((a, b) => a - b),
  );
  assert.deepEqual(
    response.cardGroups.map(({ candidateCount }) => candidateCount),
    [2],
  );
  assert.equal(
    response.candidates.every(({ status }) => status === "OPEN"),
    true,
  );
  assert.equal(
    response.candidates.every(({ canonicalPath }) => canonicalPath.startsWith("/pr/")),
    true,
  );
});

scenario("pr_discovery_form_recommends_pr_owned_candidates", async (ctx) => {
  const creator = await givenUser("pr-discovery-form-owner");
  const viewer = await givenUser("pr-discovery-form-viewer");
  const prType = await givenPRTypeConfig({ label: "form", locations: ["Form Library"] });
  const candidate = await givenPRTypeVisiblePR({
    creator,
    prType,
    title: "Form candidate",
    preferences: ["安静"],
  });
  const body = {
    type: prType.type,
    place: { kind: "location" as const, location: "Form Library" },
    timeWindows: [{ startAt: prType.timeWindow[0], endAt: prType.timeWindow[1] }],
    preferences: ["安静"],
  };

  ctx.record("type", prType.type);
  ctx.record("candidatePrId", candidate.id);

  const recommendation = await expectJsonResponse<RecommendationResponse>(
    await requestJson("/api/pr/discovery/recommend", {
      method: "POST",
      token: viewer.token,
      body,
    }),
    200,
  );
  assert.equal(recommendation.matchedCandidate?.prId, candidate.id);
  assert.equal(recommendation.matchedCandidate?.match.exactPlace, true);
  assert.equal(recommendation.matchedCandidate?.match.startWithinWindow, true);
  assert.deepEqual(recommendation.orderedCandidates, []);
});

scenario("pr_discovery_all_zero_ratios_fall_back_to_list", async (ctx) => {
  const prType = await givenPRTypeConfig({
    label: "zero-ratios",
    discoveryFormRatio: 0,
    discoveryCardRatio: 0,
    discoveryListRatio: 0,
  });
  ctx.record("type", prType.type);

  const response = await expectJsonResponse<{
    type: string;
    viewMode: string;
    viewRatios: { FORM: number; CARD: number; LIST: number };
  }>(
    await requestJson(`/api/pr/discovery/view?type=${encodeURIComponent(prType.type)}`, {
      method: "GET",
    }),
    200,
  );
  assert.equal(response.type, prType.type);
  assert.equal(response.viewMode, "LIST");
  assert.deepEqual(response.viewRatios, { FORM: 0, CARD: 0, LIST: 0 });
});

scenario(
  "pr_discovery_no_match_returns_candidates_without_persisting_a_suggestion",
  async (ctx) => {
    const creator = await givenUser("pr-discovery-no-match-owner");
    const viewer = await givenUser("pr-discovery-no-match-viewer");
    const prType = await givenPRTypeConfig({ label: "no-match", locations: ["No Match Library"] });
    const candidate = await givenPRTypeVisiblePR({
      creator,
      prType,
      title: "Outside selected time",
      timeWindow: ["2035-01-10T12:00:00.000Z", "2035-01-10T13:00:00.000Z"],
    });
    const before = (await configRepo.findByType(prType.type)) !== null;
    const recommendation = await expectJsonResponse<RecommendationResponse>(
      await requestJson("/api/pr/discovery/recommend", {
        method: "POST",
        token: viewer.token,
        body: {
          type: prType.type,
          place: { kind: "location", location: "No Match Library" },
          timeWindows: [{ startAt: prType.timeWindow[0], endAt: prType.timeWindow[1] }],
          preferences: [],
        },
      }),
      200,
    );
    const persisted = await getTestDb()
      .select({ id: partnerRequests.id })
      .from(partnerRequests)
      .where(eq(partnerRequests.type, prType.type));

    ctx.record("type", prType.type);
    ctx.record("candidatePrId", candidate.id);
    assert.equal(before, true);
    assert.equal(recommendation.matchedCandidate, null);
    assert.deepEqual(
      recommendation.orderedCandidates.map(({ prId }) => prId),
      [candidate.id],
    );
    assert.deepEqual(
      persisted.map(({ id }) => id),
      [candidate.id],
    );
  },
);
