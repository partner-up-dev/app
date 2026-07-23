import { and, asc, eq, gte, lt } from "drizzle-orm";
import { factPRDiscoveryFunnelEvents } from "../../entities";
import { db } from "../../lib/db";
import {
  buildPRDiscoveryFunnelResponseFromRows,
  type PRDiscoveryFunnelFactRow,
  type PRDiscoveryFunnelQueryInput,
  type PRDiscoveryFunnelResponse,
  resolvePRDiscoveryFunnelFilters,
} from "./pr-discovery-funnel.model";

export async function getPRDiscoveryFunnelAnalytics(
  input: PRDiscoveryFunnelQueryInput = {},
): Promise<PRDiscoveryFunnelResponse> {
  const filters = resolvePRDiscoveryFunnelFilters(input);
  const rows = await db
    .select({
      eventId: factPRDiscoveryFunnelEvents.eventId,
      eventName: factPRDiscoveryFunnelEvents.eventName,
      eventVersion: factPRDiscoveryFunnelEvents.eventVersion,
      journeyId: factPRDiscoveryFunnelEvents.journeyId,
      traceId: factPRDiscoveryFunnelEvents.traceId,
      occurredAt: factPRDiscoveryFunnelEvents.occurredAt,
      stepKey: factPRDiscoveryFunnelEvents.stepKey,
      prType: factPRDiscoveryFunnelEvents.prType,
      viewMode: factPRDiscoveryFunnelEvents.viewMode,
      origin: factPRDiscoveryFunnelEvents.origin,
      prId: factPRDiscoveryFunnelEvents.prId,
      rank: factPRDiscoveryFunnelEvents.rank,
      action: factPRDiscoveryFunnelEvents.action,
      outcome: factPRDiscoveryFunnelEvents.outcome,
      handoffReason: factPRDiscoveryFunnelEvents.handoffReason,
      routePath: factPRDiscoveryFunnelEvents.routePath,
      routeName: factPRDiscoveryFunnelEvents.routeName,
      spm: factPRDiscoveryFunnelEvents.spm,
      sourceQr: factPRDiscoveryFunnelEvents.sourceQr,
      routeContextStatus: factPRDiscoveryFunnelEvents.routeContextStatus,
      anonymousId: factPRDiscoveryFunnelEvents.anonymousId,
      authenticatedUserHash: factPRDiscoveryFunnelEvents.authenticatedUserHash,
      authContextStatus: factPRDiscoveryFunnelEvents.authContextStatus,
    })
    .from(factPRDiscoveryFunnelEvents)
    .where(
      and(
        gte(factPRDiscoveryFunnelEvents.occurredAt, new Date(filters.startAt)),
        lt(factPRDiscoveryFunnelEvents.occurredAt, new Date(filters.endAt)),
        ...(filters.prType ? [eq(factPRDiscoveryFunnelEvents.prType, filters.prType)] : []),
        ...(filters.viewMode ? [eq(factPRDiscoveryFunnelEvents.viewMode, filters.viewMode)] : []),
        ...(filters.origin ? [eq(factPRDiscoveryFunnelEvents.origin, filters.origin)] : []),
      ),
    )
    .orderBy(asc(factPRDiscoveryFunnelEvents.occurredAt), asc(factPRDiscoveryFunnelEvents.eventId));

  return buildPRDiscoveryFunnelResponseFromRows(filters, rows as PRDiscoveryFunnelFactRow[]);
}

export type {
  PRDiscoveryFunnelQueryInput,
  PRDiscoveryFunnelResponse,
} from "./pr-discovery-funnel.model";
