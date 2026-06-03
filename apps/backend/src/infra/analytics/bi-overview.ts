import {
  and,
  asc,
  gte,
  inArray,
  isNotNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  factAnchorEventTransitionEvents,
  factUserRetentionActivityEvents,
  factViewOtherAnchorEventsConversionEvents,
  partnerRequests,
  partners,
  type PartnerStatus,
} from "../../entities";
import { db } from "../../lib/db";
import {
  buildBIOverviewResponse,
  resolveBIOverviewFilters,
  type AnchorEventTransitionFactRow,
  type BIOverviewQueryInput,
  type BIOverviewResponse,
  type PRLifecycleStatusInputRow,
  type RetentionActivityFactRow,
  type UserPRCountInputRow,
  type ViewOtherAnchorEventsConversionFactRow,
} from "./bi-overview.model";

type NumericLike = number | string | null | undefined;

type PRLifecycleCohortDimension = "created_at" | "time_window_end_at";

const RETENTION_LOOKAHEAD_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1_000;
const JOINED_PARTNER_STATUSES: PartnerStatus[] = [
  "JOINED",
  "CONFIRMED",
  "ATTENDED",
];

const toNumber = (value: NumericLike): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const fetchRetentionActivityRows = async (
  startAt: string,
  endAt: string,
): Promise<RetentionActivityFactRow[]> =>
  db
    .select({
      eventId: factUserRetentionActivityEvents.eventId,
      eventName: factUserRetentionActivityEvents.eventName,
      journeyId: factUserRetentionActivityEvents.journeyId,
      occurredAt: factUserRetentionActivityEvents.occurredAt,
      identityKey: factUserRetentionActivityEvents.identityKey,
    })
    .from(factUserRetentionActivityEvents)
    .where(
      and(
        gte(factUserRetentionActivityEvents.occurredAt, new Date(startAt)),
        lt(factUserRetentionActivityEvents.occurredAt, new Date(endAt)),
      ),
    )
    .orderBy(
      asc(factUserRetentionActivityEvents.occurredAt),
      asc(factUserRetentionActivityEvents.eventId),
    );

const fetchAnchorEventTransitionRows = async (
  startAt: string,
  endAt: string,
): Promise<AnchorEventTransitionFactRow[]> =>
  db
    .select({
      eventId: factAnchorEventTransitionEvents.eventId,
      journeyId: factAnchorEventTransitionEvents.journeyId,
      occurredAt: factAnchorEventTransitionEvents.occurredAt,
      identityKey: factAnchorEventTransitionEvents.identityKey,
      activityType: factAnchorEventTransitionEvents.activityType,
    })
    .from(factAnchorEventTransitionEvents)
    .where(
      and(
        gte(factAnchorEventTransitionEvents.occurredAt, new Date(startAt)),
        lt(factAnchorEventTransitionEvents.occurredAt, new Date(endAt)),
      ),
    )
    .orderBy(
      asc(factAnchorEventTransitionEvents.occurredAt),
      asc(factAnchorEventTransitionEvents.eventId),
    );

const fetchViewOtherAnchorEventRows = async (
  startAt: string,
  endAt: string,
): Promise<ViewOtherAnchorEventsConversionFactRow[]> =>
  db
    .select({
      eventId: factViewOtherAnchorEventsConversionEvents.eventId,
      eventName: factViewOtherAnchorEventsConversionEvents.eventName,
      journeyId: factViewOtherAnchorEventsConversionEvents.journeyId,
      occurredAt: factViewOtherAnchorEventsConversionEvents.occurredAt,
      identityKey: factViewOtherAnchorEventsConversionEvents.identityKey,
    })
    .from(factViewOtherAnchorEventsConversionEvents)
    .where(
      and(
        gte(
          factViewOtherAnchorEventsConversionEvents.occurredAt,
          new Date(startAt),
        ),
        lt(
          factViewOtherAnchorEventsConversionEvents.occurredAt,
          new Date(endAt),
        ),
      ),
    )
    .orderBy(
      asc(factViewOtherAnchorEventsConversionEvents.occurredAt),
      asc(factViewOtherAnchorEventsConversionEvents.eventId),
    );

