import {
  and,
  asc,
  eq,
  gte,
  isNotNull,
  lt,
  type SQL,
} from "drizzle-orm";
import {
  factAnchorEventFunnelEvents,
  factAnchorEventFunnelSegments,
  factOfficialAccountFollowNudgeEvents,
} from "../../entities";
import { db } from "../../lib/db";
import {
  ANCHOR_EVENT_ANALYTICS_RENDERED_MODES,
  buildAnchorEventFunnelResponseFromRows,
  resolveAnchorEventFunnelFilters,
  type AnchorEventAnalyticsRenderedMode,
  type AnchorEventFunnelEventRow,
  type AnchorEventFunnelQueryInput,
  type AnchorEventFunnelResponse,
  type AnchorEventFunnelSegmentRow,
  type OfficialAccountFollowNudgeEventRow,
} from "./anchor-event-funnel.model";

type AnchorEventFunnelSegmentViewRow = {
  segmentId: string | null;
  journeyId: string;
  renderedMode: string | null;
  startSpm: string | null;
};

type AnchorEventFunnelEventViewRow = {
  eventName: string;
  journeyId: string;
  segmentId: string | null;
  renderedMode: string | null;
  payload: unknown;
};

type OfficialAccountFollowNudgeViewRow = {
  eventName: string;
  journeyId: string;
  source: string | null;
  action: string | null;
};

const combineConditions = (conditions: SQL[]): SQL => {
  const result = and(...conditions);
  if (!result) {
    throw new Error("Expected at least one analytics query condition");
  }
  return result;
};

const toSegmentRow = (
  row: AnchorEventFunnelSegmentViewRow,
): AnchorEventFunnelSegmentRow | null => {
  if (!row.segmentId) return null;
  return {
    segmentId: row.segmentId,
    journeyId: row.journeyId,
    renderedMode: row.renderedMode,
    startSpm: row.startSpm,
  };
};

const toEventRow = (
  row: AnchorEventFunnelEventViewRow,
): AnchorEventFunnelEventRow | null => {
  if (!row.segmentId) return null;
  return {
    eventName: row.eventName,
    journeyId: row.journeyId,
    segmentId: row.segmentId,
    renderedMode: row.renderedMode,
    properties: row.payload,
  };
};

const toOfficialAccountFollowNudgeRow = (
  row: OfficialAccountFollowNudgeViewRow,
): OfficialAccountFollowNudgeEventRow => ({
  eventName: row.eventName,
  journeyId: row.journeyId,
  source: row.source,
  action: row.action,
});

const compact = <T>(values: readonly (T | null)[]): T[] =>
  values.filter((value): value is T => value !== null);

const buildSegmentConditions = (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): SQL[] => {
  const conditions: SQL[] = [
    isNotNull(factAnchorEventFunnelSegments.segmentId),
    gte(
      factAnchorEventFunnelSegments.contextOccurredAt,
      new Date(startAtIso),
    ),
    lt(factAnchorEventFunnelSegments.contextOccurredAt, new Date(endAtIso)),
  ];

  if (input.eventId !== undefined) {
    conditions.push(eq(factAnchorEventFunnelSegments.anchorEventId, input.eventId));
  }
  if (input.spm !== undefined) {
    conditions.push(eq(factAnchorEventFunnelSegments.startSpm, input.spm));
  }
  if (input.sourceQr !== undefined) {
    conditions.push(eq(factAnchorEventFunnelSegments.sourceQr, input.sourceQr));
  }
  if (input.assignmentRevision !== undefined) {
    conditions.push(
      eq(
        factAnchorEventFunnelSegments.assignmentRevision,
        input.assignmentRevision,
      ),
    );
  }
  if (input.renderedMode !== undefined) {
    conditions.push(eq(factAnchorEventFunnelSegments.renderedMode, input.renderedMode));
  }

  return conditions;
};

const buildEventConditions = (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): SQL[] => {
  const conditions: SQL[] = [
    isNotNull(factAnchorEventFunnelEvents.segmentId),
    gte(factAnchorEventFunnelEvents.contextOccurredAt, new Date(startAtIso)),
    lt(factAnchorEventFunnelEvents.contextOccurredAt, new Date(endAtIso)),
  ];

  if (input.eventId !== undefined) {
    conditions.push(eq(factAnchorEventFunnelEvents.anchorEventId, input.eventId));
  }
  if (input.spm !== undefined) {
    conditions.push(eq(factAnchorEventFunnelEvents.startSpm, input.spm));
  }
  if (input.sourceQr !== undefined) {
    conditions.push(eq(factAnchorEventFunnelEvents.sourceQr, input.sourceQr));
  }
  if (input.assignmentRevision !== undefined) {
    conditions.push(
      eq(
        factAnchorEventFunnelEvents.assignmentRevision,
        input.assignmentRevision,
      ),
    );
  }
  if (input.renderedMode !== undefined) {
    conditions.push(eq(factAnchorEventFunnelEvents.renderedMode, input.renderedMode));
  }

  return conditions;
};

