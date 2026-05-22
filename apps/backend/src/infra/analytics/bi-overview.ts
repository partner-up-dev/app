import { sql } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  BI_OVERVIEW_EVENT_NAMES,
  buildBIOverviewResponse,
  resolveBIOverviewFilters,
  type BIOverviewQueryInput,
  type BIOverviewResponse,
  type PRLifecycleStatusInputRow,
  type UserPRCountInputRow,
} from "./bi-overview.model";
import { getUserTelemetryDimEvents } from "./user-event-dim";
import { fetchUserTelemetryEnrichedEvents } from "./user-event-projection";

type NumericLike = number | string | null | undefined;

interface UserPRCountQueryRow extends Record<string, unknown> {
  user_key: string;
  created_count: NumericLike;
  joined_count: NumericLike;
}

interface PRLifecycleStatusQueryRow extends Record<string, unknown> {
  status: PRLifecycleStatusInputRow["status"];
  count: NumericLike;
}

type PRLifecycleCohortDimension = "created_at" | "time_window_end_at";

const RETENTION_LOOKAHEAD_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1_000;

const toNumber = (value: NumericLike): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const getRetentionEventNames = (): string[] =>
  getUserTelemetryDimEvents()
    .filter((event) => !event.deprecated)
    .map((event) => event.eventName);

const fetchUserPRCountRows = async (
  startAt: string,
  endAt: string,
): Promise<UserPRCountInputRow[]> => {
  const rows = await db.execute<UserPRCountQueryRow>(sql`
    with created as (
      select
        pr.created_by::text as user_key,
        count(*)::int as created_count
      from partner_requests pr
      where pr.created_at >= ${startAt}::timestamp
        and pr.created_at < ${endAt}::timestamp
        and pr.created_by is not null
      group by pr.created_by
    ),
    joined as (
      select
        p.user_id::text as user_key,
        count(distinct p.pr_id)::int as joined_count
      from partners p
      where p.created_at >= ${startAt}::timestamp
        and p.created_at < ${endAt}::timestamp
        and p.status in ('JOINED', 'CONFIRMED', 'ATTENDED')
      group by p.user_id
    )
    select
      coalesce(created.user_key, joined.user_key) as user_key,
      coalesce(created.created_count, 0)::int as created_count,
      coalesce(joined.joined_count, 0)::int as joined_count
    from created
    full outer join joined on joined.user_key = created.user_key
    order by coalesce(created.created_count, 0) + coalesce(joined.joined_count, 0) desc,
      coalesce(created.user_key, joined.user_key) asc
  `);

  return rows.map((row) => ({
    userKey: row.user_key,
    createdCount: toNumber(row.created_count),
    joinedCount: toNumber(row.joined_count),
  }));
};

const fetchPRLifecycleStatusRows = async (
  startAt: string,
  endAt: string,
  dimension: PRLifecycleCohortDimension,
): Promise<PRLifecycleStatusInputRow[]> => {
  const where =
    dimension === "created_at"
      ? sql`pr.created_at >= ${startAt}::timestamp
          and pr.created_at < ${endAt}::timestamp`
      : sql`pr.time_window[2] is not null
          and nullif(pr.time_window[2], '')::timestamp >= ${startAt}::timestamp
          and nullif(pr.time_window[2], '')::timestamp < ${endAt}::timestamp`;

  const rows = await db.execute<PRLifecycleStatusQueryRow>(sql`
    select
      pr.status,
      count(*)::int as count
    from partner_requests pr
    where ${where}
    group by pr.status
    order by pr.status asc
  `);

  return rows.map((row) => ({
    status: row.status,
    count: toNumber(row.count),
  }));
};

export async function getBIOverviewAnalytics(
  input: BIOverviewQueryInput = {},
): Promise<BIOverviewResponse> {
  const filters = resolveBIOverviewFilters(input);
  const retentionEndAt = new Date(
    new Date(filters.endAt).getTime() + RETENTION_LOOKAHEAD_DAYS * DAY_MS,
  ).toISOString();

  const [
    retentionEvents,
    behaviorEvents,
    userPRCountRows,
    prLifecycleCreatedAtStatusRows,
    prLifecycleTimeWindowEndAtStatusRows,
  ] = await Promise.all([
    fetchUserTelemetryEnrichedEvents({
      eventNames: getRetentionEventNames(),
      startAt: filters.startAt,
      endAt: retentionEndAt,
    }),
    fetchUserTelemetryEnrichedEvents({
      eventNames: BI_OVERVIEW_EVENT_NAMES,
      startAt: filters.startAt,
      endAt: filters.endAt,
    }),
    fetchUserPRCountRows(filters.startAt, filters.endAt),
    fetchPRLifecycleStatusRows(filters.startAt, filters.endAt, "created_at"),
    fetchPRLifecycleStatusRows(
      filters.startAt,
      filters.endAt,
      "time_window_end_at",
    ),
  ]);

  return buildBIOverviewResponse({
    filters,
    retentionEvents,
    behaviorEvents,
    userPRCountRows,
    prLifecycleCreatedAtStatusRows,
    prLifecycleTimeWindowEndAtStatusRows,
  });
}

export type { BIOverviewQueryInput, BIOverviewResponse };
