import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import {
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
} from "../../src/domains/pr/services";
import {
  partnerRequests,
  type AnchorEventRoutePool,
  type PartnerRequestFields,
  type PRId,
  type PRRoute,
  type PRStatus,
} from "../../src/entities";
import { bindScenarioWeChatOpenId } from "../pr-core/_kit/actions/system-state";
import { givenAdminUser, givenUser } from "../pr-core/_kit/builders/users";
import { givenAnchorEvent } from "./_kit/builders/anchor-events";

type AdminAnchorEventResponse = {
  id: number;
  type: string;
  locationPool: string[];
  routePool: AnchorEventRoutePool;
};

type AdminAnchorWorkspaceResponse = {
  events: Array<{
    id: number;
    locationPool: string[];
    routePool: AnchorEventRoutePool;
  }>;
  routeApplications: RouteApplicationResponse[];
};

type AnchorEventDetailResponse = {
  id: number;
  locationPool: string[];
  routePool: AnchorEventRoutePool;
  exhausted: boolean;
  placeSelector: {
    kind: "location" | "route" | "none";
    labelKey: string;
    placeholderKey: string;
    applyActionKey: string | null;
    options: Array<{
      kind: "location" | "route";
      id: string;
      label: string;
      disabled: boolean;
    }>;
  };
  createTimeWindows: Array<{
    placeSelector: {
      kind: "location" | "route" | "none";
      labelKey: string;
      placeholderKey: string;
      applyActionKey: string | null;
      options: Array<{
        kind: "location" | "route";
        id: string;
        label: string;
        disabled: boolean;
      }>;
    };
    routeOptions: Array<{
      routePoolEntryId: string;
      route: PRRoute;
      disabled: boolean;
      disabledReason: "NONE";
    }>;
  }>;
};

type AnchorEventFormModeResponse = {
  locations: Array<{
    id: string;
  }>;
  routes: Array<{
    id: string;
    route: PRRoute;
    availableStartKeys: string[];
  }>;
  placeSelector: {
    kind: "location" | "route" | "none";
    labelKey: string;
    placeholderKey: string;
    applyActionKey: string | null;
    options: Array<{
      kind: "location" | "route";
      id: string;
      label: string;
      disabled: boolean;
    }>;
  };
};

type AnchorEventFormModeRecommendationResponse = {
  selection: {
    kind: "location" | "route";
    locationId: string | null;
    routePoolEntryId: string | null;
  };
  matchedRecommendation: {
    pr: {
      id: PRId;
      route: PRRoute | null;
    };
    match: {
      exactPlace: boolean;
      exactRoute: boolean;
    };
  } | null;
  orderedCandidates: Array<{
    pr: {
      id: PRId;
    };
  }>;
};

type AnchorEventSummaryResponse = Array<{
  id: number;
  locationPool: string[];
  routeCount: number;
  routePool: AnchorEventRoutePool;
}>;

type CreatePRResponse = {
  id: PRId;
  status: PRStatus;
};

type ProblemDetailsResponse = {
  code?: string;
  detail?: string;
};

type RouteApplicationResponse = {
  id: number;
  anchorEventId: number;
  route: PRRoute;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectReason: string | null;
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

const buildEventInput = (input: {
  label: string;
  locationPool?: string[];
  routePool?: AnchorEventRoutePool;
}) => {
  const startAt = "2037-03-01T10:00:00.000Z";
  return {
    title: `Route Pool Event ${input.label}`,
    type: `route-pool-event-${input.label}`,
    description: "Route pool scenario event",
    locationPool: input.locationPool ?? [],
    routePool: input.routePool ?? [],
    timePoolConfig: {
      durationMinutes: 60,
      earliestLeadMinutes: null,
      startRules: [
        {
          id: "route-pool-start-1",
          kind: "ABSOLUTE" as const,
          startAt,
          description: "Route pool scenario start",
        },
      ],
    },
    defaultMinPartners: 2,
    defaultMaxPartners: null,
    defaultPrNotes: null,
    defaultConfirmationEnabled: true,
    defaultConfirmationStartOffsetMinutes:
      DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
    defaultConfirmationEndOffsetMinutes: DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
    defaultJoinLockOffsetMinutes: DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
    meetingPoint: null,
    joinGateConfig: [],
    participationFrequencyLimit: null,
    feedbackQuestionnaireTemplateId: null,
    locationMeetingPoints: {},
    coverImage: null,
    betaGroupQrCode: null,
    prCreationPolicy: "USER_AND_ADMIN" as const,
    fullPrExpansionPolicy: "DISABLED" as const,
    status: "ACTIVE" as const,
  };
};

const createAdminAnchorEvent = async (input: ReturnType<typeof buildEventInput>) => {
  const admin = await givenAdminUser(`route-pool-admin-${input.type}`);
  const response = await requestJson("/api/admin/anchor-events", {
    method: "POST",
    token: admin.token,
    body: input,
  });
  return await expectJsonResponse<AdminAnchorEventResponse>(response, 200);
};

const buildEventAssistedFields = (input: {
  type: string;
  timeWindow: [string, string];
  route?: PRRoute | null;
  location?: string | null;
}): PartnerRequestFields => ({
  title: "Route pool assisted PR",
  type: input.type,
  time: input.timeWindow,
  location: input.location ?? null,
  route: input.route ?? null,
  minPartners: 2,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: ["路线池"],
  notes: null,
});

const probePRPlace = async (prId: PRId) => {
  const rows = await getTestDb()
    .select({
      location: partnerRequests.location,
      route: partnerRequests.route,
    })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, prId));
  return rows[0] ?? null;
};

