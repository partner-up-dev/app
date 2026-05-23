import { and, asc, gte, lt } from "drizzle-orm";
import { factPRCreateFunnelEvents } from "../../entities";
import { db } from "../../lib/db";
import {
  buildPRCreateFunnelResponseFromRows,
  resolvePRCreateFunnelFilters,
  type PRCreateFunnelContextStatus,
  type PRCreateFunnelFactRow,
  type PRCreateFunnelQueryInput,
  type PRCreateFunnelResponse,
  type PRCreatePath,
} from "./pr-create-funnel.model";

type PRCreateFunnelViewRow = {
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
  creationPath: string | null;
};

const toContextStatus = (value: string): PRCreateFunnelContextStatus =>
  value === "context_complete" ? "context_complete" : "context_unknown";

const toCreationPath = (value: string | null): PRCreatePath | null => {
  if (
    value === "form" ||
    value === "event_assisted" ||
    value === "natural_language" ||
    value === "unknown"
  ) {
    return value;
  }
  return null;
};

const toFactRow = (row: PRCreateFunnelViewRow): PRCreateFunnelFactRow => ({
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
  creationPath: toCreationPath(row.creationPath),
});

export async function getPRCreateFunnelAnalytics(
  input: PRCreateFunnelQueryInput = {},
): Promise<PRCreateFunnelResponse> {
  const filters = resolvePRCreateFunnelFilters(input);
  const rows = await db
    .select({
      eventId: factPRCreateFunnelEvents.eventId,
      eventName: factPRCreateFunnelEvents.eventName,
      eventVersion: factPRCreateFunnelEvents.eventVersion,
      journeyId: factPRCreateFunnelEvents.journeyId,
      traceId: factPRCreateFunnelEvents.traceId,
      occurredAt: factPRCreateFunnelEvents.occurredAt,
      anonymousId: factPRCreateFunnelEvents.anonymousId,
      authenticatedUserHash: factPRCreateFunnelEvents.authenticatedUserHash,
      routeContextStatus: factPRCreateFunnelEvents.routeContextStatus,
      authContextStatus: factPRCreateFunnelEvents.authContextStatus,
      stepKey: factPRCreateFunnelEvents.stepKey,
      creationPath: factPRCreateFunnelEvents.creationPath,
    })
    .from(factPRCreateFunnelEvents)
    .where(
      and(
        gte(factPRCreateFunnelEvents.occurredAt, new Date(filters.startAt)),
        lt(factPRCreateFunnelEvents.occurredAt, new Date(filters.endAt)),
      ),
    )
    .orderBy(
      asc(factPRCreateFunnelEvents.occurredAt),
      asc(factPRCreateFunnelEvents.eventId),
    );

  return buildPRCreateFunnelResponseFromRows(filters, rows.map(toFactRow));
}

export type { PRCreateFunnelQueryInput, PRCreateFunnelResponse };
