import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";
import {
  readApiErrorPayload,
  resolveApiErrorMessage,
} from "@/shared/api/error";
import { handleWeChatAuthRequiredError } from "@/processes/wechat/auth-error";

type UpdateWeChatReminderSubscriptionInput = {
  enabled: boolean;
};

export const useUpdateWeChatReminderSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enabled }: UpdateWeChatReminderSubscriptionInput) => {
      const res = await client.api.wechat.reminders.subscription.$post(
        {
          json: { enabled },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        if (
          typeof window !== "undefined" &&
          handleWeChatAuthRequiredError(res.status, payload, window.location.href)
        ) {
          throw new Error(
            resolveApiErrorMessage(payload, i18n.global.t("prPage.wechatReminder.loginHint")),
          );
        }

        throw new Error(
          resolveApiErrorMessage(
            payload,
            i18n.global.t("errors.updateWechatReminderSubscriptionFailed"),
          ),
        );
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.wechat.reminderSubscription(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.wechat.notificationSubscriptions(),
      });
    },
  });
};
