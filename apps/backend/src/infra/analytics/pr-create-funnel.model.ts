import { getUserTelemetryDimEvents } from "./user-event-dim";
import { resolveAnalyticsRange } from "./analytics-range";

export type PRCreateFunnelQueryInput = {
  startAt?: Date;
  endAt?: Date;
};

export type PRCreateFunnelFilters = {
  startAt: string;
  endAt: string;
};

export type PRCreatePath = "structured_form" | "pr_discovery" | "natural_language" | "unknown";

export type PRCreateFunnelStep = {
  stepKey: string;
  label: string;
  eventNames: string[];
  behavior: string;
  journeyCount: number;
  eventCount: number;
  conversionFromPrevious: number | null;
  conversionFromStart: number;
};

export type PRCreatePathBreakdownRow = {
  creationPath: PRCreatePath;
  journeyCount: number;
  eventCount: number;
};

export type PRCreateFunnelEventDictionaryEntry = {
  eventName: string;
  eventFamily: string;
  eventVersion: number;
  owner: string;
  biUsage: string[];
};

export type PRCreateFunnelResponse = {
  filters: PRCreateFunnelFilters;
  summary: {
    entryJourneys: number;
    frontendSuccessJourneys: number;
    backendCreatedJourneys: number;
    entryToBackendCreatedRate: number;
    frontendSuccessToBackendCreatedRate: number;
  };
  steps: PRCreateFunnelStep[];
  paths: PRCreatePathBreakdownRow[];
  identity: {
    authenticatedJourneys: number;
    anonymousOnlyJourneys: number;
    unknownSessionJourneys: number;
  };
  context: {
    eventCount: number;
    routeContextUnknownEvents: number;
    authContextUnknownEvents: number;
  };
  eventDictionary: PRCreateFunnelEventDictionaryEntry[];
};

export type PRCreateFunnelContextStatus = "context_complete" | "context_unknown";

export type PRCreateFunnelFactRow = {
  eventId: string;
  eventName: string;
  eventVersion: number;
  journeyId: string;
  traceId: string | null;
  occurredAt: Date;
  anonymousId: string | null;
  authenticatedUserHash: string | null;
  routeContextStatus: PRCreateFunnelContextStatus;
  authContextStatus: PRCreateFunnelContextStatus;
  stepKey: string | null;
  creationPath: PRCreatePath | null;
};

type FunnelStepDefinition = {
  stepKey: string;
  label: string;
  eventNames: readonly (typeof PR_CREATE_FUNNEL_EVENT_NAMES)[number][];
  behavior: string;
};

type StepAccumulator = {
  journeys: Set<string>;
  eventCount: number;
};

type PathAccumulator = {
  journeys: Set<string>;
  eventCount: number;
};

export const PR_CREATE_FUNNEL_EVENT_NAMES = [
  "home.create.entry.click",
  "pr.discovery.authoring.handoff",
  "pr.create.result",
  "pr.created",
] as const;

const PR_CREATE_FUNNEL_STEPS: FunnelStepDefinition[] = [
  {
    stepKey: "create_entry_intent",
    label: "Create entry intent",
    eventNames: ["home.create.entry.click", "pr.discovery.authoring.handoff"],
    behavior: "User clicked a PR create entry or handed off from PR Discovery to authoring.",
  },
  {
    stepKey: "frontend_create_success",
    label: "Frontend create success",
    eventNames: ["pr.create.result"],
    behavior: "Frontend create flow resolved as success.",
  },
  {
    stepKey: "backend_created",
    label: "Backend created",
    eventNames: ["pr.created"],
    behavior: "Backend confirmed a PR was created by a user command.",
  },
];

const CREATE_PATH_SORT_INDEX: Record<PRCreatePath, number> = {
  structured_form: 0,
  pr_discovery: 1,
  natural_language: 2,
  unknown: 3,
};

export const resolvePRCreateFunnelFilters = (
  input: PRCreateFunnelQueryInput,
): PRCreateFunnelFilters => {
  const range = resolveAnalyticsRange(input);

  return {
    startAt: range.startAt,
    endAt: range.endAt,
  };
};

const createStepAccumulator = (): StepAccumulator => ({
  journeys: new Set<string>(),
  eventCount: 0,
});

const buildRate = (numerator: number, denominator: number): number =>
  denominator > 0 ? numerator / denominator : 0;

const toCreatePath = (value: string | null): PRCreatePath => {
  if (value === "structured_form" || value === "pr_discovery" || value === "natural_language") {
    return value;
  }
  return "unknown";
};

const getStepKeyForEvent = (event: PRCreateFunnelFactRow): string | null => {
  if (!event.stepKey) return null;
  return PR_CREATE_FUNNEL_STEPS.some((step) => step.stepKey === event.stepKey)
    ? event.stepKey
    : null;
};

