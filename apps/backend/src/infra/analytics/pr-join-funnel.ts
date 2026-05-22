import {
  PR_JOIN_FUNNEL_EVENT_NAMES,
  buildPRJoinFunnelResponseFromRows,
  resolvePRJoinFunnelFilters,
  type PRJoinFunnelQueryInput,
  type PRJoinFunnelResponse,
} from "./pr-join-funnel.model";
import { fetchUserTelemetryEnrichedEvents } from "./user-event-projection";

export async function getPRJoinFunnelAnalytics(
  input: PRJoinFunnelQueryInput = {},
): Promise<PRJoinFunnelResponse> {
  const filters = resolvePRJoinFunnelFilters(input);
  const rows = await fetchUserTelemetryEnrichedEvents({
    eventNames: PR_JOIN_FUNNEL_EVENT_NAMES,
    startAt: filters.startAt,
    endAt: filters.endAt,
  });

  return buildPRJoinFunnelResponseFromRows(filters, rows);
}

export type { PRJoinFunnelQueryInput, PRJoinFunnelResponse };
