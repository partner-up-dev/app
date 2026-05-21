export const ANCHOR_EVENT_ANALYTICS_RENDERED_MODES = [
  "FORM",
  "CARD_RICH",
  "LIST",
] as const;

export type AnchorEventAnalyticsRenderedMode =
  (typeof ANCHOR_EVENT_ANALYTICS_RENDERED_MODES)[number];

export type AnchorEventCommitmentType = "create" | "join" | "waitlist";
export type AnchorEventActionResult = "success" | "blocked" | "failure";
export type OfficialAccountFollowNudgeSource =
  | "home"
  | "anchor_event"
  | "pr_join_result"
  | "pr_waitlist_result"
  | "unknown";

export type AnchorEventFunnelQueryInput = {
  startAt?: Date;
  endAt?: Date;
  eventId?: number;
  spm?: string;
  sourceQr?: string;
  assignmentRevision?: string;
  renderedMode?: AnchorEventAnalyticsRenderedMode;
};

export type AnchorEventFunnelFilters = {
  startAt: string;
  endAt: string;
  eventId: number | null;
  spm: string | null;
  sourceQr: string | null;
  assignmentRevision: string | null;
  renderedMode: AnchorEventAnalyticsRenderedMode | null;
};

export type AnchorEventFunnelSegmentRow = {
  segmentId: string;
  journeyId: string;
  renderedMode: string | null;
  startSpm: string | null;
};

export type AnchorEventFunnelEventRow = {
  eventName: string;
  journeyId: string;
  segmentId: string | null;
  renderedMode: string | null;
  properties: unknown;
};

export type OfficialAccountFollowNudgeEventRow = {
  eventName: string;
  journeyId: string;
  source: string | null;
  action: string | null;
};

export type AnalyticsModeComparisonRow = {
  renderedMode: AnchorEventAnalyticsRenderedMode;
  journeys: number;
  prExposureJourneys: number;
  prEntryJourneys: number;
  prCommitmentJourneys: number;
  commitmentRate: number;
  createSuccess: number;
  joinSuccess: number;
  waitlistSuccess: number;
};

export type AnalyticsFunnelStep = {
  stepKey: string;
  label: string;
  eventName: string | null;
  behavior: string;
  journeyCount: number;
  eventCount: number;
  conversionFromPrevious: number | null;
  conversionFromStart: number;
};

export type AnalyticsModeFunnel = {
  renderedMode: AnchorEventAnalyticsRenderedMode;
  steps: AnalyticsFunnelStep[];
};

export type AnalyticsOutcomeBreakdownRow = {
  renderedMode: AnchorEventAnalyticsRenderedMode;
  commitmentType: AnchorEventCommitmentType;
  actionResult: AnchorEventActionResult;
  journeyCount: number;
  eventCount: number;
};

export type AnalyticsSourceBreakdownRow = {
  sourceKey: string;
  sourceType: "start_spm" | "unknown";
  renderedMode: AnchorEventAnalyticsRenderedMode;
  journeys: number;
  prCommitmentJourneys: number;
  commitmentRate: number;
};

export type AnalyticsFailureBreakdownRow = {
  renderedMode: AnchorEventAnalyticsRenderedMode;
  eventName: string;
  commitmentType: AnchorEventCommitmentType | null;
  failureCode: string;
  failureReason: string | null;
  journeyCount: number;
  eventCount: number;
};

export type AnalyticsOfficialAccountFollowNudgeSourceRow = {
  source: OfficialAccountFollowNudgeSource;
  shownJourneys: number;
  followClickJourneys: number;
  dismissJourneys: number;
  shownEvents: number;
  followClickEvents: number;
  dismissEvents: number;
  followClickRate: number;
};

export type AnalyticsOfficialAccountFollowNudgeSummary = {
  shownJourneys: number;
  followClickJourneys: number;
  dismissJourneys: number;
  shownEvents: number;
  followClickEvents: number;
  dismissEvents: number;
  followClickRate: number;
  sources: AnalyticsOfficialAccountFollowNudgeSourceRow[];
};

