import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type MaybeRef, unref } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { normalizeFunnelFilters, type AnalyticsFilters } from "../model/filters";
import {
  readAnalyticsErrorMessage,
  resolveAnalyticsEnabled,
  type AnalyticsQueryOptions,
} from "./query-support";

type Route = typeof adminClient.api.analytics.overview;
export type BIOverviewAnalyticsResponse = InferResponseType<Route["$get"]>;

export const useBIOverviewAnalytics = (
  input: MaybeRef<AnalyticsFilters>,
  options?: AnalyticsQueryOptions,
) => {
  const normalizedQuery = computed(() => normalizeFunnelFilters(unref(input)));
  return useQuery<BIOverviewAnalyticsResponse>({
    enabled: resolveAnalyticsEnabled(options),
    queryKey: computed(() => queryKeys.admin.biOverviewAnalytics(normalizedQuery.value)),
    queryFn: async () => {
      const response = await adminClient.api.analytics.overview.$get({
        query: normalizedQuery.value,
      });
      if (!response.ok)
        throw new Error(await readAnalyticsErrorMessage(response, "获取 BI 总览失败"));
      return await response.json();
    },
  });
};
