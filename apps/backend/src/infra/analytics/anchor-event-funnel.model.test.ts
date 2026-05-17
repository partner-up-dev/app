import assert from "node:assert/strict";
import { test } from "vitest";
import {
  buildAnchorEventFunnelResponseFromRows,
  resolveAnchorEventFunnelFilters,
  type AnchorEventFunnelEventRow,
  type AnchorEventFunnelSegmentRow,
  type OfficialAccountFollowNudgeEventRow,
} from "./anchor-event-funnel.model";

const filters = resolveAnchorEventFunnelFilters({
  startAt: new Date("2026-05-01T00:00:00.000Z"),
  endAt: new Date("2026-05-08T00:00:00.000Z"),
});

const buildEvent = (
  segment: AnchorEventFunnelSegmentRow,
  eventName: string,
  properties: Record<string, unknown> = {},
): AnchorEventFunnelEventRow => ({
  eventName,
  appJourneyId: segment.appJourneyId,
  segmentId: segment.segmentId,
  renderedMode: segment.renderedMode,
  properties,
});

const buildOfficialAccountFollowNudgeEvent = (
  appJourneyId: string,
  eventName: OfficialAccountFollowNudgeEventRow["eventName"],
  source: string | null,
  action: string | null = null,
): OfficialAccountFollowNudgeEventRow => ({
  eventName,
  appJourneyId,
  source,
  action,
});

test("buildAnchorEventFunnelResponseFromRows aggregates Anchor Event funnel cohorts", () => {
  const formSegment: AnchorEventFunnelSegmentRow = {
    segmentId: "segment-form",
    appJourneyId: "journey-form",
    renderedMode: "FORM",
    startSpm: "campaign.alpha",
  };
  const cardSegment: AnchorEventFunnelSegmentRow = {
    segmentId: "segment-card",
    appJourneyId: "journey-card",
    renderedMode: "CARD_RICH",
    startSpm: "campaign.alpha",
  };
  const listSegment: AnchorEventFunnelSegmentRow = {
    segmentId: "segment-list",
    appJourneyId: "journey-list",
    renderedMode: "LIST",
    startSpm: null,
  };

  const response = buildAnchorEventFunnelResponseFromRows(
    filters,
    [formSegment, cardSegment, listSegment],
    [
      buildEvent(formSegment, "anchor_event.landing.viewed"),
      buildEvent(formSegment, "anchor_event.form.started"),
      buildEvent(formSegment, "anchor_event.recommendation.returned", {
        candidateCount: 2,
      }),
      buildEvent(formSegment, "anchor_event.candidate.engaged"),
      buildEvent(formSegment, "pr.entry.reached"),
      buildEvent(formSegment, "pr.commitment.result", {
        commitmentType: "join",
        actionResult: "success",
      }),
      buildEvent(cardSegment, "anchor_event.landing.viewed"),
      buildEvent(cardSegment, "anchor_event.card.seen"),
      buildEvent(cardSegment, "anchor_event.card.action_taken", {
        action: "detail",
      }),
      buildEvent(cardSegment, "pr.commitment.result", {
        commitmentType: "create",
        actionResult: "blocked",
        failureCode: "WECHAT_AUTH_REQUIRED",
        failureReason: "WeChat auth required",
      }),
      buildEvent(listSegment, "anchor_event.landing.viewed"),
      buildEvent(listSegment, "anchor_event.list.loaded"),
      buildEvent(listSegment, "anchor_event.pr_row.seen"),
      buildEvent(listSegment, "pr.entry.reached"),
      buildEvent(listSegment, "pr.commitment.result", {
        commitmentType: "create",
        actionResult: "success",
      }),
    ],
  );

  assert.deepEqual(response.summary, {
    journeys: 3,
    prExposureJourneys: 3,
    prEntryJourneys: 2,
    prCommitmentJourneys: 2,
    commitmentRate: 2 / 3,
    createSuccess: 1,
    joinSuccess: 1,
    waitlistSuccess: 0,
  });

  assert.deepEqual(
    response.modes.map((row) => ({
      renderedMode: row.renderedMode,
      journeys: row.journeys,
      prCommitmentJourneys: row.prCommitmentJourneys,
      createSuccess: row.createSuccess,
      joinSuccess: row.joinSuccess,
    })),
    [
      {
        renderedMode: "FORM",
        journeys: 1,
        prCommitmentJourneys: 1,
        createSuccess: 0,
        joinSuccess: 1,
      },
      {
        renderedMode: "CARD_RICH",
        journeys: 1,
        prCommitmentJourneys: 0,
        createSuccess: 0,
        joinSuccess: 0,
      },
      {
        renderedMode: "LIST",
        journeys: 1,
        prCommitmentJourneys: 1,
        createSuccess: 1,
        joinSuccess: 0,
      },
    ],
  );

  const formFunnel = response.funnels.find(
    (funnel) => funnel.renderedMode === "FORM",
  );
  assert.ok(formFunnel);
  assert.equal(formFunnel.steps[0]?.stepKey, "landing_viewed");
  assert.equal(formFunnel.steps[0]?.journeyCount, 1);
  assert.equal(formFunnel.steps[0]?.eventCount, 1);
  assert.equal(
    formFunnel.steps.find((step) => step.stepKey === "recommendation_returned")
      ?.journeyCount,
    1,
  );

  assert.deepEqual(response.outcomes, [
    {
      renderedMode: "FORM",
      commitmentType: "join",
      actionResult: "success",
      journeyCount: 1,
      eventCount: 1,
    },
    {
      renderedMode: "CARD_RICH",
      commitmentType: "create",
      actionResult: "blocked",
      journeyCount: 1,
      eventCount: 1,
    },
    {
      renderedMode: "LIST",
      commitmentType: "create",
      actionResult: "success",
      journeyCount: 1,
      eventCount: 1,
    },
  ]);

  assert.deepEqual(response.failures, [
    {
      renderedMode: "CARD_RICH",
      eventName: "pr.commitment.result",
      commitmentType: "create",
      failureCode: "WECHAT_AUTH_REQUIRED",
      failureReason: "WeChat auth required",
      journeyCount: 1,
      eventCount: 1,
    },
  ]);

  assert.deepEqual(response.sources, [
    {
      sourceKey: "campaign.alpha",
      sourceType: "start_spm",
      renderedMode: "FORM",
      journeys: 1,
      prCommitmentJourneys: 1,
      commitmentRate: 1,
    },
    {
      sourceKey: "campaign.alpha",
      sourceType: "start_spm",
      renderedMode: "CARD_RICH",
      journeys: 1,
      prCommitmentJourneys: 0,
      commitmentRate: 0,
    },
    {
      sourceKey: "unknown",
      sourceType: "unknown",
      renderedMode: "LIST",
      journeys: 1,
      prCommitmentJourneys: 1,
      commitmentRate: 1,
    },
  ]);
});