export type AnchorEventFunnelResponse = {
  filters: AnchorEventFunnelFilters;
  summary: {
    journeys: number;
    prExposureJourneys: number;
    prEntryJourneys: number;
    prCommitmentJourneys: number;
    commitmentRate: number;
    createSuccess: number;
    joinSuccess: number;
    waitlistSuccess: number;
  };
  modes: AnalyticsModeComparisonRow[];
  funnels: AnalyticsModeFunnel[];
  outcomes: AnalyticsOutcomeBreakdownRow[];
  sources: AnalyticsSourceBreakdownRow[];
  failures: AnalyticsFailureBreakdownRow[];
  officialAccountFollowNudge: AnalyticsOfficialAccountFollowNudgeSummary;
};

type FunnelStepDefinition = {
  stepKey: string;
  label: string;
  eventName: string | null;
  behavior: string;
};

type MetricAccumulator = {
  journeys: Set<string>;
  prExposureJourneys: Set<string>;
  prEntryJourneys: Set<string>;
  prCommitmentJourneys: Set<string>;
  createSuccess: number;
  joinSuccess: number;
  waitlistSuccess: number;
};

type StepAccumulator = {
  journeys: Set<string>;
  eventCount: number;
};

type OutcomeAccumulator = {
  journeys: Set<string>;
  eventCount: number;
};

type SourceAccumulator = {
  sourceKey: string;
  sourceType: "start_spm" | "unknown";
  renderedMode: AnchorEventAnalyticsRenderedMode;
  journeys: Set<string>;
  prCommitmentJourneys: Set<string>;
};

type FailureAccumulator = {
  renderedMode: AnchorEventAnalyticsRenderedMode;
  eventName: string;
  commitmentType: AnchorEventCommitmentType | null;
  failureCode: string;
  failureReason: string | null;
  journeys: Set<string>;
  eventCount: number;
};

type OfficialAccountFollowNudgeAccumulator = {
  source?: OfficialAccountFollowNudgeSource;
  shownJourneys: Set<string>;
  followClickJourneys: Set<string>;
  dismissJourneys: Set<string>;
  shownEvents: number;
  followClickEvents: number;
  dismissEvents: number;
};

type SegmentContext = {
  segmentId: string;
  journeyId: string;
  renderedMode: AnchorEventAnalyticsRenderedMode;
  sourceKey: string;
  sourceType: "start_spm" | "unknown";
};

const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;
const MODE_SORT_INDEX = new Map<AnchorEventAnalyticsRenderedMode, number>(
  ANCHOR_EVENT_ANALYTICS_RENDERED_MODES.map((mode, index) => [mode, index]),
);

export const ANCHOR_EVENT_FUNNEL_EVENT_NAMES = [
  "anchor_event.landing.viewed",
  "anchor_event.form.started",
  "anchor_event.recommendation.requested",
  "anchor_event.recommendation.returned",
  "anchor_event.candidate.engaged",
  "anchor_event.assisted_create.started",
  "anchor_event.card_stack.loaded",
  "anchor_event.card.seen",
  "anchor_event.card.action_taken",
  "anchor_event.card_empty_create.started",
  "anchor_event.list.loaded",
  "anchor_event.date.selected",
  "anchor_event.pr_row.seen",
  "anchor_event.pr_row.action_taken",
  "anchor_event.list_create.started",
  "pr.entry.reached",
  "pr.commitment.result",
] as const;

export const OFFICIAL_ACCOUNT_FOLLOW_NUDGE_EVENT_NAMES = [
  "official.account.follow.nudge.shown",
  "official.account.follow.nudge.action.click",
] as const;

