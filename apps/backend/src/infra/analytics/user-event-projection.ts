import { sql, type SQL } from "drizzle-orm";
import { db } from "../../lib/db";
import { getUserTelemetryDimEvents } from "./user-event-dim";

export type UserTelemetryContextStatus =
  | "context_complete"
  | "context_unknown";

export type UserTelemetryEnrichedEventRow = {
  eventId: string;
  eventName: string;
  eventVersion: number;
  eventFamily: string;
  eventOwner: string;
  biUsage: string[];
  journeyId: string;
  traceId: string | null;
  attributes: unknown;
  payload: unknown;
  occurredAt: Date;
  routePath: string | null;
  routeName: string | null;
  spm: string | null;
  sourceQr: string | null;
  anonymousId: string | null;
  authenticatedUserHash: string | null;
  routeContextStatus: UserTelemetryContextStatus;
  authContextStatus: UserTelemetryContextStatus;
};

interface EnrichedEventQueryRow extends Record<string, unknown> {
  event_id: string;
  event_name: string;
  event_version: number;
  event_family: string;
  event_owner: string;
  bi_usage: unknown;
  journey_id: string;
  trace_id: string | null;
  attributes: unknown;
  payload: unknown;
  occurred_at: Date;
  route_path: string | null;
  route_name: string | null;
  spm: string | null;
  source_qr: string | null;
  anonymous_id: string | null;
  authenticated_user_hash: string | null;
  route_context_status: UserTelemetryContextStatus;
  auth_context_status: UserTelemetryContextStatus;
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

const toContextStatus = (value: unknown): UserTelemetryContextStatus =>
  value === "context_complete" ? "context_complete" : "context_unknown";

const eventNameSqlList = (eventNames: readonly string[]): SQL =>
  sql.join(eventNames.map((eventName) => sql`${eventName}`), sql`, `);

const dimEventValuesSql = (): SQL =>
  sql.join(
    getUserTelemetryDimEvents().map(
      (event) =>
        sql`(
          ${event.eventName}::text,
          ${event.eventVersion}::integer,
          ${event.eventFamily}::text,
          ${event.owner}::text,
          ${JSON.stringify(event.biUsage)}::jsonb,
          ${event.deprecated}::boolean
        )`,
    ),
    sql`, `,
  );

const toEnrichedEventRow = (
  row: EnrichedEventQueryRow,
): UserTelemetryEnrichedEventRow => ({
  eventId: row.event_id,
  eventName: row.event_name,
  eventVersion: row.event_version,
  eventFamily: row.event_family,
  eventOwner: row.event_owner,
  biUsage: toStringArray(row.bi_usage),
  journeyId: row.journey_id,
  traceId: row.trace_id,
  attributes: row.attributes,
  payload: row.payload,
  occurredAt: row.occurred_at,
  routePath: row.route_path,
  routeName: row.route_name,
  spm: row.spm,
  sourceQr: row.source_qr,
  anonymousId: row.anonymous_id,
  authenticatedUserHash: row.authenticated_user_hash,
  routeContextStatus: toContextStatus(row.route_context_status),
  authContextStatus: toContextStatus(row.auth_context_status),
});

export const fetchUserTelemetryEnrichedEvents = async (input: {
  eventNames: readonly string[];
  startAt: string;
  endAt: string;
}): Promise<UserTelemetryEnrichedEventRow[]> => {
  if (input.eventNames.length === 0) {
    return [];
  }

  const rows = await db.execute<EnrichedEventQueryRow>(sql`
    with dim_event(
      event_name,
      event_version,
      event_family,
      event_owner,
      bi_usage,
      deprecated
    ) as (
      values ${dimEventValuesSql()}
    ),
    base_events as (
      select e.*
      from user_telemetry_events e
      where e.occurred_at >= ${input.startAt}::timestamp
        and e.occurred_at < ${input.endAt}::timestamp
        and e.event_name in (${eventNameSqlList(input.eventNames)})
    )
    select
      e.event_id::text as event_id,
      e.event_name,
      e.event_version,
      d.event_family,
      d.event_owner,
      d.bi_usage,
      e.journey_id::text as journey_id,
      e.trace_id,
      e.attributes,
      e.payload,
      e.occurred_at,
      route_context.route_path,
      route_context.route_name,
      route_context.spm,
      route_context.source_qr,
      auth_context.anonymous_id,
      auth_context.authenticated_user_hash,
      case
        when route_context.context_event_id is null then 'context_unknown'
        else 'context_complete'
      end as route_context_status,
      case
        when auth_context.context_event_id is null then 'context_unknown'
        else 'context_complete'
      end as auth_context_status
    from base_events e
    inner join dim_event d
      on d.event_name = e.event_name
      and d.event_version = e.event_version
    left join lateral (
      select
        r.event_id as context_event_id,
        nullif(r.payload ->> 'routePath', '') as route_path,
        nullif(
          coalesce(
            r.attributes ->> 'route_name',
            r.payload ->> 'routeName'
          ),
          ''
        ) as route_name,
        nullif(coalesce(r.attributes ->> 'spm', r.payload ->> 'spm'), '') as spm,
        nullif(
          coalesce(r.attributes ->> 'source_qr', r.payload ->> 'sourceQr'),
          ''
        ) as source_qr
      from user_telemetry_events r
      where r.journey_id = e.journey_id
        and r.event_name = 'route.entered'
        and r.occurred_at <= e.occurred_at
      order by r.occurred_at desc, r.event_id desc
      limit 1
    ) route_context on true
    left join lateral (
      select
        a.event_id as context_event_id,
        nullif(a.payload ->> 'anonymous_id', '') as anonymous_id,
        nullif(a.payload ->> 'authenticated_user_hash', '') as authenticated_user_hash
      from user_telemetry_events a
      where a.journey_id = e.journey_id
        and a.event_name = 'auth.session.created'
        and a.occurred_at <= e.occurred_at
      order by a.occurred_at desc, a.event_id desc
      limit 1
    ) auth_context on true
    where d.deprecated = false
    order by e.occurred_at asc, e.event_id asc
  `);

  return rows.map(toEnrichedEventRow);
};
