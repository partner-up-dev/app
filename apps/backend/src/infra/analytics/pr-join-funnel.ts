import { and, asc, gte, lt } from "drizzle-orm";
import { factPRJoinFunnelEvents } from "../../entities";
import { db } from "../../lib/db";
import {
  buildPRJoinFunnelResponseFromRows,
  type PRJoinFunnelContextStatus,
  type PRJoinFunnelFactRow,
  type PRJoinFunnelQueryInput,
  type PRJoinFunnelResponse,
  resolvePRJoinFunnelFilters,
} from "./pr-join-funnel.model";

type PRJoinFunnelViewRow = {
  eventId: string;
  eventName: string;
  eventVersion: number;
  journeyId: string;
  traceId: string | null;
  occurredAt: Date;
  anonymousId: string | null;
  authenticatedUserHash: string | null;
  routeContextStatus: string;
  authContextStatus: string;
  stepKey: string | null;
};

const toContextStatus = (value: string): PRJoinFunnelContextStatus =>
  value === "context_complete" ? "context_complete" : "context_unknown";

const toFactRow = (row: PRJoinFunnelViewRow): PRJoinFunnelFactRow => ({
  eventId: row.eventId,
  eventName: row.eventName,
  eventVersion: row.eventVersion,
  journeyId: row.journeyId,
  traceId: row.traceId,
  occurredAt: row.occurredAt,
  anonymousId: row.anonymousId,
  authenticatedUserHash: row.authenticatedUserHash,
  routeContextStatus: toContextStatus(row.routeContextStatus),
  authContextStatus: toContextStatus(row.authContextStatus),
  stepKey: row.stepKey,
});

export async function getPRJoinFunnelAnalytics(
  input: PRJoinFunnelQueryInput = {},
): Promise<PRJoinFunnelResponse> {
  const filters = resolvePRJoinFunnelFilters(input);
  const rows = await db
    .select({
      eventId: factPRJoinFunnelEvents.eventId,
      eventName: factPRJoinFunnelEvents.eventName,
      eventVersion: factPRJoinFunnelEvents.eventVersion,
      journeyId: factPRJoinFunnelEvents.journeyId,
      traceId: factPRJoinFunnelEvents.traceId,
      occurredAt: factPRJoinFunnelEvents.occurredAt,
      anonymousId: factPRJoinFunnelEvents.anonymousId,
      authenticatedUserHash: factPRJoinFunnelEvents.authenticatedUserHash,
      routeContextStatus: factPRJoinFunnelEvents.routeContextStatus,
      authContextStatus: factPRJoinFunnelEvents.authContextStatus,
      stepKey: factPRJoinFunnelEvents.stepKey,
    })
    .from(factPRJoinFunnelEvents)
    .where(
      and(
        gte(factPRJoinFunnelEvents.occurredAt, new Date(filters.startAt)),
        lt(factPRJoinFunnelEvents.occurredAt, new Date(filters.endAt)),
      ),
    )
    .orderBy(asc(factPRJoinFunnelEvents.occurredAt), asc(factPRJoinFunnelEvents.eventId));

  return buildPRJoinFunnelResponseFromRows(filters, rows.map(toFactRow));
}

export type { PRJoinFunnelQueryInput, PRJoinFunnelResponse };
