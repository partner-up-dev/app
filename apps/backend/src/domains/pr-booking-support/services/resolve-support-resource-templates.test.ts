import assert from "node:assert/strict";
import { test } from "vitest";
import type { AnchorEventSupportResource } from "../../../entities";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

const timeWindow: [string, string] = [
  "2031-01-01T10:00:00.000Z",
  "2031-01-01T12:00:00.000Z",
];

const buildResource = (
  overrides: Partial<AnchorEventSupportResource> = {},
): AnchorEventSupportResource => ({
  id: 1,
  anchorEventId: 1,
  code: "resource",
  title: "Scenario resource",
  resourceKind: "VENUE",
  appliesToAllLocations: true,
  locationIds: [],
  bookingRequired: true,
  bookingHandledBy: "PLATFORM",
  bookingDeadlineRule: null,
  bookingLocksParticipant: false,
  cancellationPolicy: null,
  settlementMode: "NONE",
  subsidyRate: null,
  subsidyCap: null,
  requiresUserTransferToPlatform: false,
  summaryText: "Scenario support resource",
  detailRules: [],
  joinGateConfig: [],
  displayOrder: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

test("resolveSupportResourceTemplates keeps all-location resources when PR location is null", async () => {
  const { resolveSupportResourceTemplates } = await import(
    "./resolve-support-resource-templates"
  );

  assert.equal(
    resolveSupportResourceTemplates({
      eventResources: [buildResource()],
      prId: 1,
      location: null,
      timeWindow,
    }).length,
    1,
  );
});

test("resolveSupportResourceTemplates requires PR location for scoped resources", async () => {
  const { resolveSupportResourceTemplates } = await import(
    "./resolve-support-resource-templates"
  );

  assert.equal(
    resolveSupportResourceTemplates({
      eventResources: [
        buildResource({
          appliesToAllLocations: false,
          locationIds: ["Court A"],
        }),
      ],
      prId: 1,
      location: null,
      timeWindow,
    }).length,
    0,
  );

  assert.equal(
    resolveSupportResourceTemplates({
      eventResources: [buildResource()],
      prId: 1,
      location: "Court A",
      timeWindow,
    }).length,
    1,
  );

  assert.equal(
    resolveSupportResourceTemplates({
      eventResources: [
        buildResource({
          appliesToAllLocations: false,
          locationIds: ["Court B"],
        }),
      ],
      prId: 1,
      location: "Court A",
      timeWindow,
    }).length,
    0,
  );

  assert.equal(
    resolveSupportResourceTemplates({
      eventResources: [
        buildResource({
          appliesToAllLocations: false,
          locationIds: ["Court A"],
        }),
      ],
      prId: 1,
      location: "Court A",
      timeWindow,
    }).length,
    1,
  );
});
