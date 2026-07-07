import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { queryKeys } from "@/shared/api/query-keys";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";

export type WeChatOfficialAccountFollowStatusResponse = InferResponseType<
  (typeof client.api.wechat)["official-account"]["follow-status"]["$get"]
>;

export const useWeChatOfficialAccountFollowStatus = () => {
  const userSessionStore = useUserSessionStore();

  return useQuery<WeChatOfficialAccountFollowStatusResponse>({
    queryKey: queryKeys.wechat.officialAccountFollowStatus(),
    queryFn: async () => {
      const res =
        await client.api.wechat["official-account"]["follow-status"].$get(
          undefined,
          {
            init: {
              credentials: "include",
            },
          },
        );

      if (!res.ok) {
        throw new Error(
          i18n.global.t(
            "errors.fetchWechatOfficialAccountFollowStatusFailed",
          ),
        );
      }

      return await res.json();
    },
    enabled: () => userSessionStore.isAuthenticated,
  });
};
