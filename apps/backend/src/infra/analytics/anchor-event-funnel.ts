import { sql, type SQL } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  ANCHOR_EVENT_ANALYTICS_RENDERED_MODES,
  ANCHOR_EVENT_FUNNEL_EVENT_NAMES,
  OFFICIAL_ACCOUNT_FOLLOW_NUDGE_EVENT_NAMES,
  buildAnchorEventFunnelResponseFromRows,
  resolveAnchorEventFunnelFilters,
  type AnchorEventAnalyticsRenderedMode,
  type AnchorEventFunnelEventRow,
  type AnchorEventFunnelQueryInput,
  type AnchorEventFunnelResponse,
  type AnchorEventFunnelSegmentRow,
  type OfficialAccountFollowNudgeEventRow,
} from "./anchor-event-funnel.model";

interface SegmentQueryRow extends Record<string, unknown> {
  segment_id: string;
  app_journey_id: string;
  rendered_mode: string | null;
  start_spm: string | null;
}

interface EventQueryRow extends Record<string, unknown> {
  event_name: string;
  app_journey_id: string;
  segment_id: string | null;
  rendered_mode: string | null;
  properties: unknown;
}

interface OfficialAccountFollowNudgeQueryRow extends Record<string, unknown> {
  event_name: string;
  app_journey_id: string;
  source: string | null;
  action: string | null;
}

const buildSegmentWhere = (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): SQL => {
  const filters: SQL[] = [
    sql`s.segment_kind = 'anchor_event_landing'`,
    sql`s.started_at >= ${startAtIso}::timestamp`,
    sql`s.started_at < ${endAtIso}::timestamp`,
  ];

  if (input.eventId !== undefined) {
    filters.push(sql`s.event_id = ${input.eventId}`);
  }
  if (input.spm !== undefined) {
    filters.push(sql`j.start_spm = ${input.spm}`);
  }
  if (input.sourceQr !== undefined) {
    filters.push(sql`j.start_source_qr = ${input.sourceQr}`);
  }
  if (input.assignmentRevision !== undefined) {
    filters.push(sql`s.assignment_revision = ${input.assignmentRevision}`);
  }
  if (input.renderedMode !== undefined) {
    filters.push(sql`s.rendered_mode = ${input.renderedMode}`);
  }

  return sql.join(filters, sql` and `);
};

const toSegmentRow = (row: SegmentQueryRow): AnchorEventFunnelSegmentRow => ({
  segmentId: row.segment_id,
  appJourneyId: row.app_journey_id,
  renderedMode: row.rendered_mode,
  startSpm: row.start_spm,
});

const toEventRow = (row: EventQueryRow): AnchorEventFunnelEventRow => ({
  eventName: row.event_name,
  appJourneyId: row.app_journey_id,
  segmentId: row.segment_id,
  renderedMode: row.rendered_mode,
  properties: row.properties,
});

const toOfficialAccountFollowNudgeRow = (
  row: OfficialAccountFollowNudgeQueryRow,
): OfficialAccountFollowNudgeEventRow => ({
  eventName: row.event_name,
  appJourneyId: row.app_journey_id,
  source: row.source,
  action: row.action,
});

const eventNameSqlList = (): SQL =>
  sql.join(
    ANCHOR_EVENT_FUNNEL_EVENT_NAMES.map((eventName) => sql`${eventName}`),
    sql`, `,
  );

const officialAccountFollowNudgeEventNameSqlList = (): SQL =>
  sql.join(
    OFFICIAL_ACCOUNT_FOLLOW_NUDGE_EVENT_NAMES.map(
      (eventName) => sql`${eventName}`,
    ),
    sql`, `,
  );

const fetchSegmentRows = async (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): Promise<AnchorEventFunnelSegmentRow[]> => {
  const where = buildSegmentWhere(input, startAtIso, endAtIso);
  const rows = await db.execute<SegmentQueryRow>(sql`
    select
      s.id::text as segment_id,
      s.app_journey_id::text as app_journey_id,
      s.rendered_mode,
      j.start_spm
    from user_telemetry_segments s
    inner join user_telemetry_journeys j on j.id = s.app_journey_id
    where ${where}
  `);
  return rows.map(toSegmentRow);
};

const fetchEventRows = async (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): Promise<AnchorEventFunnelEventRow[]> => {
  const where = buildSegmentWhere(input, startAtIso, endAtIso);
  const rows = await db.execute<EventQueryRow>(sql`
    with base_segments as (
      select
        s.id as segment_id,
        s.rendered_mode
      from user_telemetry_segments s
      inner join user_telemetry_journeys j on j.id = s.app_journey_id
      where ${where}
    )
    select
      e.event_name,
      e.app_journey_id::text as app_journey_id,
      e.segment_id::text as segment_id,
      base_segments.rendered_mode,
      e.properties
    from user_telemetry_events e
    inner join base_segments on base_segments.segment_id = e.segment_id
    where e.event_name in (${eventNameSqlList()})
  `);
  return rows.map(toEventRow);
};

const buildOfficialAccountFollowNudgeWhere = (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): SQL => {
  const filters: SQL[] = [
    sql`e.event_name in (${officialAccountFollowNudgeEventNameSqlList()})`,
    sql`e.occurred_at >= ${startAtIso}::timestamp`,
    sql`e.occurred_at < ${endAtIso}::timestamp`,
  ];

  if (input.eventId !== undefined) {
    filters.push(
      sql`coalesce(s.event_id, e.event_id_ref, j.start_event_id) = ${input.eventId}`,
    );
  }
  if (input.spm !== undefined) {
    filters.push(sql`j.start_spm = ${input.spm}`);
  }
  if (input.sourceQr !== undefined) {
    filters.push(sql`j.start_source_qr = ${input.sourceQr}`);
  }
  if (input.assignmentRevision !== undefined) {
    filters.push(sql`s.assignment_revision = ${input.assignmentRevision}`);
  }
  if (input.renderedMode !== undefined) {
    filters.push(sql`s.rendered_mode = ${input.renderedMode}`);
  }

  return sql.join(filters, sql` and `);
};

const fetchOfficialAccountFollowNudgeRows = async (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): Promise<OfficialAccountFollowNudgeEventRow[]> => {
  const where = buildOfficialAccountFollowNudgeWhere(
    input,
    startAtIso,
    endAtIso,
  );
  const rows = await db.execute<OfficialAccountFollowNudgeQueryRow>(sql`
    select
      e.event_name,
      e.app_journey_id::text as app_journey_id,
      nullif(e.properties ->> 'source', '') as source,
      nullif(e.properties ->> 'action', '') as action
    from user_telemetry_events e
    inner join user_telemetry_journeys j on j.id = e.app_journey_id
    left join user_telemetry_segments s on s.id = e.segment_id
    where ${where}
  `);
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
