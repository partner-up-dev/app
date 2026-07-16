import { and, asc, gte, inArray, lt } from "drizzle-orm";
import { userTelemetryEvents } from "../../entities";
import { db } from "../../lib/db";
import {
  buildPRDiscoveryFunnelResponseFromRows,
  PR_DISCOVERY_EVENT_NAMES,
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
      eventName: userTelemetryEvents.eventName,
      eventVersion: userTelemetryEvents.eventVersion,
      journeyId: userTelemetryEvents.journeyId,
      occurredAt: userTelemetryEvents.occurredAt,
      payload: userTelemetryEvents.payload,
    })
    .from(userTelemetryEvents)
    .where(
      and(
        inArray(userTelemetryEvents.eventName, [...PR_DISCOVERY_EVENT_NAMES]),
        gte(userTelemetryEvents.occurredAt, new Date(filters.startAt)),
        lt(userTelemetryEvents.occurredAt, new Date(filters.endAt)),
      ),
    )
    .orderBy(asc(userTelemetryEvents.occurredAt));

  return buildPRDiscoveryFunnelResponseFromRows(filters, rows as PRDiscoveryFunnelFactRow[]);
}

export type {
  PRDiscoveryFunnelQueryInput,
  PRDiscoveryFunnelResponse,
} from "./pr-discovery-funnel.model";
