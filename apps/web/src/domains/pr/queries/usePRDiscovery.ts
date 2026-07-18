import { useMutation, useQuery } from "@tanstack/vue-query";
import { computed, type MaybeRefOrGetter, type Ref, toValue } from "vue";
import type { PRDiscoveryRecommendationInput } from "@/domains/pr/contracts";
import { client } from "@/lib/rpc";
import { readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";

const readDiscoveryError = async (response: Response, fallback: string): Promise<Error> => {
  const payload = await readApiErrorPayload(response);
  return new Error(resolveApiErrorMessage(payload, fallback));
};

export const PR_DISCOVERY_VIEW_RESOLUTION_TIMEOUT_MS = 500;

type PRDiscoveryViewResolutionOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
};

export class PRDiscoveryViewResolutionTimeoutError extends Error {
  constructor() {
    super("PR Discovery view resolution timed out");
    this.name = "PRDiscoveryViewResolutionTimeoutError";
  }
}

export const isPRDiscoveryViewResolutionTimeoutError = (
  error: unknown,
): error is PRDiscoveryViewResolutionTimeoutError =>
  error instanceof PRDiscoveryViewResolutionTimeoutError;

/**
 * PR Discovery view resolution is opportunistic. A slow decision must not delay
 * discovery indefinitely, while an actual request failure remains visible to
 * the user so the page can offer an escape back to the catalog.
 */
export const withPRDiscoveryViewResolutionTimeout = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: PRDiscoveryViewResolutionOptions = {},
): Promise<T> => {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const abortFromExternal = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) {
    controller.abort(externalSignal.reason);
  } else {
    externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
  }

  let timedOut = false;
  let timeoutError: PRDiscoveryViewResolutionTimeoutError | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      timeoutError = new PRDiscoveryViewResolutionTimeoutError();
      controller.abort();
      reject(timeoutError);
    }, options.timeoutMs ?? PR_DISCOVERY_VIEW_RESOLUTION_TIMEOUT_MS);
  });
  const operationResult = Promise.resolve()
    .then(() => operation(controller.signal))
    .catch((error: unknown) => {
      if (timedOut && timeoutError) throw timeoutError;
      throw error;
    });
  let rejectExternalAbort: (() => void) | undefined;
  const externalAbort = externalSignal
    ? new Promise<T>((_, reject) => {
        rejectExternalAbort = () => reject(externalSignal.reason);
        if (externalSignal.aborted) {
          rejectExternalAbort();
          return;
        }
        externalSignal.addEventListener("abort", rejectExternalAbort, { once: true });
      })
    : null;
  try {
    return await Promise.race(
      externalAbort ? [operationResult, timeout, externalAbort] : [operationResult, timeout],
    );
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromExternal);
    if (rejectExternalAbort) {
      externalSignal?.removeEventListener("abort", rejectExternalAbort);
    }
  }
};

export const usePRDiscoveryCatalog = () =>
  useQuery({
    queryKey: queryKeys.prDiscovery.catalog(),
    queryFn: async () => {
      const response = await client.api.pr.discovery.catalog.$get();
      if (!response.ok) throw await readDiscoveryError(response, "无法加载 PR 类型");
      return await response.json();
    },
  });

export const usePRDiscoveryTypeDetail = (type: Ref<string | null>) =>
  useQuery({
    queryKey: computed(() => queryKeys.prDiscovery.typeDetail(type.value)),
    queryFn: async () => {
      const value = type.value;
      if (!value) throw new Error("PR 类型不能为空");
      const response = await client.api.pr.discovery.types[":type"].$get({
        param: { type: value },
      });
      if (!response.ok) throw await readDiscoveryError(response, "无法加载 PR 类型");
      return await response.json();
    },
    enabled: () => type.value !== null,
  });

export const usePRDiscoveryView = (
  type: Ref<string | null>,
  enabled: MaybeRefOrGetter<boolean> = () => type.value !== null,
) =>
  useQuery({
    queryKey: computed(() => queryKeys.prDiscovery.viewMode(type.value)),
    queryFn: async ({ signal }) => {
      const value = type.value;
      if (!value) throw new Error("PR 类型不能为空");
      const response = await withPRDiscoveryViewResolutionTimeout(
        (signal) =>
          client.api.pr.discovery.view.$get({ query: { type: value } }, { init: { signal } }),
        { signal },
      );
      if (!response.ok) throw await readDiscoveryError(response, "无法加载发现视图");
      return await response.json();
    },
    enabled: () => type.value !== null && toValue(enabled),
  });

export const usePRDiscoveryDirectory = (type: Ref<string | null>, dates: Ref<readonly string[]>) =>
  useQuery({
    queryKey: computed(() => queryKeys.prDiscovery.directory(type.value, dates.value)),
    queryFn: async () => {
      const value = type.value;
      if (!value) throw new Error("PR 类型不能为空");
      const response = await client.api.pr.discovery.$get({
        query: { type: value, date: [...dates.value] },
      });
      if (!response.ok) throw await readDiscoveryError(response, "无法加载 PR 列表");
      return await response.json();
    },
    enabled: () => type.value !== null,
  });

export type { PRDiscoveryRecommendationInput } from "@/domains/pr/contracts";

export const usePRDiscoveryRecommendation = () =>
  useMutation({
    mutationFn: async (input: PRDiscoveryRecommendationInput) => {
      const response = await client.api.pr.discovery.recommend.$post({ json: input });
      if (!response.ok) throw await readDiscoveryError(response, "无法完成匹配");
      return await response.json();
    },
  });
