import { describe, expect, test } from "vitest";
import { queryKeys } from "@/shared/api/query-keys";
import { normalizeAnalyticsFilters, normalizeFunnelFilters } from "../model/filters";

describe("analytics query contracts", () => {
  test("keeps the discovery key shape and normalized dimensions", () => {
    const filters = normalizeAnalyticsFilters({
      startAt: "2026-07-01T00:00:00.000Z",
      endAt: "2026-07-02T00:00:00.000Z",
      prType: " study ",
      viewMode: "CARD",
      origin: " landing ",
    });
    expect(queryKeys.admin.prDiscoveryFunnelAnalytics(filters)).toEqual([
      "admin",
      "analytics",
      "pr-discovery-funnel",
      {
        startAt: filters.startAt,
        endAt: filters.endAt,
        prType: "study",
        viewMode: "CARD",
        origin: "landing",
      },
    ]);
  });

  test("funnel routes only key the applied instants", () => {
    const filters = normalizeFunnelFilters({
      startAt: "start",
      endAt: "end",
      prType: "study",
      viewMode: "LIST",
      origin: "landing",
    });
    expect(queryKeys.admin.prCreateFunnelAnalytics(filters)).toEqual([
      "admin",
      "analytics",
      "pr-create-funnel",
      { startAt: "start", endAt: "end" },
    ]);
    expect(queryKeys.admin.prJoinFunnelAnalytics(filters)).toEqual([
      "admin",
      "analytics",
      "pr-join-funnel",
      { startAt: "start", endAt: "end" },
    ]);
    expect(queryKeys.admin.biOverviewAnalytics(filters)).toEqual([
      "admin",
      "analytics",
      "overview",
      { startAt: "start", endAt: "end" },
    ]);
  });
});
