import assert from "node:assert/strict";
import { test } from "vitest";
import type { PartnerRequest } from "../../../entities/partner-request";
import type { EffectiveMeetingPoint } from "./meeting-point.service";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

const request = {
  id: 42,
  type: "board-game",
  location: "poiA",
  meetingPoint: null,
} as PartnerRequest;

const previous: EffectiveMeetingPoint = {
  source: "POI",
  description: "旧集合点",
  imageUrl: null,
};

test("collectMeetingPointNotificationChanges is a pure effective-delta detector", async () => {
  const { collectMeetingPointNotificationChanges } =
    await import("./meeting-point-change-notifier.service");

  const changes = await collectMeetingPointNotificationChanges({
    previous: new Map([[request.id, previous]]),
    requests: [request],
    resolve: async () => ({
      source: "PR_TYPE",
      description: "新集合点",
      imageUrl: null,
    }),
  });

  assert.deepEqual(changes, [
    {
      request,
      meetingPointDescription: "新集合点",
    },
  ]);
});

test("collectMeetingPointNotificationChanges keeps no-description suppression", async () => {
  const { collectMeetingPointNotificationChanges } =
    await import("./meeting-point-change-notifier.service");

  const changes = await collectMeetingPointNotificationChanges({
    previous: new Map([[request.id, previous]]),
    requests: [request],
    resolve: async () => ({
      source: "PR_TYPE",
      description: null,
      imageUrl: "https://example.com/point.png",
    }),
  });

  assert.deepEqual(changes, []);
});
