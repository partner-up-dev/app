import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";
import { readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";
import { handleWeChatAuthRequiredError } from "@/processes/wechat/auth-error";

type WeChatNotificationKind =
  | "REMINDER_CONFIRMATION"
  | "ACTIVITY_START_REMINDER"
  | "NEW_PARTNER"
  | "MEETING_POINT_UPDATED"
  | "PR_READY"
  | "WAITLIST_PROMOTED"
  | "WAITLIST_ALTERNATIVE_AVAILABLE"
  | "PR_MESSAGE";

type WeChatNotificationAction = "ADD_ONE" | "CLEAR";

type UpdateWeChatNotificationSubscriptionInput = {
  kind: WeChatNotificationKind;
  action: WeChatNotificationAction;
};

export const useUpdateWeChatNotificationSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kind, action }: UpdateWeChatNotificationSubscriptionInput) => {
      const res = await client.api.wechat.notifications.subscriptions.$post(
        {
          json: { kind, action },
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
        queryKey: queryKeys.wechat.notificationSubscriptions(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.wechat.reminderSubscription(),
      });
    },
  });
};
