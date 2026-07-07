import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";

export type CurrentUserProfileResponse = InferResponseType<
  (typeof client.api.users.me)["$get"]
>;

export const useCurrentUserProfile = () => {
  const userSessionStore = useUserSessionStore();

  return useQuery<CurrentUserProfileResponse>({
    queryKey: queryKeys.user.me(),
    queryFn: async () => {
      const res = await client.api.users.me.$get();
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error || i18n.global.t("errors.fetchCurrentUserProfileFailed"),
        );
      }

      return await res.json();
    },
    enabled: () => userSessionStore.isAuthenticated,
  });
};