const FORM_FUNNEL_STEPS: FunnelStepDefinition[] = [
  {
    stepKey: "landing_viewed",
    label: "Landing viewed",
    eventName: "anchor_event.landing.viewed",
    behavior: "User saw the FORM landing surface.",
  },
  {
    stepKey: "form_started",
    label: "Form started",
    eventName: "anchor_event.form.started",
    behavior: "User changed location, time, preference, or started the CTA.",
  },
  {
    stepKey: "recommendation_requested",
    label: "Recommendation requested",
    eventName: "anchor_event.recommendation.requested",
    behavior: "User submitted selected conditions for recommendation.",
  },
  {
    stepKey: "recommendation_returned",
    label: "Recommendation returned",
    eventName: "anchor_event.recommendation.returned",
    behavior: "User saw the recommendation result panel.",
  },
  {
    stepKey: "candidate_engaged",
    label: "Candidate engaged",
    eventName: "anchor_event.candidate.engaged",
    behavior: "User tapped candidate detail, join, or waitlist.",
  },
  {
    stepKey: "event_assisted_create_started",
    label: "Assisted create started",
    eventName: "anchor_event.assisted_create.started",
    behavior: "User tapped the fallback create action from selected conditions.",
  },
  {
    stepKey: "pr_entry_reached",
    label: "PR entry reached",
    eventName: "pr.entry.reached",
    behavior: "User reached or acted on a concrete PR path.",
  },
  {
    stepKey: "pr_commitment_result",
    label: "PR commitment result",
    eventName: "pr.commitment.result",
    behavior: "User completed create, join, or waitlist with a result.",
  },
];

const CARD_RICH_FUNNEL_STEPS: FunnelStepDefinition[] = [
  {
    stepKey: "landing_viewed",
    label: "Landing viewed",
    eventName: "anchor_event.landing.viewed",
    behavior: "User saw the CARD_RICH landing surface.",
  },
  {
    stepKey: "card_stack_loaded",
    label: "Card stack loaded",
    eventName: "anchor_event.card_stack.loaded",
    behavior: "User saw the demand-card stack area.",
  },
  {
    stepKey: "card_seen",
    label: "Card seen",
    eventName: "anchor_event.card.seen",
    behavior: "User saw one active demand card.",
  },
  {
    stepKey: "card_action_taken",
    label: "Card action taken",
    eventName: "anchor_event.card.action_taken",
    behavior: "User skipped a card or tapped detail.",
  },
  {
    stepKey: "pr_entry_reached",
    label: "PR entry reached",
    eventName: "pr.entry.reached",
    behavior: "User reached a PR from a card detail action.",
  },
  {
    stepKey: "card_empty_create_started",
    label: "Empty-card create started",
    eventName: "anchor_event.card_empty_create.started",
    behavior: "User started create from the empty-card state.",
  },
  {
    stepKey: "pr_commitment_result",
    label: "PR commitment result",
    eventName: "pr.commitment.result",
    behavior: "User completed create, join, or waitlist with a result.",
  },
];

const LIST_FUNNEL_STEPS: FunnelStepDefinition[] = [
  {
    stepKey: "landing_viewed",
    label: "Landing viewed",
    eventName: "anchor_event.landing.viewed",
    behavior: "User saw the LIST landing surface.",
  },
  {
    stepKey: "list_loaded",
    label: "List loaded",
    eventName: "anchor_event.list.loaded",
    behavior: "User saw date groups and PR rows.",
  },
  {
    stepKey: "date_selected",
    label: "Date selected",
    eventName: "anchor_event.date.selected",
    behavior: "User tapped a date tab.",
  },
  {
    stepKey: "pr_row_seen",
    label: "PR row seen",
    eventName: "anchor_event.pr_row.seen",
    behavior: "User saw a PR row in the selected date panel.",
  },
  {
    stepKey: "pr_row_action_taken",
    label: "PR row action taken",
    eventName: "anchor_event.pr_row.action_taken",
    behavior: "User tapped an existing PR row.",
  },
  {
    stepKey: "list_create_started",
    label: "List create started",
    eventName: "anchor_event.list_create.started",
    behavior: "User started controlled event-assisted create from list mode.",
  },
  {
    stepKey: "pr_entry_reached",
    label: "PR entry reached",
    eventName: "pr.entry.reached",
    behavior: "User reached a PR from list row or create handoff.",
  },
  {
    stepKey: "pr_commitment_result",
    label: "PR commitment result",
    eventName: "pr.commitment.result",
    behavior: "User completed create, join, or waitlist with a result.",
  },
];

const FUNNEL_STEPS_BY_MODE: Record<
  AnchorEventAnalyticsRenderedMode,
  FunnelStepDefinition[]