scenario("anchor_event_route_pool_admin_and_public_read_models", async (ctx) => {
  const routePool: AnchorEventRoutePool = [
    {
      id: "south-to-stadium",
      route: buildRoute(),
    },
  ];
  const event = await createAdminAnchorEvent(
    buildEventInput({ label: "read-models", routePool }),
  );
  ctx.record("eventId", event.id);

  assert.deepEqual(event.locationPool, []);
  assert.deepEqual(event.routePool, routePool);

  const workspace = await expectJsonResponse<AdminAnchorWorkspaceResponse>(
    await requestJson("/api/admin/anchor-events/workspace", {
      token: (await givenAdminUser("route-pool-workspace")).token,
    }),
    200,
  );
  const workspaceEvent = workspace.events.find((item) => item.id === event.id);
  assert.deepEqual(workspaceEvent?.locationPool, []);
  assert.deepEqual(workspaceEvent?.routePool, routePool);

  const detail = await expectJsonResponse<AnchorEventDetailResponse>(
    await requestJson(`/api/events/${event.id}`),
    200,
  );
  assert.equal(detail.exhausted, false);
  assert.deepEqual(detail.locationPool, []);
  assert.deepEqual(detail.routePool, routePool);
  assert.equal(detail.placeSelector.kind, "route");
  assert.equal(
    detail.placeSelector.labelKey,
    "anchorEvent.placeSelector.routeLabel",
  );
  assert.equal(detail.placeSelector.options[0]?.id, "route:south-to-stadium");
  assert.deepEqual(detail.createTimeWindows[0]?.routeOptions[0], {
    routePoolEntryId: "south-to-stadium",
    route: routePool[0]?.route,
    disabled: false,
    disabledReason: "NONE",
  });
  assert.equal(detail.createTimeWindows[0]?.placeSelector.kind, "route");
  assert.equal(
    detail.createTimeWindows[0]?.placeSelector.labelKey,
    "anchorEvent.placeSelector.routeLabel",
  );
  assert.equal(
    detail.createTimeWindows[0]?.placeSelector.placeholderKey,
    "anchorEvent.placeSelector.routePlaceholder",
  );
  assert.equal(
    detail.createTimeWindows[0]?.placeSelector.applyActionKey,
    "anchorEvent.placeSelector.applyRoute",
  );
  const detailPlaceOption = detail.createTimeWindows[0]?.placeSelector.options[0];
  assert.equal(detailPlaceOption?.kind, "route");
  assert.equal(detailPlaceOption?.id, "route:south-to-stadium");
  assert.equal(detailPlaceOption?.label, "广州南站~天河体育中心");
  assert.equal(detailPlaceOption?.disabled, false);

  const formMode = await expectJsonResponse<AnchorEventFormModeResponse>(
    await requestJson(`/api/events/${event.id}/form-mode`),
    200,
  );
  assert.deepEqual(formMode.locations, []);
  assert.equal(formMode.routes[0]?.id, "south-to-stadium");
  assert.deepEqual(formMode.routes[0]?.route, routePool[0]?.route);
  assert.deepEqual(formMode.routes[0]?.availableStartKeys, [
    "2037-03-01T10:00:00.000Z::2037-03-01T11:00:00.000Z",
  ]);
  assert.equal(formMode.placeSelector.kind, "route");
  assert.equal(
    formMode.placeSelector.labelKey,
    "anchorEvent.placeSelector.routeLabel",
  );
  assert.equal(
    formMode.placeSelector.options[0]?.id,
    "route:south-to-stadium",
  );

  const summaries = await expectJsonResponse<AnchorEventSummaryResponse>(
    await requestJson("/api/events"),
    200,
  );
  const summary = summaries.find((item) => item.id === event.id);
  assert.equal(summary?.routeCount, 1);
  assert.deepEqual(summary?.routePool, routePool);
});