const buildEventDictionary = (): PRCreateFunnelEventDictionaryEntry[] => {
  const eventNameSet = new Set<string>(PR_CREATE_FUNNEL_EVENT_NAMES);
  return getUserTelemetryDimEvents()
    .filter((event) => eventNameSet.has(event.eventName) && !event.deprecated)
    .map((event) => ({
      eventName: event.eventName,
      eventFamily: event.eventFamily,
      eventVersion: event.eventVersion,
      owner: event.owner,
      biUsage: event.biUsage,
    }))
    .sort((left, right) => left.eventName.localeCompare(right.eventName));
};

const getPathAccumulator = (
  map: Map<PRCreatePath, PathAccumulator>,
  creationPath: PRCreatePath,
): PathAccumulator => {
  const existing = map.get(creationPath);
  if (existing) return existing;

  const created = {
    journeys: new Set<string>(),
    eventCount: 0,
  };
  map.set(creationPath, created);
  return created;
};

export const buildPRCreateFunnelResponseFromRows = (
  filters: PRCreateFunnelFilters,
  eventRows: PRCreateFunnelFactRow[],
): PRCreateFunnelResponse => {
  const stepAccumulators = new Map<string, StepAccumulator>(
    PR_CREATE_FUNNEL_STEPS.map((step) => [step.stepKey, createStepAccumulator()]),
  );
  const pathAccumulators = new Map<PRCreatePath, PathAccumulator>();
  const authenticatedJourneys = new Set<string>();
  const anonymousOnlyJourneys = new Set<string>();
  const unknownSessionJourneys = new Set<string>();
  let routeContextUnknownEvents = 0;
  let authContextUnknownEvents = 0;

  for (const event of eventRows) {
    if (event.routeContextStatus === "context_unknown") {
      routeContextUnknownEvents += 1;
    }
    if (event.authContextStatus === "context_unknown") {
      authContextUnknownEvents += 1;
      unknownSessionJourneys.add(event.journeyId);
    } else if (event.authenticatedUserHash) {
      authenticatedJourneys.add(event.journeyId);
    } else {
      anonymousOnlyJourneys.add(event.journeyId);
    }

    if (event.eventName === "pr.created") {
      const creationPath = toCreatePath(event.creationPath);
      const pathAccumulator = getPathAccumulator(pathAccumulators, creationPath);
      pathAccumulator.journeys.add(event.journeyId);
      pathAccumulator.eventCount += 1;
    }

    const stepKey = getStepKeyForEvent(event);
    if (!stepKey) continue;

    const accumulator = stepAccumulators.get(stepKey);
    if (!accumulator) continue;

    accumulator.eventCount += 1;
    accumulator.journeys.add(event.journeyId);
  }

  const firstAccumulator =
    stepAccumulators.get(PR_CREATE_FUNNEL_STEPS[0]?.stepKey ?? "") ?? createStepAccumulator();
  const startCount = firstAccumulator.journeys.size;
  let previousCount: number | null = null;

  const steps = PR_CREATE_FUNNEL_STEPS.map((definition) => {
    const accumulator = stepAccumulators.get(definition.stepKey) ?? createStepAccumulator();
    const journeyCount = accumulator.journeys.size;
    const conversionFromPrevious =
      previousCount === null ? null : previousCount > 0 ? journeyCount / previousCount : null;
    previousCount = journeyCount;
    return {
      ...definition,
      eventNames: [...definition.eventNames],
      journeyCount,
      eventCount: accumulator.eventCount,
      conversionFromPrevious,
      conversionFromStart: buildRate(journeyCount, startCount),
    };
  });

  const entryJourneys = stepAccumulators.get("create_entry_intent")?.journeys.size ?? 0;
  const frontendSuccessJourneys =
    stepAccumulators.get("frontend_create_success")?.journeys.size ?? 0;
  const backendCreatedJourneys = stepAccumulators.get("backend_created")?.journeys.size ?? 0;

  return {
    filters,
    summary: {
      entryJourneys,
      frontendSuccessJourneys,
      backendCreatedJourneys,
      entryToBackendCreatedRate: buildRate(backendCreatedJourneys, entryJourneys),
      frontendSuccessToBackendCreatedRate: buildRate(
        backendCreatedJourneys,
        frontendSuccessJourneys,
      ),
    },
    steps,
    paths: Array.from(pathAccumulators.entries())
      .map(([creationPath, accumulator]) => ({
        creationPath,
        journeyCount: accumulator.journeys.size,
        eventCount: accumulator.eventCount,
      }))
      .sort(
        (left, right) =>
          CREATE_PATH_SORT_INDEX[left.creationPath] - CREATE_PATH_SORT_INDEX[right.creationPath],
      ),
    identity: {
      authenticatedJourneys: authenticatedJourneys.size,
      anonymousOnlyJourneys: anonymousOnlyJourneys.size,
      unknownSessionJourneys: unknownSessionJourneys.size,
    },
    context: {
      eventCount: eventRows.length,
      routeContextUnknownEvents,
      authContextUnknownEvents,
    },
    eventDictionary: buildEventDictionary(),
  };
};
