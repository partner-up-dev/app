import {
  PR_CREATE_FUNNEL_EVENT_NAMES,
  buildPRCreateFunnelResponseFromRows,
  resolvePRCreateFunnelFilters,
  type PRCreateFunnelQueryInput,
  type PRCreateFunnelResponse,
} from "./pr-create-funnel.model";
import { fetchUserTelemetryEnrichedEvents } from "./user-event-projection";

export async function getPRCreateFunnelAnalytics(
  input: PRCreateFunnelQueryInput = {},
): Promise<PRCreateFunnelResponse> {
  const filters = resolvePRCreateFunnelFilters(input);
  const rows = await fetchUserTelemetryEnrichedEvents({
    eventNames: PR_CREATE_FUNNEL_EVENT_NAMES,
    startAt: filters.startAt,
    endAt: filters.endAt,
  });

  return buildPRCreateFunnelResponseFromRows(filters, rows);
}

export type { PRCreateFunnelQueryInput, PRCreateFunnelResponse };
