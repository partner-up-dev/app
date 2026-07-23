import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type MaybeRef, unref } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { normalizeAnalyticsFilters, type AnalyticsFilters } from "../model/filters";
import {
  readAnalyticsErrorMessage,
  resolveAnalyticsEnabled,
  type AnalyticsQueryOptions,
} from "./query-support";

type Route = (typeof adminClient.api.analytics)["pr-discovery-funnel"];
export type PRDiscoveryAnalyticsResponse = InferResponseType<Route["$get"]>;

export const usePRDiscoveryAnalytics = (
  input: MaybeRef<AnalyticsFilters>,
  options?: AnalyticsQueryOptions,
) => {
  const normalizedQuery = computed(() => normalizeAnalyticsFilters(unref(input)));
  return useQuery<PRDiscoveryAnalyticsResponse>({
    enabled: resolveAnalyticsEnabled(options),
    queryKey: computed(() => queryKeys.admin.prDiscoveryFunnelAnalytics(normalizedQuery.value)),
    queryFn: async () => {
      const query = normalizedQuery.value;
      const response = await adminClient.api.analytics["pr-discovery-funnel"].$get({
        query: {
          startAt: query.startAt,
          endAt: query.endAt,
          prType: query.prType ?? undefined,
          viewMode: query.viewMode ?? undefined,
          origin: query.origin ?? undefined,
        },
      });
      if (!response.ok)
        throw new Error(await readAnalyticsErrorMessage(response, "获取 BI 看板数据失败"));
      return await response.json();
    },
  });
};
