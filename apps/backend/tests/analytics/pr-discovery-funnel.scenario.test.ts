import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { factPRDiscoveryFunnelEvents, userTelemetryEvents } from "../../src/entities";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { scenario } from "../_infra/scenario/scenario";
import { givenAdminUser } from "../pr/_kit/builders/users";

const names = [
  "pr.discovery.surface.viewed",
  "pr.discovery.criteria.submitted",
  "pr.discovery.recommendation.returned",
  "pr.discovery.candidate.impression",
  "pr.discovery.candidate.action",
  "pr.discovery.authoring.handoff",
] as const;

scenario("analytics_pr_discovery_funnel_reads_typed_fact_context", async (ctx) => {
  const admin = await givenAdminUser("pr-discovery-fact");
  const journeyId = randomUUID();
  const startAt = new Date("2035-05-01T00:00:00.000Z");
  const event = (
    eventName: string,
    occurredAt: Date,
    payload: Record<string, unknown>,
    options: { journeyId?: string; eventId?: string } = {},
  ) => ({
    eventId: options.eventId ?? randomUUID(),
    eventName,
    eventVersion: 1,
    eventFamily: eventName.startsWith("pr.discovery") ? "pr.discovery" : eventName,
    journeyId: options.journeyId ?? journeyId,
    traceId: null,
    attributes: {},
    payload,
    occurredAt,
    receivedAt: new Date("2035-05-01T00:00:00.000Z"),
  });

  await getTestDb()
    .insert(userTelemetryEvents)
    .values([
      event("route.entered", new Date(startAt.getTime() - 1_000), {
        routePath: "/prd",
        routeName: "pr-discovery",
        spm: "home.discovery",
        sourceQr: "qr-2035",
      }),
      event("auth.session.created", new Date(startAt.getTime() - 1_000), {
        anonymous_id: "anon-2035",
        authenticated_user_hash: "user-2035",
      }),
      ...names.map((eventName, index) =>
        event(eventName, new Date(startAt.getTime() + index * 1_000), {
          prType: "hiking",
          viewMode: "LIST",
          origin: "direct",
          ...(eventName.includes("recommendation") ? { outcome: "matched" } : {}),
          ...(eventName.includes("impression") ? { prId: 42, rank: 1 } : {}),
          ...(eventName.includes("action") ? { prId: 42, action: "open" } : {}),
          ...(eventName.includes("handoff") ? { handoffReason: "NO_MATCH" } : {}),
        }),
      ),
      event("pr.discovery.candidate.impression", new Date(startAt.getTime() + 6_000), {
        prType: "hiking",
        viewMode: "LIST",
        origin: "direct",
        prId: "9223372036854775807999",
        rank: "214748364799",
      }),
      event("pr.discovery.candidate.impression", new Date(startAt.getTime() + 7_000), {
        prType: "hiking",
        viewMode: "LIST",
        origin: "direct",
        prId: "not-a-number",
        rank: "oops",
      }),
    ]);

  const unknownJourney = randomUUID();
  await getTestDb()
    .insert(userTelemetryEvents)
    .values([event("pr.discovery.surface.viewed", startAt, {}, { journeyId: unknownJourney })]);

  const tieJourney = randomUUID();
  await getTestDb()
    .insert(userTelemetryEvents)
    .values([
      event(
        "route.entered",
        new Date(startAt.getTime() - 1_000),
        { routePath: "/first", spm: "first" },
        {
          journeyId: tieJourney,
          eventId: "00000000-0000-0000-0000-000000000001",
        },
      ),
      event(
        "route.entered",
        new Date(startAt.getTime() - 1_000),
        { routePath: "/second", spm: "second" },
        {
          journeyId: tieJourney,
          eventId: "00000000-0000-0000-0000-000000000002",
        },
      ),
      event(
        "pr.discovery.surface.viewed",
        startAt,
        { prType: "hiking", viewMode: "LIST", origin: "direct" },
        {
          journeyId: tieJourney,
          eventId: "00000000-0000-0000-0000-000000000010",
        },
      ),
      event(
        "route.entered",
        new Date(startAt.getTime() + 1_000),
        { routePath: "/future", spm: "future" },
        {
          journeyId: tieJourney,
          eventId: "00000000-0000-0000-0000-000000000020",
        },
      ),
    ]);

  const factRows = await getTestDb()
    .select({
      eventName: factPRDiscoveryFunnelEvents.eventName,
      journeyId: factPRDiscoveryFunnelEvents.journeyId,
      prId: factPRDiscoveryFunnelEvents.prId,
      rank: factPRDiscoveryFunnelEvents.rank,
      routePath: factPRDiscoveryFunnelEvents.routePath,
      spm: factPRDiscoveryFunnelEvents.spm,
      sourceQr: factPRDiscoveryFunnelEvents.sourceQr,
      anonymousId: factPRDiscoveryFunnelEvents.anonymousId,
      authenticatedUserHash: factPRDiscoveryFunnelEvents.authenticatedUserHash,
      routeContextStatus: factPRDiscoveryFunnelEvents.routeContextStatus,
      authContextStatus: factPRDiscoveryFunnelEvents.authContextStatus,
    })
    .from(factPRDiscoveryFunnelEvents)
    .where(inArray(factPRDiscoveryFunnelEvents.journeyId, [journeyId, tieJourney, unknownJourney]));
  const scenarioFactRows = factRows;
  assert.deepEqual(
    [...new Set(scenarioFactRows.map((row) => row.eventName))].sort(),
    [...names].sort(),
  );
  const malformed = scenarioFactRows.find(
    (row) =>
      row.journeyId === journeyId &&
      row.eventName === "pr.discovery.candidate.impression" &&
      row.prId === null,
  );
  assert.equal(malformed?.rank, null);
  assert.equal(
    scenarioFactRows.filter(
      (row) =>
        row.journeyId === journeyId &&
        row.eventName === "pr.discovery.candidate.impression" &&
        row.prId === null &&
        row.rank === null,
    ).length,
    2,
  );
  const tie = scenarioFactRows.find(
    (row) => row.journeyId === tieJourney && row.routePath === "/second",
  );
  assert.equal(tie?.spm, "second");
  assert.equal(
    scenarioFactRows.some((row) => row.routePath === "/future"),
    false,
  );
  const initial = scenarioFactRows.find(
    (row) => row.journeyId === journeyId && row.eventName === names[0],
  );
  assert.equal(initial?.sourceQr, "qr-2035");
  assert.equal(initial?.anonymousId, "anon-2035");
  assert.equal(initial?.authenticatedUserHash, "user-2035");
  assert.equal(initial?.routeContextStatus, "context_complete");
  assert.equal(initial?.authContextStatus, "context_complete");
  const unknown = scenarioFactRows.find((row) => row.journeyId === unknownJourney);
  assert.equal(unknown?.routeContextStatus, "context_unknown");
  assert.equal(unknown?.authContextStatus, "context_unknown");

  const response = await requestJson(
    "/api/analytics/pr-discovery-funnel?startAt=2035-05-01T00:00:00.000Z&endAt=2035-05-02T00:00:00.000Z",
    { token: admin.token },
  );
  const body = await expectJsonResponse<{
    summary: { surfaceJourneys: number; authoringHandoffJourneys: number };
    dimensions: Array<{
      prType: string;
      viewMode: string;
      origin: string;
      journeyCount: number;
      eventCount: number;
    }>;
  }>(response, 200);
  assert.equal(body.summary.surfaceJourneys, 3);
  assert.equal(body.summary.authoringHandoffJourneys, 1);
  assert.deepEqual(body.dimensions, [
    { prType: "hiking", viewMode: "LIST", origin: "direct", journeyCount: 2, eventCount: 9 },
  ]);

  const endpointPaths = [
    "/overview",
    "/pr-create-funnel",
    "/pr-join-funnel",
    "/pr-discovery-funnel",
  ];
  for (const endpoint of endpointPaths) {
    for (const query of [
      "startAt=2035-05-01T00:00:00.000",
      "startAt=2035-05-02T00:00:00.000Z&endAt=2035-05-02T00:00:00.000Z",
      "startAt=2035-05-03T00:00:00.000Z&endAt=2035-05-02T00:00:00.000Z",
      "startAt=2035-05-01T00:00:00.000Z&endAt=2035-06-02T00:00:00.000Z",
    ]) {
      const invalid = await requestJson(`/api/analytics${endpoint}?${query}`, {
        token: admin.token,
      });
      assert.ok(invalid.status === 400 || invalid.status === 422);
      assert.match(invalid.headers.get("content-type") ?? "", /application\/problem\+json/);
    }
    const exactMaximum = await requestJson(
      `/api/analytics${endpoint}?startAt=2035-05-01T00:00:00.000Z&endAt=2035-06-01T00:00:00.000Z`,
      { token: admin.token },
    );
    assert.equal(exactMaximum.status, 200);
  }
  ctx.record("typedFact", { context: "nearest-prior", sourceQr: "qr-2035" });
});
