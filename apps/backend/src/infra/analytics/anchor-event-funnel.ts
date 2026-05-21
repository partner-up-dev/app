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
  journey_id: string;
  rendered_mode: string | null;
  start_spm: string | null;
}

interface EventQueryRow extends Record<string, unknown> {
  event_name: string;
  journey_id: string;
  segment_id: string | null;
  rendered_mode: string | null;
  payload: unknown;
}

interface OfficialAccountFollowNudgeQueryRow extends Record<string, unknown> {
  event_name: string;
  journey_id: string;
  source: string | null;
  action: string | null;
}

const jsonTextInteger = (expression: SQL): SQL =>
  sql`case when (${expression}) ~ '^[0-9]+$' then (${expression})::integer else null end`;

const buildSegmentWhere = (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): SQL => {
  const filters: SQL[] = [
    sql`s.event_name = 'segment.started'`,
    sql`s.payload ->> 'segment_kind' = 'anchor_event_landing'`,
    sql`s.occurred_at >= ${startAtIso}::timestamp`,
    sql`s.occurred_at < ${endAtIso}::timestamp`,
  ];

  if (input.eventId !== undefined) {
    filters.push(
      sql`${jsonTextInteger(sql`s.payload ->> 'event_id'`)} = ${input.eventId}`,
    );
  }
  if (input.spm !== undefined) {
    filters.push(sql`s.payload ->> 'segment_start_spm' = ${input.spm}`);
  }
  if (input.sourceQr !== undefined) {
    filters.push(sql`s.payload ->> 'segment_start_source_qr' = ${input.sourceQr}`);
  }
  if (input.assignmentRevision !== undefined) {
    filters.push(sql`s.payload ->> 'assignment_revision' = ${input.assignmentRevision}`);
  }
  if (input.renderedMode !== undefined) {
    filters.push(sql`s.attributes ->> 'rendered_mode' = ${input.renderedMode}`);
  }

  return sql.join(filters, sql` and `);
};

const buildLandingContextWhere = (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): SQL => {
  const filters: SQL[] = [
    sql`s.event_name = 'anchor_event.landing.viewed'`,
    sql`s.occurred_at >= ${startAtIso}::timestamp`,
    sql`s.occurred_at < ${endAtIso}::timestamp`,
  ];

  if (input.eventId !== undefined) {
    filters.push(
      sql`${jsonTextInteger(sql`s.payload ->> 'eventId'`)} = ${input.eventId}`,
    );
  }
  if (input.spm !== undefined) {
    filters.push(
      sql`coalesce(s.attributes ->> 'spm', s.payload ->> 'spm') = ${input.spm}`,
    );
  }
  if (input.sourceQr !== undefined) {
    filters.push(
      sql`coalesce(s.attributes ->> 'source_qr', s.payload ->> 'sourceQr') = ${input.sourceQr}`,
    );
  }
  if (input.assignmentRevision !== undefined) {
    filters.push(
      sql`s.payload ->> 'assignmentRevision' = ${input.assignmentRevision}`,
    );
  }
  if (input.renderedMode !== undefined) {
    filters.push(sql`s.payload ->> 'renderedMode' = ${input.renderedMode}`);
  }

  return sql.join(filters, sql` and `);
};

const toSegmentRow = (row: SegmentQueryRow): AnchorEventFunnelSegmentRow => ({
  segmentId: row.segment_id,
  journeyId: row.journey_id,
  renderedMode: row.rendered_mode,
  startSpm: row.start_spm,
});

const toEventRow = (row: EventQueryRow): AnchorEventFunnelEventRow => ({
  eventName: row.event_name,
  journeyId: row.journey_id,
  segmentId: row.segment_id,
  renderedMode: row.rendered_mode,
  properties: row.payload,
});

