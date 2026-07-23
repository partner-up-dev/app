import { computed, type MaybeRef, unref } from "vue";

export type AnalyticsQueryOptions = { enabled?: MaybeRef<boolean> };

export const resolveAnalyticsEnabled = (options: AnalyticsQueryOptions | undefined) =>
  computed(() => options?.enabled === undefined || unref(options.enabled));

export const readAnalyticsErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const payload = (await response.json()) as { detail?: string; error?: string };
    return payload.error || payload.detail || fallback;
  } catch {
    return fallback;
  }
};