const fetchUserPRCountRows = async (
  startAt: string,
  endAt: string,
): Promise<UserPRCountInputRow[]> => {
  const [createdRows, joinedRows] = await Promise.all([
    db
      .select({
        userKey: sql<string>`${partnerRequests.createdBy}::text`,
        createdCount: sql<number>`count(*)::int`,
      })
      .from(partnerRequests)
      .where(
        and(
          gte(partnerRequests.createdAt, new Date(startAt)),
          lt(partnerRequests.createdAt, new Date(endAt)),
          isNotNull(partnerRequests.createdBy),
        ),
      )
      .groupBy(partnerRequests.createdBy),
    db
      .select({
        userKey: sql<string>`${partners.userId}::text`,
        joinedCount: sql<number>`count(distinct ${partners.prId})::int`,
      })
      .from(partners)
      .where(
        and(
          gte(partners.createdAt, new Date(startAt)),
          lt(partners.createdAt, new Date(endAt)),
          inArray(partners.status, JOINED_PARTNER_STATUSES),
        ),
      )
      .groupBy(partners.userId),
  ]);

  const rowsByUser = new Map<string, UserPRCountInputRow>();
  for (const row of createdRows) {
    rowsByUser.set(row.userKey, {
      userKey: row.userKey,
      createdCount: toNumber(row.createdCount),
      joinedCount: 0,
    });
  }
  for (const row of joinedRows) {
    const existing = rowsByUser.get(row.userKey);
    if (existing) {
      existing.joinedCount = toNumber(row.joinedCount);
    } else {
      rowsByUser.set(row.userKey, {
        userKey: row.userKey,
        createdCount: 0,
        joinedCount: toNumber(row.joinedCount),
      });
    }
  }

  return Array.from(rowsByUser.values()).sort(
    (left, right) =>
      right.createdCount +
        right.joinedCount -
        (left.createdCount + left.joinedCount) ||
      left.userKey.localeCompare(right.userKey),
  );
};

const fetchPRLifecycleStatusRows = async (
  startAt: string,
  endAt: string,
  dimension: PRLifecycleCohortDimension,
): Promise<PRLifecycleStatusInputRow[]> => {
  const where =
    dimension === "created_at"
      ? and(
          gte(partnerRequests.createdAt, new Date(startAt)),
          lt(partnerRequests.createdAt, new Date(endAt)),
        )
      : sql`${partnerRequests.time}[2] is not null
          and nullif(${partnerRequests.time}[2], '')::timestamp >= ${startAt}::timestamp
          and nullif(${partnerRequests.time}[2], '')::timestamp < ${endAt}::timestamp`;

  const rows = await db
    .select({
      status: partnerRequests.status,
      count: sql<number>`count(*)::int`,
    })
    .from(partnerRequests)
    .where(where as SQL)
    .groupBy(partnerRequests.status)
    .orderBy(asc(partnerRequests.status));

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
    anchorEventTransitionEvents,
    viewOtherAnchorEventEvents,
    userPRCountRows,
    prLifecycleCreatedAtStatusRows,
    prLifecycleTimeWindowEndAtStatusRows,
  ] = await Promise.all([
    fetchRetentionActivityRows(filters.startAt, retentionEndAt),
    fetchAnchorEventTransitionRows(filters.startAt, filters.endAt),
    fetchViewOtherAnchorEventRows(filters.startAt, filters.endAt),
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
    anchorEventTransitionEvents,
    viewOtherAnchorEventEvents,
    userPRCountRows,
    prLifecycleCreatedAtStatusRows,
    prLifecycleTimeWindowEndAtStatusRows,
  });
}

export type { BIOverviewQueryInput, BIOverviewResponse };
