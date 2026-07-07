import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

export type WeChatReminderSubscriptionResponse = InferResponseType<
  (typeof client.api.wechat.reminders.subscription)["$get"]
>;

export const useWeChatReminderSubscription = () =>
  useQuery<WeChatReminderSubscriptionResponse>({
    queryKey: queryKeys.wechat.reminderSubscription(),
    queryFn: async () => {
      const res = await client.api.wechat.reminders.subscription.$get(undefined, {
        init: {
          credentials: "include",
        },
      });

      if (!res.ok) {
        throw new Error(
          i18n.global.t("errors.fetchWechatReminderSubscriptionFailed"),
        );
      }

      return await res.json();
    },
  });

