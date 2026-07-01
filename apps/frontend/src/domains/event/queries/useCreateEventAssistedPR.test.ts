import { describe, expect, test } from "vitest";
import type { PartnerRequestFields, PRAllowEditAfterReady } from "@partner-up-dev/backend";
import { buildEventAssistedPRCreateBody } from "./useCreateEventAssistedPR";

const fields: PartnerRequestFields = {
  title: undefined,
  type: "羽毛球",
  time: ["2038-01-02T12:35:00.000Z", "2038-01-02T13:35:00.000Z"],
  location: null,
  route: [
    {
      name: "广州南站",
      full_address: null,
      wgs84: null,
      bd09: null,
      gcj02: [23.0674, 113.2698],
    },
    {
      name: "天河体育中心",
      full_address: null,
      wgs84: null,
      bd09: null,
      gcj02: [23.1405, 113.327],
    },
  ],
  minPartners: 2,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: [],
  notes: null,
  meetingPoint: null,
};

describe("event-assisted PR create query", () => {
  test("buildEventAssistedPRCreateBody submits only the unified structured create command", () => {
    const body = buildEventAssistedPRCreateBody({
      eventId: 42,
      fields,
    });

    expect(body).toEqual({
      fields,
      createSource: "EVENT_ASSISTED",
      anchorEventId: 42,
      allowEditAfterReady: null,
    });
    expect(body).not.toHaveProperty("routePoolEntryId");
    expect(body).not.toHaveProperty("correlationId");
  });

  test("buildEventAssistedPRCreateBody carries fuzzy ready-edit policy", () => {
    const allowEditAfterReady: PRAllowEditAfterReady = {
      timeWindow: ["2038-01-01T16:00:00.000Z", "2038-01-02T16:00:00.000Z"],
    };

    expect(
      buildEventAssistedPRCreateBody({
        eventId: 42,
        fields,
        allowEditAfterReady,
      }),
    ).toMatchObject({
      allowEditAfterReady,
    });
  });
});