const toOfficialAccountFollowNudgeRow = (
  row: OfficialAccountFollowNudgeQueryRow,
): OfficialAccountFollowNudgeEventRow => ({
  eventName: row.event_name,
  journeyId: row.journey_id,
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
  const legacyWhere = buildSegmentWhere(input, startAtIso, endAtIso);
  const landingContextWhere = buildLandingContextWhere(
    input,
    startAtIso,
    endAtIso,
  );
  const rows = await db.execute<SegmentQueryRow>(sql`
    select
      contexts.segment_id,
      contexts.journey_id,
      contexts.rendered_mode,
      contexts.start_spm
    from (
      select
        s.payload ->> 'segment_id' as segment_id,
        s.journey_id::text as journey_id,
        s.attributes ->> 'rendered_mode' as rendered_mode,
        s.payload ->> 'segment_start_spm' as start_spm
      from user_telemetry_events s
      where ${legacyWhere}

      union all

      select
        s.event_id::text as segment_id,
        s.journey_id::text as journey_id,
        s.payload ->> 'renderedMode' as rendered_mode,
        coalesce(s.attributes ->> 'spm', s.payload ->> 'spm') as start_spm
      from user_telemetry_events s
      where ${landingContextWhere}
    ) contexts
  `);
  return rows.map(toSegmentRow);
};

const fetchEventRows = async (
  input: AnchorEventFunnelQueryInput,
  startAtIso: string,
  endAtIso: string,
): Promise<AnchorEventFunnelEventRow[]> => {
  const legacyWhere = buildSegmentWhere(input, startAtIso, endAtIso);
  const landingContextWhere = buildLandingContextWhere(
    input,
    startAtIso,
    endAtIso,
  );
  const rows = await db.execute<EventQueryRow>(sql`
    with base_segments as (
      select
        s.payload ->> 'segment_id' as segment_id,
        ${jsonTextInteger(sql`s.payload ->> 'event_id'`)} as event_id,
        s.journey_id::text as journey_id,
        s.attributes ->> 'rendered_mode' as rendered_mode,
        s.occurred_at as context_occurred_at
      from user_telemetry_events s
      where ${legacyWhere}

      union all

      select
        s.event_id::text as segment_id,
        ${jsonTextInteger(sql`s.payload ->> 'eventId'`)} as event_id,
        s.journey_id::text as journey_id,
        s.payload ->> 'renderedMode' as rendered_mode,
        s.occurred_at as context_occurred_at
      from user_telemetry_events s
      where ${landingContextWhere}
    )
    select
      e.event_name,
      e.journey_id::text as journey_id,
      matched_segments.segment_id,
      matched_segments.rendered_mode,
      e.payload
    from user_telemetry_events e
    inner join lateral (
      select
        base_segments.segment_id,
        base_segments.rendered_mode
      from base_segments
      where
        base_segments.segment_id = e.payload ->> 'legacy_segment_id'
        or (
          e.journey_id::text = base_segments.journey_id
          and coalesce(
            ${jsonTextInteger(sql`e.payload ->> 'eventId'`)},
            ${jsonTextInteger(sql`e.payload ->> 'eventIdRef'`)},
            ${jsonTextInteger(sql`e.payload ->> 'event_id_ref'`)}
          ) = base_segments.event_id
          and base_segments.context_occurred_at <= e.occurred_at
        )
      order by
        case
          when base_segments.segment_id = e.payload ->> 'legacy_segment_id'
            then 0
          else 1
        end,
        base_segments.context_occurred_at desc,
        base_segments.segment_id desc
      limit 1
    ) matched_segments on true
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
      sql`coalesce(
        ${jsonTextInteger(sql`e.payload ->> 'eventId'`)},
        ${jsonTextInteger(sql`e.payload ->> 'event_id_ref'`)}
      ) = ${input.eventId}`,
    );
  }
  if (input.spm !== undefined) {
    filters.push(sql`coalesce(e.attributes ->> 'spm', e.payload ->> 'spm') = ${input.spm}`);
  }
  if (input.sourceQr !== undefined) {
    filters.push(sql`coalesce(e.attributes ->> 'source_qr', e.payload ->> 'sourceQr') = ${input.sourceQr}`);
  }
  if (input.assignmentRevision !== undefined) {
    filters.push(sql`e.payload ->> 'assignmentRevision' = ${input.assignmentRevision}`);
  }
  if (input.renderedMode !== undefined) {
    filters.push(sql`e.payload ->> 'renderedMode' = ${input.renderedMode}`);
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
      e.journey_id::text as journey_id,
      nullif(e.payload ->> 'source', '') as source,
      nullif(e.payload ->> 'action', '') as action
    from user_telemetry_events e
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
