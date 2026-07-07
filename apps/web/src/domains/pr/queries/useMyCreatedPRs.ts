import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";

export type MyCreatedPRsResponse = InferResponseType<
  (typeof client.api.pr.mine.created)["$get"]
>;

export const useMyCreatedPRs = () => {
  const userSessionStore = useUserSessionStore();

  return useQuery<MyCreatedPRsResponse>({
    queryKey: queryKeys.pr.mineCreated(),
    queryFn: async () => {
      const res = await client.api.pr.mine.created.$get();
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error || i18n.global.t("errors.fetchMyCreatedRequestsFailed"),
        );
      }

      return await res.json();
    },
    enabled: () => userSessionStore.isAuthenticated,
  });
};