> = {
  FORM: FORM_FUNNEL_STEPS,
  CARD_RICH: CARD_RICH_FUNNEL_STEPS,
  LIST: LIST_FUNNEL_STEPS,
};

const createMetricAccumulator = (): MetricAccumulator => ({
  journeys: new Set<string>(),
  prExposureJourneys: new Set<string>(),
  prEntryJourneys: new Set<string>(),
  prCommitmentJourneys: new Set<string>(),
  createSuccess: 0,
  joinSuccess: 0,
  waitlistSuccess: 0,
});

const getMetricAccumulator = (
  map: Map<AnchorEventAnalyticsRenderedMode, MetricAccumulator>,
  mode: AnchorEventAnalyticsRenderedMode,
): MetricAccumulator => {
  const existing = map.get(mode);
  if (existing) return existing;

  const created = createMetricAccumulator();
  map.set(mode, created);
  return created;
};

const createStepAccumulator = (): StepAccumulator => ({
  journeys: new Set<string>(),
  eventCount: 0,
});

const createOfficialAccountFollowNudgeAccumulator =
  (): OfficialAccountFollowNudgeAccumulator => ({
    shownJourneys: new Set<string>(),
    followClickJourneys: new Set<string>(),
    dismissJourneys: new Set<string>(),
    shownEvents: 0,
    followClickEvents: 0,
    dismissEvents: 0,
  });

const createModeAccumulatorMap = (): Map<
  AnchorEventAnalyticsRenderedMode,
  MetricAccumulator
> =>
  new Map(
    ANCHOR_EVENT_ANALYTICS_RENDERED_MODES.map((mode) => [
      mode,
      createMetricAccumulator(),
    ]),
  );

const createStepAccumulatorMap = (): Map<string, StepAccumulator> => {
  const map = new Map<string, StepAccumulator>();
  for (const mode of ANCHOR_EVENT_ANALYTICS_RENDERED_MODES) {
    for (const step of FUNNEL_STEPS_BY_MODE[mode]) {
      map.set(buildStepAccumulatorKey(mode, step.stepKey), createStepAccumulator());
    }
  }
  return map;
};

const buildStepAccumulatorKey = (
  mode: AnchorEventAnalyticsRenderedMode,
  stepKey: string,
): string => `${mode}:${stepKey}`;

const getStepAccumulator = (
  map: Map<string, StepAccumulator>,
  mode: AnchorEventAnalyticsRenderedMode,
  stepKey: string,
): StepAccumulator => {
  const key = buildStepAccumulatorKey(mode, stepKey);
  const existing = map.get(key);
  if (existing) return existing;

  const created = createStepAccumulator();
  map.set(key, created);
  return created;
};

