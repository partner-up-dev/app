import { getUserTelemetryDimEvents } from "./user-event-dim";

export const PR_DISCOVERY_EVENT_NAMES = [
  "pr.discovery.surface.viewed",
  "pr.discovery.criteria.submitted",
  "pr.discovery.recommendation.returned",
  "pr.discovery.candidate.impression",
  "pr.discovery.candidate.action",
  "pr.discovery.authoring.handoff",
] as const;

export type PRDiscoveryEventName = (typeof PR_DISCOVERY_EVENT_NAMES)[number];
export type PRDiscoveryViewMode = "LIST" | "CARD" | "FORM";

export type PRDiscoveryFunnelQueryInput = {
  startAt?: Date;
  endAt?: Date;
  prType?: string;
  viewMode?: PRDiscoveryViewMode;
  origin?: string;
};

export type PRDiscoveryFunnelFilters = {
  startAt: string;
  endAt: string;
  prType?: string;
  viewMode?: PRDiscoveryViewMode;
  origin?: string;
};

export type PRDiscoveryFunnelFactRow = {
  eventName: string;
  eventVersion: number;
  journeyId: string;
  occurredAt: Date;
  payload: unknown;
};

export type PRDiscoveryFunnelStep = {
  stepKey: string;
  label: string;
  eventNames: string[];
  journeyCount: number;
  eventCount: number;
  conversionFromPrevious: number | null;
  conversionFromStart: number;
};

export type PRDiscoveryFunnelResponse = {
  filters: PRDiscoveryFunnelFilters;
  summary: {
    surfaceJourneys: number;
    criteriaJourneys: number;
    recommendationJourneys: number;
    candidateJourneys: number;
    actionJourneys: number;
    authoringHandoffJourneys: number;
  };
  steps: PRDiscoveryFunnelStep[];
  dimensions: {
    prType: string;
    viewMode: PRDiscoveryViewMode;
    origin: string;
    journeyCount: number;
    eventCount: number;
  }[];
  eventDictionary: {
    eventName: string;
    eventFamily: string;
    eventVersion: number;
    owner: string;
    biUsage: string[];
  }[];
};

type FunnelStepDefinition = {
  stepKey: string;
  label: string;
  eventNames: readonly PRDiscoveryEventName[];
};

const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;

const PR_DISCOVERY_STEPS: readonly FunnelStepDefinition[] = [
  {
    stepKey: "surface_viewed",
    label: "Discovery surface viewed",
    eventNames: ["pr.discovery.surface.viewed"],
  },
  {
    stepKey: "criteria_submitted",
    label: "Criteria submitted",
    eventNames: ["pr.discovery.criteria.submitted"],
  },
  {
    stepKey: "recommendation_returned",
    label: "Recommendation returned",
    eventNames: ["pr.discovery.recommendation.returned"],
  },
  {
    stepKey: "candidate_impression",
    label: "Candidate impression",
    eventNames: ["pr.discovery.candidate.impression"],
  },
  {
    stepKey: "candidate_action",
    label: "Candidate action",
    eventNames: ["pr.discovery.candidate.action"],
  },
  {
    stepKey: "authoring_handoff",
    label: "Authoring handoff",
    eventNames: ["pr.discovery.authoring.handoff"],
  },
];

