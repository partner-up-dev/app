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

type AnalyticsApi = typeof adminClient.api.analytics;
type CreateRoute = AnalyticsApi["pr-create-funnel"];
type JoinRoute = AnalyticsApi["pr-join-funnel"];
export type PRCreateFunnelAnalyticsResponse = InferResponseType<CreateRoute["$get"]>;
export type PRJoinFunnelAnalyticsResponse = InferResponseType<JoinRoute["$get"]>;

export const usePRCreateFunnelAnalytics = (
  input: MaybeRef<AnalyticsFilters>,
  options?: AnalyticsQueryOptions,
) => {
  const normalizedQuery = computed(() => normalizeFunnelFilters(unref(input)));
  return useQuery<PRCreateFunnelAnalyticsResponse>({
    enabled: resolveAnalyticsEnabled(options),
    queryKey: computed(() => queryKeys.admin.prCreateFunnelAnalytics(normalizedQuery.value)),
    queryFn: async () => {
      const response = await adminClient.api.analytics["pr-create-funnel"].$get({
        query: normalizedQuery.value,
      });
      if (!response.ok)
        throw new Error(await readAnalyticsErrorMessage(response, "获取 PR 创建漏斗失败"));
      return await response.json();
    },
  });
};

export const usePRJoinFunnelAnalytics = (
  input: MaybeRef<AnalyticsFilters>,
  options?: AnalyticsQueryOptions,
) => {
  const normalizedQuery = computed(() => normalizeFunnelFilters(unref(input)));
  return useQuery<PRJoinFunnelAnalyticsResponse>({
    enabled: resolveAnalyticsEnabled(options),
    queryKey: computed(() => queryKeys.admin.prJoinFunnelAnalytics(normalizedQuery.value)),
    queryFn: async () => {
      const response = await adminClient.api.analytics["pr-join-funnel"].$get({
        query: normalizedQuery.value,
      });
      if (!response.ok)
        throw new Error(await readAnalyticsErrorMessage(response, "获取 PR 加入漏斗失败"));
      return await response.json();
    },
  });
};