const buildOfficialAccountFollowNudgeConditions = (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): SQL[] => {
  const conditions: SQL[] = [
    gte(factOfficialAccountFollowNudgeEvents.occurredAt, new Date(startAtIso)),
    lt(factOfficialAccountFollowNudgeEvents.occurredAt, new Date(endAtIso)),
  ];

  if (input.eventId !== undefined) {
    conditions.push(
      eq(factOfficialAccountFollowNudgeEvents.anchorEventId, input.eventId),
    );
  }
  if (input.spm !== undefined) {
    conditions.push(eq(factOfficialAccountFollowNudgeEvents.spm, input.spm));
  }
  if (input.sourceQr !== undefined) {
    conditions.push(
      eq(factOfficialAccountFollowNudgeEvents.sourceQr, input.sourceQr),
    );
  }
  if (input.assignmentRevision !== undefined) {
    conditions.push(
      eq(
        factOfficialAccountFollowNudgeEvents.assignmentRevision,
        input.assignmentRevision,
      ),
    );
  }
  if (input.renderedMode !== undefined) {
    conditions.push(
      eq(factOfficialAccountFollowNudgeEvents.renderedMode, input.renderedMode),
    );
  }

  return conditions;
};

const fetchSegmentRows = async (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): Promise<AnchorEventFunnelSegmentRow[]> => {
  const rows = await db
    .select({
      segmentId: factAnchorEventFunnelSegments.segmentId,
      journeyId: factAnchorEventFunnelSegments.journeyId,
      renderedMode: factAnchorEventFunnelSegments.renderedMode,
      startSpm: factAnchorEventFunnelSegments.startSpm,
    })
    .from(factAnchorEventFunnelSegments)
    .where(
      combineConditions(buildSegmentConditions(input, startAtIso, endAtIso)),
    )
    .orderBy(
      asc(factAnchorEventFunnelSegments.contextOccurredAt),
      asc(factAnchorEventFunnelSegments.segmentId),
    );

  return compact(rows.map(toSegmentRow));
};

const fetchEventRows = async (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): Promise<AnchorEventFunnelEventRow[]> => {
  const rows = await db
    .select({
      eventName: factAnchorEventFunnelEvents.eventName,
      journeyId: factAnchorEventFunnelEvents.journeyId,
      segmentId: factAnchorEventFunnelEvents.segmentId,
      renderedMode: factAnchorEventFunnelEvents.renderedMode,
      payload: factAnchorEventFunnelEvents.payload,
    })
    .from(factAnchorEventFunnelEvents)
    .where(combineConditions(buildEventConditions(input, startAtIso, endAtIso)))
    .orderBy(
      asc(factAnchorEventFunnelEvents.contextOccurredAt),
      asc(factAnchorEventFunnelEvents.occurredAt),
      asc(factAnchorEventFunnelEvents.eventId),
    );

  return compact(rows.map(toEventRow));
};

const fetchOfficialAccountFollowNudgeRows = async (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): Promise<OfficialAccountFollowNudgeEventRow[]> => {
  const rows = await db
    .select({
      eventName: factOfficialAccountFollowNudgeEvents.eventName,
      journeyId: factOfficialAccountFollowNudgeEvents.journeyId,
      source: factOfficialAccountFollowNudgeEvents.source,
      action: factOfficialAccountFollowNudgeEvents.action,
    })
    .from(factOfficialAccountFollowNudgeEvents)
    .where(
      combineConditions(
        buildOfficialAccountFollowNudgeConditions(input, startAtIso, endAtIso),
      ),
    )
    .orderBy(
      asc(factOfficialAccountFollowNudgeEvents.occurredAt),
      asc(factOfficialAccountFollowNudgeEvents.eventId),
    );

  return rows.map(toOfficialAccountFollowNudgeRow);
};

export async function getAnchorEventFunnelAnalytics(
  input: AnchorEventFunnelQueryInput = {},
): Promise<AnchorEventFunnelResponse> {
  const filters = resolveAnchorEventFunnelFilters(input);
  const queryInput = {
    eventId: filters.eventId ?? undefined,
    spm: filters.spm ?? undefined,
    sourceQr: filters.sourceQr ?? undefined,
    assignmentRevision: filters.assignmentRevision ?? undefined,
    renderedMode: filters.renderedMode ?? undefined,
  };
  const [segmentRows, eventRows, officialAccountFollowNudgeRows] =
    await Promise.all([
      fetchSegmentRows(queryInput, filters.startAt, filters.endAt),
      fetchEventRows(queryInput, filters.startAt, filters.endAt),
      fetchOfficialAccountFollowNudgeRows(
        queryInput,
        filters.startAt,
        filters.endAt,
      ),
    ]);

  return buildAnchorEventFunnelResponseFromRows(
    filters,
    segmentRows,
    eventRows,
    officialAccountFollowNudgeRows,
  );
}

export type {
  AnchorEventAnalyticsRenderedMode,
  AnchorEventFunnelQueryInput,
  AnchorEventFunnelResponse,
};
export { ANCHOR_EVENT_ANALYTICS_RENDERED_MODES };