scenario(
  "route_pool_event_detail_keeps_place_selector_without_create_windows",
  async (ctx) => {
    const routePool: AnchorEventRoutePool = [
      {
        id: "always-visible-route",
        route: buildRoute("珠江新城"),
      },
    ];
    const event = await createAdminAnchorEvent({
      ...buildEventInput({ label: "detail-no-create-windows", routePool }),
      timePoolConfig: {
        durationMinutes: null,
        earliestLeadMinutes: null,
        startRules: [],
      },
    });
    ctx.record("eventId", event.id);

    const detail = await expectJsonResponse<AnchorEventDetailResponse>(
      await requestJson(`/api/events/${event.id}`),
      200,
    );

    assert.equal(detail.exhausted, true);
    assert.deepEqual(detail.createTimeWindows, []);
    assert.equal(detail.placeSelector.kind, "route");
    assert.equal(
      detail.placeSelector.placeholderKey,
      "anchorEvent.placeSelector.routePlaceholder",
    );
    assert.equal(detail.placeSelector.options[0]?.id, "route:always-visible-route");
    assert.equal(detail.placeSelector.options[0]?.disabled, false);
  },
);

scenario(
  "anchor_event_route_application_accept_appends_route_pool",
  async (ctx) => {
    const applicant = await givenUser("route-application-applicant");
    const admin = await givenAdminUser("route-application-reviewer");
    const route = buildRoute("二沙岛体育公园");
    const event = await createAdminAnchorEvent(
      buildEventInput({ label: "route-application" }),
    );
    ctx.record("eventId", event.id);

    const submitted = await expectJsonResponse<RouteApplicationResponse>(
      await requestJson(`/api/events/${event.id}/route-applications`, {
        method: "POST",
        token: applicant.token,
        body: { route },
      }),
      201,
    );
    ctx.record("routeApplicationId", submitted.id);
    assert.equal(submitted.status, "PENDING");
    assert.deepEqual(submitted.route, route);

    const reviewedRoute: PRRoute = [
      {
        ...route[0]!,
        name: "广州南站 P5 停车场",
        full_address: "广州市番禺区石壁街道广州南站 P5 停车场",
      },
      {
        ...route[1]!,
        name: "二沙岛体育公园东门",
        full_address: "广州市越秀区二沙岛体育公园东门",
      },
    ];

    const mine = await expectJsonResponse<RouteApplicationResponse[]>(
      await requestJson("/api/events/route-applications/mine", {
        token: applicant.token,
      }),
      200,
    );
    assert.ok(mine.some((application) => application.id === submitted.id));

    const accepted = await expectJsonResponse<RouteApplicationResponse>(
      await requestJson(
        `/api/admin/route-applications/${submitted.id}/accept`,
        {
          method: "POST",
          token: admin.token,
          body: { route: reviewedRoute },
        },
      ),
      200,
    );
    assert.equal(accepted.status, "ACCEPTED");
    assert.deepEqual(accepted.route, reviewedRoute);

    const workspace = await expectJsonResponse<AdminAnchorWorkspaceResponse>(
      await requestJson("/api/admin/anchor-events/workspace", {
        token: admin.token,
      }),
      200,
    );
    const workspaceEvent = workspace.events.find((item) => item.id === event.id);
    assert.deepEqual(workspaceEvent?.routePool, [
      {
        id: `application-${submitted.id}`,
        route: reviewedRoute,
      },
    ]);
    assert.equal(
      workspace.routeApplications.find((item) => item.id === submitted.id)
        ?.status,
      "ACCEPTED",
    );

    const locationPoolEvent = await createAdminAnchorEvent(
      buildEventInput({
        label: "route-application-location-pool",
        locationPool: ["路线申请不适用场地"],
      }),
    );
    const rejected = await requestJson(
      `/api/events/${locationPoolEvent.id}/route-applications`,
      {
        method: "POST",
        token: applicant.token,
        body: { route },
      },
    );
    const problem = await expectJsonResponse<ProblemDetailsResponse>(
      rejected,
      400,
    );
    assert.equal(problem.code, "ANCHOR_EVENT_ROUTE_APPLICATION_UNAVAILABLE");
  },
);