test("resolveAnchorEventFunnelFilters applies the seven day default window", () => {
  const resolved = resolveAnchorEventFunnelFilters({
    endAt: new Date("2026-05-08T00:00:00.000Z"),
    eventId: 193,
    renderedMode: "FORM",
  });

  assert.deepEqual(resolved, {
    startAt: "2026-05-01T00:00:00.000Z",
    endAt: "2026-05-08T00:00:00.000Z",
    eventId: 193,
    spm: null,
    sourceQr: null,
    assignmentRevision: null,
    renderedMode: "FORM",
  });
});

test("buildAnchorEventFunnelResponseFromRows aggregates official account Nudge follow clicks", () => {
  const response = buildAnchorEventFunnelResponseFromRows(filters, [], [], [
    buildOfficialAccountFollowNudgeEvent(
      "journey-home-follow",
      "official.account.follow.nudge.shown",
      "home",
    ),
    buildOfficialAccountFollowNudgeEvent(
      "journey-home-follow",
      "official.account.follow.nudge.action.click",
      "home",
      "complete",
    ),
    buildOfficialAccountFollowNudgeEvent(
      "journey-anchor-dismiss",
      "official.account.follow.nudge.shown",
      "anchor_event",
    ),
    buildOfficialAccountFollowNudgeEvent(
      "journey-anchor-dismiss",
      "official.account.follow.nudge.action.click",
      "anchor_event",
      "dismiss",
    ),
    buildOfficialAccountFollowNudgeEvent(
      "journey-waitlist-follow",
      "official.account.follow.nudge.shown",
      "pr_waitlist_result",
    ),
    buildOfficialAccountFollowNudgeEvent(
      "journey-waitlist-follow",
      "official.account.follow.nudge.action.click",
      "pr_waitlist_result",
      "complete",
    ),
  ]);

  assert.deepEqual(response.officialAccountFollowNudge, {
    shownJourneys: 3,
    followClickJourneys: 2,
    dismissJourneys: 1,
    shownEvents: 3,
    followClickEvents: 2,
    dismissEvents: 1,
    followClickRate: 2 / 3,
    sources: [
      {
        source: "anchor_event",
        shownJourneys: 1,
        followClickJourneys: 0,
        dismissJourneys: 1,
        shownEvents: 1,
        followClickEvents: 0,
        dismissEvents: 1,
        followClickRate: 0,
      },
      {
        source: "home",
        shownJourneys: 1,
        followClickJourneys: 1,
        dismissJourneys: 0,
        shownEvents: 1,
        followClickEvents: 1,
        dismissEvents: 0,
        followClickRate: 1,
      },
      {
        source: "pr_waitlist_result",
        shownJourneys: 1,
        followClickJourneys: 1,
        dismissJourneys: 0,
        shownEvents: 1,
        followClickEvents: 1,
        dismissEvents: 0,
        followClickRate: 1,
      },
    ],
  });
});
