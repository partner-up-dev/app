import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

export type WeChatNotificationSubscriptionsResponse = InferResponseType<
  (typeof client.api.wechat.notifications.subscriptions)["$get"]
>;

export const useWeChatNotificationSubscriptions = () =>
  useQuery<WeChatNotificationSubscriptionsResponse>({
    queryKey: queryKeys.wechat.notificationSubscriptions(),
    queryFn: async () => {
      const res = await client.api.wechat.notifications.subscriptions.$get(
        undefined,
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        throw new Error(
          i18n.global.t("errors.fetchWechatReminderSubscriptionFailed"),
        );
      }

      return await res.json();
    },
  });