scenario("route_pool_event_assisted_create_persists_route_mode_pr", async (ctx) => {
  const creator = await givenUser("route-pool-assisted-creator");
  const outsideRouteCreator = await givenUser("route-pool-assisted-outside-creator");
  await bindScenarioWeChatOpenId({
    user: creator,
    openId: "openid-route-pool-assisted-creator",
  });
  const routePool: AnchorEventRoutePool = [
    {
      id: "south-to-pazhou",
      route: buildRoute("琶洲会展中心"),
    },
  ];
  const event = await createAdminAnchorEvent(
    buildEventInput({ label: "assisted-create", routePool }),
  );
  const timeWindow: [string, string] = [
    "2037-03-01T10:00:00.000Z",
    "2037-03-01T11:00:00.000Z",
  ];
  ctx.record("eventId", event.id);

  const created = await expectJsonResponse<CreatePRResponse>(
    await requestJson("/api/pr/new/form", {
      method: "POST",
      token: creator.token,
      body: {
        fields: buildEventAssistedFields({
          type: event.type,
          timeWindow,
          route: routePool[0]?.route,
          location: null,
        }),
        createSource: "EVENT_ASSISTED",
        anchorEventId: event.id,
        routePoolEntryId: "south-to-pazhou",
      },
    }),
    201,
  );
  ctx.record("prId", created.id);
  assert.equal(created.status, "OPEN");

  const stored = await probePRPlace(created.id);
  assert.equal(stored?.location, null);
  assert.deepEqual(stored?.route, routePool[0]?.route);

  const outsideRoute = buildRoute("珠江新城");
  const outsideCreated = await expectJsonResponse<CreatePRResponse>(
    await requestJson("/api/pr/new/form", {
      method: "POST",
      token: outsideRouteCreator.token,
      body: {
        fields: buildEventAssistedFields({
          type: event.type,
          timeWindow,
          route: outsideRoute,
        }),
        createSource: "EVENT_ASSISTED",
        anchorEventId: event.id,
      },
    }),
    201,
  );
  const outsideStored = await probePRPlace(outsideCreated.id);
  assert.equal(outsideStored?.location, null);
  assert.deepEqual(outsideStored?.route, outsideRoute);

  const recommendation =
    await expectJsonResponse<AnchorEventFormModeRecommendationResponse>(
      await requestJson(`/api/events/${event.id}/form-mode/recommendation`, {
        method: "POST",
        body: {
          place: {
            kind: "route",
            routePoolEntryId: "south-to-pazhou",
          },
          startAt: timeWindow[0],
          preferences: ["路线池"],
        },
      }),
      200,
    );

  assert.equal(recommendation.selection.kind, "route");
  assert.equal(recommendation.selection.locationId, null);
  assert.equal(recommendation.selection.routePoolEntryId, "south-to-pazhou");
  assert.equal(recommendation.matchedRecommendation?.pr.id, created.id);
  assert.deepEqual(recommendation.matchedRecommendation?.pr.route, routePool[0]?.route);
  assert.equal(recommendation.matchedRecommendation?.match.exactPlace, true);
  assert.equal(recommendation.matchedRecommendation?.match.exactRoute, true);
  assert.deepEqual(recommendation.orderedCandidates, []);
});

scenario("location_pool_event_assisted_create_keeps_location_mode", async (ctx) => {
  const creator = await givenUser("location-pool-assisted-creator");
  await bindScenarioWeChatOpenId({
    user: creator,
    openId: "openid-location-pool-assisted-creator",
  });
  const event = await givenAnchorEvent({
    label: "location-pool-assisted",
  });
  ctx.record("eventId", event.id);

  const created = await expectJsonResponse<CreatePRResponse>(
    await requestJson("/api/pr/new/form", {
      method: "POST",
      token: creator.token,
      body: {
        fields: buildEventAssistedFields({
          type: event.type,
          timeWindow: event.timeWindow,
          location: event.locationId,
          route: null,
        }),
        createSource: "EVENT_ASSISTED",
        anchorEventId: event.id,
      },
    }),
    201,
  );

  const stored = await probePRPlace(created.id);
  assert.equal(stored?.location, event.locationId);
  assert.equal(stored?.route, null);
});

scenario("anchor_event_place_pool_mutual_exclusion_blocks_admin_write", async () => {
  const admin = await givenAdminUser("route-pool-conflict");
  const routePool: AnchorEventRoutePool = [
    {
      id: "conflict-route",
      route: buildRoute("珠江新城"),
    },
  ];

  const response = await requestJson("/api/admin/anchor-events", {
    method: "POST",
    token: admin.token,
    body: buildEventInput({
      label: "conflict",
      locationPool: ["冲突球场"],
      routePool,
    }),
  });
  const problem = await expectJsonResponse<ProblemDetailsResponse>(response, 400);

  assert.equal(problem.code, "ANCHOR_EVENT_PLACE_POOL_CONFLICT");
});
