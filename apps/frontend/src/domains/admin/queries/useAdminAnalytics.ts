import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import type { AnchorEventAnalyticsRenderedMode } from "@partner-up-dev/backend";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

type AnalyticsApi = typeof adminClient.api.analytics;
type AnchorEventFunnelRoute = AnalyticsApi["anchor-event-funnel"];
type PRCreateFunnelRoute = AnalyticsApi["pr-create-funnel"];
type PRJoinFunnelRoute = AnalyticsApi["pr-join-funnel"];

export type AdminAnalyticsFunnelResponse = InferResponseType<
  AnchorEventFunnelRoute["$get"]
>;
export type AdminPRJoinFunnelResponse = InferResponseType<
  PRJoinFunnelRoute["$get"]
>;
export type AdminPRCreateFunnelResponse = InferResponseType<
  PRCreateFunnelRoute["$get"]
>;

export type AdminAnalyticsFunnelQuery = {
  startAt?: string;
  endAt?: string;
  eventId?: number | null;
  spm?: string | null;
  sourceQr?: string | null;
  assignmentRevision?: string | null;
  renderedMode?: AnchorEventAnalyticsRenderedMode | null;
};

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
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

const normalizeQuery = (
  input: AdminAnalyticsFunnelQuery,
): AdminAnalyticsFunnelQuery => ({
  startAt: input.startAt,
  endAt: input.endAt,
  eventId: input.eventId ?? null,
  spm: input.spm?.trim() || null,
  sourceQr: input.sourceQr?.trim() || null,
  assignmentRevision: input.assignmentRevision?.trim() || null,
  renderedMode: input.renderedMode ?? null,
});

const normalizePRFunnelQuery = (
  input: AdminAnalyticsFunnelQuery,
): Pick<AdminAnalyticsFunnelQuery, "startAt" | "endAt"> => ({
  startAt: input.startAt,
  endAt: input.endAt,
});

export const useAdminAnchorEventFunnelAnalytics = (
  input: MaybeRef<AdminAnalyticsFunnelQuery>,
) => {
  const normalizedQuery = computed(() => normalizeQuery(unref(input)));

  return useQuery<AdminAnalyticsFunnelResponse>({
    queryKey: computed(() =>
      queryKeys.admin.anchorEventFunnelAnalytics(normalizedQuery.value),
    ),
    queryFn: async () => {
      const query = normalizedQuery.value;
      const res = await adminClient.api.analytics["anchor-event-funnel"].$get({
        query: {
          startAt: query.startAt,
          endAt: query.endAt,
          eventId:
            query.eventId === null || query.eventId === undefined
              ? undefined
              : query.eventId.toString(),
          spm: query.spm ?? undefined,
          sourceQr: query.sourceQr ?? undefined,
          assignmentRevision: query.assignmentRevision ?? undefined,
          renderedMode: query.renderedMode ?? undefined,
        },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取 BI 看板数据失败"));
      }
      return await res.json();
    },
  });
};

export const useAdminPRJoinFunnelAnalytics = (
  input: MaybeRef<AdminAnalyticsFunnelQuery>,
) => {
  const normalizedQuery = computed(() =>
    normalizePRFunnelQuery(unref(input)),
  );

  return useQuery<AdminPRJoinFunnelResponse>({
    queryKey: computed(() =>
      queryKeys.admin.prJoinFunnelAnalytics(normalizedQuery.value),
    ),
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
) => {
  const normalizedQuery = computed(() =>
    normalizePRFunnelQuery(unref(input)),
  );

  return useQuery<AdminPRCreateFunnelResponse>({
    queryKey: computed(() =>
      queryKeys.admin.prCreateFunnelAnalytics(normalizedQuery.value),
    ),
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