export const resolvePRDiscoveryFunnelFilters = (
  input: PRDiscoveryFunnelQueryInput,
): PRDiscoveryFunnelFilters => {
  const endAt = input.endAt ?? new Date();
  const startAt = input.startAt ?? new Date(endAt.getTime() - DEFAULT_WINDOW_MS);
  if (startAt.getTime() >= endAt.getTime()) throw new Error("startAt must be before endAt");
  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    ...(input.prType ? { prType: input.prType } : {}),
    ...(input.viewMode ? { viewMode: input.viewMode } : {}),
    ...(input.origin ? { origin: input.origin } : {}),
  };
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const dimensionValue = (payload: unknown, key: string): string | null => {
  const value = asRecord(payload)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const isInWindow = (date: Date, filters: PRDiscoveryFunnelFilters): boolean => {
  const timestamp = date.getTime();
  return (
    timestamp >= new Date(filters.startAt).getTime() &&
    timestamp < new Date(filters.endAt).getTime()
  );
};

const buildRate = (numerator: number, denominator: number): number =>
  denominator > 0 ? numerator / denominator : 0;

export const buildPRDiscoveryFunnelResponseFromRows = (
  filters: PRDiscoveryFunnelFilters,
  rows: PRDiscoveryFunnelFactRow[],
): PRDiscoveryFunnelResponse => {
  const filtered = rows.filter((row) => {
    if (!isInWindow(row.occurredAt, filters)) return false;
    const prType = dimensionValue(row.payload, "prType");
    const viewMode = dimensionValue(row.payload, "viewMode");
    const origin = dimensionValue(row.payload, "origin");
    return (
      (!filters.prType || prType === filters.prType) &&
      (!filters.viewMode || viewMode === filters.viewMode) &&
      (!filters.origin || origin === filters.origin)
    );
  });

  const accumulators = PR_DISCOVERY_STEPS.map(() => ({
    journeys: new Set<string>(),
    eventCount: 0,
  }));
  const dimensions = new Map<
    string,
    {
      prType: string;
      viewMode: PRDiscoveryViewMode;
      origin: string;
      journeys: Set<string>;
      eventCount: number;
    }
  >();
  for (const row of filtered) {
    const stepIndex = PR_DISCOVERY_STEPS.findIndex((step) =>
      step.eventNames.includes(row.eventName as PRDiscoveryEventName),
    );
    if (stepIndex >= 0) {
      accumulators[stepIndex].journeys.add(row.journeyId);
      accumulators[stepIndex].eventCount += 1;
    }
    const prType = dimensionValue(row.payload, "prType");
    const viewMode = dimensionValue(row.payload, "viewMode");
    const origin = dimensionValue(row.payload, "origin");
    if (
      prType &&
      viewMode &&
      origin &&
      (viewMode === "LIST" || viewMode === "CARD" || viewMode === "FORM")
    ) {
      const key = `${prType}\u0000${viewMode}\u0000${origin}`;
      const existing = dimensions.get(key) ?? {
        prType,
        viewMode,
        origin,
        journeys: new Set<string>(),
        eventCount: 0,
      };
      existing.journeys.add(row.journeyId);
      existing.eventCount += 1;
      dimensions.set(key, existing);
    }
  }
  const steps = PR_DISCOVERY_STEPS.map((definition, index) => {
    const current = accumulators[index];
    const previous = index > 0 ? accumulators[index - 1] : null;
    const first = accumulators[0];
    return {
      stepKey: definition.stepKey,
      label: definition.label,
      eventNames: [...definition.eventNames],
      journeyCount: current.journeys.size,
      eventCount: current.eventCount,
      conversionFromPrevious: previous
        ? buildRate(current.journeys.size, previous.journeys.size)
        : null,
      conversionFromStart: buildRate(current.journeys.size, first.journeys.size),
    };
  });
  const summary = {
    surfaceJourneys: steps[0].journeyCount,
    criteriaJourneys: steps[1].journeyCount,
    recommendationJourneys: steps[2].journeyCount,
    candidateJourneys: steps[3].journeyCount,
    actionJourneys: steps[4].journeyCount,
    authoringHandoffJourneys: steps[5].journeyCount,
  };
  const eventNames = new Set<string>(PR_DISCOVERY_EVENT_NAMES);
  const eventDictionary = getUserTelemetryDimEvents()
    .filter((event) => eventNames.has(event.eventName) && !event.deprecated)
    .map(({ eventName, eventFamily, eventVersion, owner, biUsage }) => ({
      eventName,
      eventFamily,
      eventVersion,
      owner,
      biUsage,
    }))
    .sort((left, right) => left.eventName.localeCompare(right.eventName));
  return {
    filters,
    summary,
    steps,
    dimensions: [...dimensions.values()]
      .map(({ prType, viewMode, origin, journeys, eventCount }) => ({
        prType,
        viewMode,
        origin,
        journeyCount: journeys.size,
        eventCount,
      }))
      .sort((left, right) =>
        `${left.prType}:${left.viewMode}:${left.origin}`.localeCompare(
          `${right.prType}:${right.viewMode}:${right.origin}`,
        ),
      ),
    eventDictionary,
  };
};
