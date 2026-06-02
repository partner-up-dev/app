import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import {
  expectJsonResponse,
  requestJson,
} from "../_infra/http/backend-app";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import type {
  PartnerRequestFields,
  PRId,
  PRRoute,
  PRStatus,
} from "../../src/entities";
import { joinPartnerRequest } from "../pr-core/_kit/actions/join";
import { givenUser, type ScenarioUser } from "../pr-core/_kit/builders/users";
import { givenAnchorEvent } from "./_kit/builders/anchor-events";

type CreatePRResponse = {
  id: PRId;
  status: PRStatus;
  canonicalPath: string;
};

type FormModeRecommendationResponse = {
  matchedRecommendation: {
    pr: {
      id: PRId;
    };
  } | null;
  orderedCandidates: Array<{
    pr: {
      id: PRId;
    };
  }>;
};

const prRepo = new PartnerRequestRepository();

const buildRoute = (endName = "天河体育中心"): PRRoute => [
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.0674, 113.2698],
    name: "广州南站",
    full_address: null,
  },
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.1405, 113.327],
    name: endName,
    full_address: null,
  },
];

const createEventRoutePR = async (input: {
  creator: ScenarioUser;
  type: string;
  timeWindow: [string, string];
  title: string;
  minPartners?: number | null;
  maxPartners?: number | null;
}): Promise<CreatePRResponse> => {
  const fields: PartnerRequestFields = {
    title: input.title,
    type: input.type,
    time: input.timeWindow,
    location: null,
    route: buildRoute(),
    minPartners: input.minPartners ?? 2,
    maxPartners: input.maxPartners ?? null,
    partners: [],
    budget: null,
    preferences: ["场景:路线"],
    notes: null,
    meetingPoint: null,
  };

  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: input.creator.token,
    body: {
      fields,
      createSource: "FORM",
    },
  });

  return await expectJsonResponse<CreatePRResponse>(response, 201);
};

scenario("anchor_event_form_mode_recommendation_excludes_route_mode_prs", async (ctx) => {
  const creator = await givenUser("route-form-recommendation-creator");
  const event = await givenAnchorEvent({
    label: "route-form-recommendation",
  });
  const routePr = await createEventRoutePR({
    creator,
    type: event.type,
    timeWindow: event.timeWindow,
    title: "Route recommendation candidate",
  });
  ctx.record("eventId", event.id);
  ctx.record("routePrId", routePr.id);

  const recommendation =
    await expectJsonResponse<FormModeRecommendationResponse>(
      await requestJson(`/api/events/${event.id}/form-mode/recommendation`, {
        method: "POST",
        body: {
          locationId: event.locationId,
          startAt: event.timeWindow[0],
          preferences: [],
        },
      }),
      200,
    );

  assert.equal(recommendation.matchedRecommendation?.pr.id ?? null, null);
  assert.equal(
    recommendation.orderedCandidates.some(
      (candidate) => candidate.pr.id === routePr.id,
    ),
    false,
  );
});

scenario("anchor_event_full_expansion_ignores_route_mode_source_pr", async (ctx) => {
  const creator = await givenUser("route-full-expansion-creator");
  const joiner = await givenUser("route-full-expansion-joiner");
  const event = await givenAnchorEvent({
    label: "route-full-expansion",
    locationIds: [
      "System Route Full Expansion Court A",
      "System Route Full Expansion Court B",
    ],
    fullPrExpansionPolicy: "ENABLED",
  });
  const routePr = await createEventRoutePR({
    creator,
    type: event.type,
    timeWindow: event.timeWindow,
    title: "Route full expansion source",
    minPartners: 1,
    maxPartners: 2,
  });
  ctx.record("eventId", event.id);
  ctx.record("routePrId", routePr.id);

  const joined = await joinPartnerRequest({ pr: routePr, user: joiner });
  assert.equal(joined.status, "OPEN");

  const prs = await prRepo.findByTypeAndTime(event.type, event.timeWindow);
  assert.equal(prs.length, 1);
  assert.equal(prs[0]?.id, routePr.id);
});
