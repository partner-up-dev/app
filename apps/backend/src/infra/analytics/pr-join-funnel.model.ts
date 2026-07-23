import { getUserTelemetryDimEvents } from "./user-event-dim";
import { resolveAnalyticsRange } from "./analytics-range";

export type PRJoinFunnelQueryInput = {
  startAt?: Date;
  endAt?: Date;
};

export type PRJoinFunnelFilters = {
  startAt: string;
  endAt: string;
};

export type PRJoinFunnelStep = {
  stepKey: string;
  label: string;
  eventName: string;
  behavior: string;
  journeyCount: number;
  eventCount: number;
  conversionFromPrevious: number | null;
  conversionFromStart: number;
};

export type PRJoinFunnelEventDictionaryEntry = {
  eventName: string;
  eventFamily: string;
  eventVersion: number;
  owner: string;
  biUsage: string[];
};

export type PRJoinFunnelResponse = {
  filters: PRJoinFunnelFilters;
  summary: {
    impressionJourneys: number;
    clickJourneys: number;
    frontendSuccessJourneys: number;
    backendJoinedJourneys: number;
    impressionToBackendJoinRate: number;
    clickToBackendJoinRate: number;
  };
  steps: PRJoinFunnelStep[];
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
  eventDictionary: PRJoinFunnelEventDictionaryEntry[];
};

export type PRJoinFunnelContextStatus = "context_complete" | "context_unknown";

export type PRJoinFunnelFactRow = {
  eventId: string;
  eventName: string;
  eventVersion: number;
  journeyId: string;
  traceId: string | null;
  occurredAt: Date;
  anonymousId: string | null;
  authenticatedUserHash: string | null;
  routeContextStatus: PRJoinFunnelContextStatus;
  authContextStatus: PRJoinFunnelContextStatus;
  stepKey: string | null;
};

type FunnelStepDefinition = {
  stepKey: string;
  label: string;
  eventName: (typeof PR_JOIN_FUNNEL_EVENT_NAMES)[number];
  behavior: string;
};

type StepAccumulator = {
  journeys: Set<string>;
  eventCount: number;
};

export const PR_JOIN_FUNNEL_EVENT_NAMES = [
  "pr.primary_cta.impression",
  "pr.primary_cta.click",
  "pr.join.result",
  "pr.joined",
] as const;

const PR_JOIN_FUNNEL_STEPS: FunnelStepDefinition[] = [
  {
    stepKey: "join_cta_impression",
    label: "Join CTA impression",
    eventName: "pr.primary_cta.impression",
    behavior: "User saw the primary join CTA on a PR detail surface.",
  },
  {
    stepKey: "join_cta_click",
    label: "Join CTA click",
    eventName: "pr.primary_cta.click",
    behavior: "User clicked the primary join CTA.",
  },
  {
    stepKey: "frontend_join_success",
    label: "Frontend join success",
    eventName: "pr.join.result",
    behavior: "Frontend join flow resolved as success.",
  },
  {
    stepKey: "backend_joined",
    label: "Backend joined",
    eventName: "pr.joined",
    behavior: "Backend confirmed the user joined the PR.",
  },
];

export const resolvePRJoinFunnelFilters = (input: PRJoinFunnelQueryInput): PRJoinFunnelFilters => {
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

const getStepKeyForEvent = (event: PRJoinFunnelFactRow): string | null => {
  if (!event.stepKey) return null;
  return stepAccumulatorsHas(event.stepKey) ? event.stepKey : null;
};

const stepAccumulatorsHas = (stepKey: string): boolean =>
  PR_JOIN_FUNNEL_STEPS.some((step) => step.stepKey === stepKey);

const buildEventDictionary = (): PRJoinFunnelEventDictionaryEntry[] => {
  const eventNameSet = new Set<string>(PR_JOIN_FUNNEL_EVENT_NAMES);
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

export const buildPRJoinFunnelResponseFromRows = (
  filters: PRJoinFunnelFilters,
  eventRows: PRJoinFunnelFactRow[],
): PRJoinFunnelResponse => {
  const stepAccumulators = new Map<string, StepAccumulator>(
    PR_JOIN_FUNNEL_STEPS.map((step) => [step.stepKey, createStepAccumulator()]),
  );
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

    const stepKey = getStepKeyForEvent(event);
    if (!stepKey) continue;

    const accumulator = stepAccumulators.get(stepKey);
    if (!accumulator) continue;

    accumulator.eventCount += 1;
    accumulator.journeys.add(event.journeyId);
  }

  const firstAccumulator =
    stepAccumulators.get(PR_JOIN_FUNNEL_STEPS[0]?.stepKey ?? "") ?? createStepAccumulator();
  const startCount = firstAccumulator.journeys.size;
  let previousCount: number | null = null;

  const steps = PR_JOIN_FUNNEL_STEPS.map((definition) => {
    const accumulator = stepAccumulators.get(definition.stepKey) ?? createStepAccumulator();
    const journeyCount = accumulator.journeys.size;
    const conversionFromPrevious =
      previousCount === null ? null : previousCount > 0 ? journeyCount / previousCount : null;
    previousCount = journeyCount;
    return {
      ...definition,
      journeyCount,
      eventCount: accumulator.eventCount,
      conversionFromPrevious,
      conversionFromStart: buildRate(journeyCount, startCount),
    };
  });

  const impressionJourneys = stepAccumulators.get("join_cta_impression")?.journeys.size ?? 0;
  const clickJourneys = stepAccumulators.get("join_cta_click")?.journeys.size ?? 0;
  const frontendSuccessJourneys = stepAccumulators.get("frontend_join_success")?.journeys.size ?? 0;
  const backendJoinedJourneys = stepAccumulators.get("backend_joined")?.journeys.size ?? 0;

  return {
    filters,
    summary: {
      impressionJourneys,
      clickJourneys,
      frontendSuccessJourneys,
      backendJoinedJourneys,
      impressionToBackendJoinRate: buildRate(backendJoinedJourneys, impressionJourneys),
      clickToBackendJoinRate: buildRate(backendJoinedJourneys, clickJourneys),
    },
    steps,
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
