import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import {
  expectJsonResponse,
  requestJson,
} from "../_infra/http/backend-app";
import type { PRId } from "../../src/entities";
import {
  givenAnchorEvent,
  givenAnchorEventVisiblePR,
} from "./_kit/builders/anchor-events";
import { joinPartnerRequest } from "../pr-core/_kit/actions/join";
import { givenUser } from "../pr-core/_kit/builders/users";

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

type DemandCardResponse = Array<{
  cardKey: string;
  timeWindow: [string | null, string | null];
  displayLocationName: string;
  detailPrId: PRId | null;
  candidateCount: number;
}>;

scenario(
  "anchor_event_form_mode_recommendation_excludes_viewer_active_partner_pr",
  async (ctx) => {
    const joinedCreator = await givenUser(
      "recommendation-form-joined-creator",
    );
    const openCreator = await givenUser("recommendation-form-open-creator");
    const visitor = await givenUser("recommendation-form-visitor");
    const event = await givenAnchorEvent({
      label: "recommendation-form-active-partner",
    });
    const joinedPr = await givenAnchorEventVisiblePR({
      creator: joinedCreator,
      event,
      title: "Already joined recommendation candidate",
    });
    const openPr = await givenAnchorEventVisiblePR({
      creator: openCreator,
      event,
      title: "Unjoined recommendation candidate",
    });
    await joinPartnerRequest({ pr: joinedPr, user: visitor });

    ctx.record("eventId", event.id);
    ctx.record("joinedPrId", joinedPr.id);
    ctx.record("openPrId", openPr.id);
    ctx.record("visitorUserId", visitor.user.id);

    const recommendation =
      await expectJsonResponse<FormModeRecommendationResponse>(
        await requestJson(`/api/events/${event.id}/form-mode/recommendation`, {
          method: "POST",
          token: visitor.token,
          body: {
            place: {
              kind: "location",
              locationId: event.locationId,
            },
            startAt: event.timeWindow[0],
            preferences: [],
          },
        }),
        200,
      );

    assert.equal(recommendation.matchedRecommendation?.pr.id, openPr.id);
    assert.equal(
      recommendation.orderedCandidates.some(
        (candidate) => candidate.pr.id === joinedPr.id,
      ),
      false,
    );
  },
);

scenario(
  "anchor_event_card_mode_demand_cards_exclude_viewer_active_partner_pr",
  async (ctx) => {
    const joinedCreator = await givenUser("recommendation-card-joined-creator");
    const openCreator = await givenUser("recommendation-card-open-creator");
    const visitor = await givenUser("recommendation-card-visitor");
    const event = await givenAnchorEvent({
      label: "recommendation-card-active-partner",
    });
    const joinedPr = await givenAnchorEventVisiblePR({
      creator: joinedCreator,
      event,
      title: "Already joined card candidate",
    });
    const openPr = await givenAnchorEventVisiblePR({
      creator: openCreator,
      event,
      title: "Unjoined card candidate",
    });
    await joinPartnerRequest({ pr: joinedPr, user: visitor });

    ctx.record("eventId", event.id);
    ctx.record("joinedPrId", joinedPr.id);
    ctx.record("openPrId", openPr.id);
    ctx.record("visitorUserId", visitor.user.id);

    const cards = await expectJsonResponse<DemandCardResponse>(
      await requestJson(`/api/events/${event.id}/demand-cards`, {
        method: "GET",
        token: visitor.token,
      }),
      200,
    );

    const card = cards.find(
      (candidate) =>
        candidate.displayLocationName === event.locationId &&
        candidate.timeWindow[0] === event.timeWindow[0],
    );

    assert.ok(card, "Expected demand card for the unjoined matching PR");
    assert.equal(card.detailPrId, openPr.id);
    assert.equal(card.candidateCount, 1);
  },
);