const toRenderedMode = (
  value: string | null | undefined,
): AnchorEventAnalyticsRenderedMode | null => {
  if (
    value === "FORM" ||
    value === "CARD_RICH" ||
    value === "LIST"
  ) {
    return value;
  }
  return null;
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const readString = (
  properties: Record<string, unknown>,
  keys: readonly string[],
): string | null => {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const readNumber = (
  properties: Record<string, unknown>,
  keys: readonly string[],
): number | null => {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const toCommitmentType = (
  value: string | null,
): AnchorEventCommitmentType | null => {
  if (value === "create" || value === "join" || value === "waitlist") {
    return value;
  }
  return null;
};

const toActionResult = (value: string | null): AnchorEventActionResult | null => {
  if (value === "success" || value === "blocked" || value === "failure") {
    return value;
  }
  return null;
};

const toOfficialAccountFollowNudgeSource = (
  value: string | null | undefined,
): OfficialAccountFollowNudgeSource => {
  if (
    value === "home" ||
    value === "anchor_event" ||
    value === "pr_join_result" ||
    value === "pr_waitlist_result"
  ) {
    return value;
  }
  return "unknown";
};

const buildRate = (numerator: number, denominator: number): number =>
  denominator > 0 ? numerator / denominator : 0;

const compareMode = (
  left: AnchorEventAnalyticsRenderedMode,
  right: AnchorEventAnalyticsRenderedMode,
): number => (MODE_SORT_INDEX.get(left) ?? 0) - (MODE_SORT_INDEX.get(right) ?? 0);

const buildSourceContext = (
  segmentStartSpm: string | null,
): Pick<SegmentContext, "sourceKey" | "sourceType"> => {
  const sourceKey = segmentStartSpm?.trim();
  if (sourceKey) {
    return { sourceKey, sourceType: "start_spm" };
  }
  return { sourceKey: "unknown", sourceType: "unknown" };
};

const isPrExposureEvent = (
  mode: AnchorEventAnalyticsRenderedMode,
  event: AnchorEventFunnelEventRow,
  properties: Record<string, unknown>,
): boolean => {
  if (mode === "FORM") {
    if (event.eventName !== "anchor_event.recommendation.returned") {
      return false;
    }
    return (
      (readNumber(properties, ["candidateCount", "candidate_count"]) ?? 0) > 0 ||
      (readNumber(properties, ["matchedPrId", "matched_pr_id"]) ?? 0) > 0
    );
  }

  if (mode === "CARD_RICH") {
    return event.eventName === "anchor_event.card.seen";
  }

  return event.eventName === "anchor_event.pr_row.seen";
};

const findStepForEvent = (
  mode: AnchorEventAnalyticsRenderedMode,
  eventName: string,
): FunnelStepDefinition | null =>
  FUNNEL_STEPS_BY_MODE[mode].find((step) => step.eventName === eventName) ??
  null;

const buildOutcomeKey = (
  mode: AnchorEventAnalyticsRenderedMode,
  commitmentType: AnchorEventCommitmentType,
  actionResult: AnchorEventActionResult,
): string => `${mode}:${commitmentType}:${actionResult}`;

const buildSourceKey = (
  mode: AnchorEventAnalyticsRenderedMode,
  sourceKey: string,
  sourceType: "start_spm" | "unknown",
): string => `${mode}:${sourceType}:${sourceKey}`;

const buildFailureKey = (
  mode: AnchorEventAnalyticsRenderedMode,
  eventName: string,
  commitmentType: AnchorEventCommitmentType | null,
  failureCode: string,
  failureReason: string | null,
): string =>
  `${mode}:${eventName}:${commitmentType ?? "none"}:${failureCode}:${
    failureReason ?? ""
  }`;

const getOfficialAccountFollowNudgeSourceAccumulator = (
  map: Map<OfficialAccountFollowNudgeSource, OfficialAccountFollowNudgeAccumulator>,
  source: OfficialAccountFollowNudgeSource,
): OfficialAccountFollowNudgeAccumulator => {
  const existing = map.get(source);
  if (existing) return existing;

  const created = {
    ...createOfficialAccountFollowNudgeAccumulator(),
    source,
  };
  map.set(source, created);
  return created;
};

const addSuccessCount = (
  accumulator: MetricAccumulator,
  commitmentType: AnchorEventCommitmentType,
): void => {
  if (commitmentType === "create") {
    accumulator.createSuccess += 1;
  } else if (commitmentType === "join") {
    accumulator.joinSuccess += 1;
  } else {
    accumulator.waitlistSuccess += 1;
  }
};

const toSummary = (accumulator: MetricAccumulator) => {
  const journeys = accumulator.journeys.size;
  const prCommitmentJourneys = accumulator.prCommitmentJourneys.size;
  return {
    journeys,
    prExposureJourneys: accumulator.prExposureJourneys.size,
    prEntryJourneys: accumulator.prEntryJourneys.size,
    prCommitmentJourneys,
    commitmentRate: buildRate(prCommitmentJourneys, journeys),
    createSuccess: accumulator.createSuccess,
    joinSuccess: accumulator.joinSuccess,
    waitlistSuccess: accumulator.waitlistSuccess,
  };
};

const toOfficialAccountFollowNudgeSummary = (
  accumulator: OfficialAccountFollowNudgeAccumulator,
): Omit<AnalyticsOfficialAccountFollowNudgeSummary, "sources"> => {
  const shownJourneys = accumulator.shownJourneys.size;
  const followClickJourneys = accumulator.followClickJourneys.size;
  return {
    shownJourneys,
    followClickJourneys,
    dismissJourneys: accumulator.dismissJourneys.size,
    shownEvents: accumulator.shownEvents,
    followClickEvents: accumulator.followClickEvents,
    dismissEvents: accumulator.dismissEvents,
    followClickRate: buildRate(followClickJourneys, shownJourneys),
  };
};

const buildModeComparisonRow = (
  mode: AnchorEventAnalyticsRenderedMode,
  accumulator: MetricAccumulator,
): AnalyticsModeComparisonRow => ({
  renderedMode: mode,
  ...toSummary(accumulator),
});

const buildFunnel = (
  mode: AnchorEventAnalyticsRenderedMode,
  stepAccumulators: Map<string, StepAccumulator>,
): AnalyticsModeFunnel => {
  const definitions = FUNNEL_STEPS_BY_MODE[mode];
  const firstAccumulator = getStepAccumulator(
    stepAccumulators,
    mode,
    definitions[0]?.stepKey ?? "landing_viewed",
  );
  const startCount = firstAccumulator.journeys.size;
  let previousCount: number | null = null;

  return {
    renderedMode: mode,
    steps: definitions.map((definition) => {
      const accumulator = getStepAccumulator(
        stepAccumulators,
        mode,
        definition.stepKey,
      );
      const journeyCount = accumulator.journeys.size;
      const conversionFromPrevious =
        previousCount === null
          ? null
          : previousCount > 0
            ? journeyCount / previousCount
            : null;
      previousCount = journeyCount;
      return {
        ...definition,
        journeyCount,
        eventCount: accumulator.eventCount,
        conversionFromPrevious,
        conversionFromStart: buildRate(journeyCount, startCount),
      };
    }),
  };
};

export const resolveAnchorEventFunnelFilters = (
  input: AnchorEventFunnelQueryInput,
): AnchorEventFunnelFilters => {
  const endAt = input.endAt ?? new Date();
  const startAt =
    input.startAt ?? new Date(endAt.getTime() - DEFAULT_WINDOW_MS);

  if (startAt.getTime() >= endAt.getTime()) {
    throw new Error("startAt must be before endAt");
  }

  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    eventId: input.eventId ?? null,
    spm: input.spm ?? null,
    sourceQr: input.sourceQr ?? null,
    assignmentRevision: input.assignmentRevision ?? null,
    renderedMode: input.renderedMode ?? null,
  };
};

export const buildAnchorEventFunnelResponseFromRows = (
  filters: AnchorEventFunnelFilters,
  segmentRows: AnchorEventFunnelSegmentRow[],
  eventRows: AnchorEventFunnelEventRow[],
  officialAccountFollowNudgeRows: OfficialAccountFollowNudgeEventRow[] = [],
): AnchorEventFunnelResponse => {
  const summaryAccumulator = createMetricAccumulator();
  const modeAccumulators = createModeAccumulatorMap();
  const stepAccumulators = createStepAccumulatorMap();
  const segmentContexts = new Map<string, SegmentContext>();
  const outcomeAccumulators = new Map<string, OutcomeAccumulator>();
  const sourceAccumulators = new Map<string, SourceAccumulator>();
  const failureAccumulators = new Map<string, FailureAccumulator>();
  const officialAccountFollowNudgeAccumulator =
    createOfficialAccountFollowNudgeAccumulator();
  const officialAccountFollowNudgeSourceAccumulators = new Map<
    OfficialAccountFollowNudgeSource,
    OfficialAccountFollowNudgeAccumulator
  >();

  for (const segment of segmentRows) {
    const renderedMode = toRenderedMode(segment.renderedMode);
    if (!renderedMode) continue;

    const source = buildSourceContext(segment.startSpm);
    const context: SegmentContext = {
      segmentId: segment.segmentId,
      journeyId: segment.journeyId,
      renderedMode,
      ...source,
    };
    segmentContexts.set(segment.segmentId, context);

    summaryAccumulator.journeys.add(segment.journeyId);
    getMetricAccumulator(modeAccumulators, renderedMode).journeys.add(
      segment.journeyId,
    );
    getStepAccumulator(
      stepAccumulators,
      renderedMode,
      "landing_viewed",
    ).journeys.add(segment.journeyId);

    const sourceKey = buildSourceKey(
      renderedMode,
      context.sourceKey,
      context.sourceType,
    );
    const sourceAccumulator =
      sourceAccumulators.get(sourceKey) ??
      {
        sourceKey: context.sourceKey,
        sourceType: context.sourceType,
        renderedMode,
        journeys: new Set<string>(),
        prCommitmentJourneys: new Set<string>(),
      };
    sourceAccumulator.journeys.add(segment.journeyId);
    sourceAccumulators.set(sourceKey, sourceAccumulator);
  }

  for (const event of eventRows) {
    const properties = toRecord(event.properties);
    const context = event.segmentId
      ? segmentContexts.get(event.segmentId)
      : undefined;
    const renderedMode = context?.renderedMode ?? toRenderedMode(event.renderedMode);
    if (!renderedMode) continue;

    const journeyId = context?.journeyId ?? event.journeyId;
    const modeAccumulator = getMetricAccumulator(modeAccumulators, renderedMode);
    const step = findStepForEvent(renderedMode, event.eventName);
    if (step) {
      const stepAccumulator = getStepAccumulator(
        stepAccumulators,
        renderedMode,
        step.stepKey,
      );
      stepAccumulator.eventCount += 1;
      stepAccumulator.journeys.add(journeyId);
    }

    if (isPrExposureEvent(renderedMode, event, properties)) {
      summaryAccumulator.prExposureJourneys.add(journeyId);
      modeAccumulator.prExposureJourneys.add(journeyId);
    }

    if (event.eventName === "pr.entry.reached") {
      summaryAccumulator.prEntryJourneys.add(journeyId);
      modeAccumulator.prEntryJourneys.add(journeyId);
    }

    if (event.eventName !== "pr.commitment.result") {
      continue;
    }

    const commitmentType = toCommitmentType(
      readString(properties, ["commitmentType", "commitment_type"]),
    );
    const actionResult = toActionResult(
      readString(properties, ["actionResult", "action_result"]),
    );
    if (!commitmentType || !actionResult) {
      continue;
    }

    const outcomeKey = buildOutcomeKey(
      renderedMode,
      commitmentType,
      actionResult,
    );
    const outcomeAccumulator =
      outcomeAccumulators.get(outcomeKey) ??
      {
        journeys: new Set<string>(),
        eventCount: 0,
      };
    outcomeAccumulator.journeys.add(journeyId);
    outcomeAccumulator.eventCount += 1;
    outcomeAccumulators.set(outcomeKey, outcomeAccumulator);

    if (actionResult === "success") {
      summaryAccumulator.prCommitmentJourneys.add(journeyId);
      modeAccumulator.prCommitmentJourneys.add(journeyId);
      addSuccessCount(summaryAccumulator, commitmentType);
      addSuccessCount(modeAccumulator, commitmentType);

      if (context) {
        const sourceKey = buildSourceKey(
          renderedMode,
          context.sourceKey,
          context.sourceType,
        );
        sourceAccumulators.get(sourceKey)?.prCommitmentJourneys.add(journeyId);
      }
      continue;
    }

    const failureCode =
      readString(properties, ["failureCode", "failure_code"]) ?? "UNKNOWN";
    const failureReason = readString(properties, [
      "failureReason",
      "failure_reason",
    ]);
    const failureKey = buildFailureKey(
      renderedMode,
      event.eventName,
      commitmentType,
      failureCode,
      failureReason,
    );
    const failureAccumulator =
      failureAccumulators.get(failureKey) ??
      {
        renderedMode,
        eventName: event.eventName,
        commitmentType,
        failureCode,
        failureReason,
        journeys: new Set<string>(),
        eventCount: 0,
      };
    failureAccumulator.journeys.add(journeyId);
    failureAccumulator.eventCount += 1;
    failureAccumulators.set(failureKey, failureAccumulator);
  }

  for (const event of officialAccountFollowNudgeRows) {
    const source = toOfficialAccountFollowNudgeSource(event.source);
    const sourceAccumulator =
      getOfficialAccountFollowNudgeSourceAccumulator(
        officialAccountFollowNudgeSourceAccumulators,
        source,
      );
    const accumulators = [
      officialAccountFollowNudgeAccumulator,
      sourceAccumulator,
    ];

    if (event.eventName === "official.account.follow.nudge.shown") {
      for (const accumulator of accumulators) {
        accumulator.shownJourneys.add(event.journeyId);
        accumulator.shownEvents += 1;
      }
      continue;
    }

    if (event.eventName !== "official.account.follow.nudge.action.click") {
      continue;
    }

    if (event.action === "complete") {
      for (const accumulator of accumulators) {
        accumulator.followClickJourneys.add(event.journeyId);
        accumulator.followClickEvents += 1;
      }
    } else if (event.action === "dismiss") {
      for (const accumulator of accumulators) {
        accumulator.dismissJourneys.add(event.journeyId);
        accumulator.dismissEvents += 1;
      }
    }
  }

  const modes = ANCHOR_EVENT_ANALYTICS_RENDERED_MODES.map((mode) =>
    buildModeComparisonRow(mode, getMetricAccumulator(modeAccumulators, mode)),
  );

  return {
    filters,
    summary: toSummary(summaryAccumulator),
    modes,
    funnels: ANCHOR_EVENT_ANALYTICS_RENDERED_MODES.map((mode) =>
      buildFunnel(mode, stepAccumulators),
    ),
    outcomes: Array.from(outcomeAccumulators.entries())
      .map(([key, accumulator]) => {
        const [mode, commitmentType, actionResult] = key.split(":");
        return {
          renderedMode: mode as AnchorEventAnalyticsRenderedMode,
          commitmentType: commitmentType as AnchorEventCommitmentType,
          actionResult: actionResult as AnchorEventActionResult,
          journeyCount: accumulator.journeys.size,
          eventCount: accumulator.eventCount,
        };
      })
      .sort((a, b) =>
        compareMode(a.renderedMode, b.renderedMode) ||
        `${a.commitmentType}:${a.actionResult}`.localeCompare(
          `${b.commitmentType}:${b.actionResult}`,
        ),
      ),
    sources: Array.from(sourceAccumulators.values())
      .map((accumulator) => {
        const journeys = accumulator.journeys.size;
        const prCommitmentJourneys = accumulator.prCommitmentJourneys.size;
        return {
          sourceKey: accumulator.sourceKey,
          sourceType: accumulator.sourceType,
          renderedMode: accumulator.renderedMode,
          journeys,
          prCommitmentJourneys,
          commitmentRate: buildRate(prCommitmentJourneys, journeys),
        };
      })
      .sort((a, b) =>
        compareMode(a.renderedMode, b.renderedMode) ||
        `${a.sourceType}:${a.sourceKey}`.localeCompare(
          `${b.sourceType}:${b.sourceKey}`,
        ),
      ),
    failures: Array.from(failureAccumulators.values())
      .map((accumulator) => ({
        renderedMode: accumulator.renderedMode,
        eventName: accumulator.eventName,
        commitmentType: accumulator.commitmentType,
        failureCode: accumulator.failureCode,
        failureReason: accumulator.failureReason,
        journeyCount: accumulator.journeys.size,
        eventCount: accumulator.eventCount,
      }))
      .sort((a, b) =>
        compareMode(a.renderedMode, b.renderedMode) ||
        `${a.eventName}:${a.commitmentType ?? ""}:${a.failureCode}`.localeCompare(
          `${b.eventName}:${b.commitmentType ?? ""}:${b.failureCode}`,
        ),
      ),
    officialAccountFollowNudge: {
      ...toOfficialAccountFollowNudgeSummary(
        officialAccountFollowNudgeAccumulator,
      ),
      sources: Array.from(officialAccountFollowNudgeSourceAccumulators.values())
        .map((accumulator) => ({
          source: accumulator.source ?? "unknown",
          ...toOfficialAccountFollowNudgeSummary(accumulator),
        }))
        .sort((a, b) => a.source.localeCompare(b.source)),
    },
  };
};
