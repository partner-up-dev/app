import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type MaybeRef, unref } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

type AnalyticsApi = typeof adminClient.api.analytics;
type PRDiscoveryFunnelRoute = AnalyticsApi["pr-discovery-funnel"];
type BIOverviewRoute = AnalyticsApi["overview"];
type PRCreateFunnelRoute = AnalyticsApi["pr-create-funnel"];
type PRJoinFunnelRoute = AnalyticsApi["pr-join-funnel"];

export type AdminPRDiscoveryFunnelResponse = InferResponseType<PRDiscoveryFunnelRoute["$get"]>;
export type AdminBIOverviewResponse = InferResponseType<BIOverviewRoute["$get"]>;
export type AdminPRJoinFunnelResponse = InferResponseType<PRJoinFunnelRoute["$get"]>;
export type AdminPRCreateFunnelResponse = InferResponseType<PRCreateFunnelRoute["$get"]>;

export type AdminAnalyticsFunnelQuery = {
  startAt?: string;
  endAt?: string;
  prType?: string | null;
  viewMode?: "FORM" | "CARD" | "LIST" | null;
  origin?: string | null;
};

type AdminAnalyticsQueryOptions = {
  enabled?: MaybeRef<boolean>;
};

const resolveEnabled = (options: AdminAnalyticsQueryOptions | undefined) =>
  computed(() => options?.enabled === undefined || unref(options.enabled));

const readErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const payload = (await response.json()) as {
      detail?: string;
      error?: string;
    };
    return payload.error || payload.detail || fallback;
  } catch {
    return fallback;
  }
};

const normalizeQuery = (input: AdminAnalyticsFunnelQuery): AdminAnalyticsFunnelQuery => ({
  startAt: input.startAt,
  endAt: input.endAt,
  prType: input.prType?.trim() || null,
  viewMode: input.viewMode ?? null,
  origin: input.origin?.trim() || null,
});

const normalizePRFunnelQuery = (
  input: AdminAnalyticsFunnelQuery,
): Pick<AdminAnalyticsFunnelQuery, "startAt" | "endAt"> => ({
  startAt: input.startAt,
  endAt: input.endAt,
});

export const useAdminPRDiscoveryFunnelAnalytics = (
  input: MaybeRef<AdminAnalyticsFunnelQuery>,
  options?: AdminAnalyticsQueryOptions,
) => {
  const normalizedQuery = computed(() => normalizeQuery(unref(input)));

  return useQuery<AdminPRDiscoveryFunnelResponse>({
    enabled: resolveEnabled(options),
    queryKey: computed(() => queryKeys.admin.prDiscoveryFunnelAnalytics(normalizedQuery.value)),
    queryFn: async () => {
      const query = normalizedQuery.value;
      const res = await adminClient.api.analytics["pr-discovery-funnel"].$get({
        query: {
          startAt: query.startAt,
          endAt: query.endAt,
          prType: query.prType ?? undefined,
          viewMode: query.viewMode ?? undefined,
          origin: query.origin ?? undefined,
        },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取 BI 看板数据失败"));
      }
      return await res.json();
    },
  });
};

export const useAdminBIOverviewAnalytics = (
  input: MaybeRef<AdminAnalyticsFunnelQuery>,
  options?: AdminAnalyticsQueryOptions,
) => {
  const normalizedQuery = computed(() => normalizePRFunnelQuery(unref(input)));

  return useQuery<AdminBIOverviewResponse>({
    enabled: resolveEnabled(options),
    queryKey: computed(() => queryKeys.admin.biOverviewAnalytics(normalizedQuery.value)),
    queryFn: async () => {
      const query = normalizedQuery.value;
      const res = await adminClient.api.analytics.overview.$get({
        query: {
          startAt: query.startAt,
          endAt: query.endAt,
        },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取 BI 总览失败"));
      }
      return await res.json();
    },
  });
};

export const useAdminPRJoinFunnelAnalytics = (
  input: MaybeRef<AdminAnalyticsFunnelQuery>,
  options?: AdminAnalyticsQueryOptions,
) => {
  const normalizedQuery = computed(() => normalizePRFunnelQuery(unref(input)));

  return useQuery<AdminPRJoinFunnelResponse>({
    enabled: resolveEnabled(options),
    queryKey: computed(() => queryKeys.admin.prJoinFunnelAnalytics(normalizedQuery.value)),
    queryFn: async () => {
      const query = normalizedQuery.value;
      const res = await adminClient.api.analytics["pr-join-funnel"].$get({
        query: {
          startAt: query.startAt,
          endAt: query.endAt,
        },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取 PR 加入漏斗失败"));
      }
      return await res.json();
    },
  });
};

export const useAdminPRCreateFunnelAnalytics = (
  input: MaybeRef<AdminAnalyticsFunnelQuery>,
  options?: AdminAnalyticsQueryOptions,
) => {
  const normalizedQuery = computed(() => normalizePRFunnelQuery(unref(input)));

  return useQuery<AdminPRCreateFunnelResponse>({
    enabled: resolveEnabled(options),
    queryKey: computed(() => queryKeys.admin.prCreateFunnelAnalytics(normalizedQuery.value)),
    queryFn: async () => {
      const query = normalizedQuery.value;
      const res = await adminClient.api.analytics["pr-create-funnel"].$get({
        query: {
          startAt: query.startAt,
          endAt: query.endAt,
        },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取 PR 创建漏斗失败"));
      }
      return await res.json();
    },
  });
};
