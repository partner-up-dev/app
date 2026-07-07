import { computed, type Ref } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import { useI18n } from "vue-i18n";
import { useWeChatReminderSubscription } from "@/shared/wechat/queries/useWeChatReminderSubscription";
import { useUpdateWeChatReminderSubscription } from "@/shared/wechat/queries/useUpdateWeChatReminderSubscription";
import { redirectToWeChatOAuthLogin } from "@/processes/wechat/oauth-login";
import { isWeChatAbilityEnv } from "@/shared/wechat/ability-mocking";

export const usePRReminderSubscription = (id: Ref<PRId | null>) => {
  const { t } = useI18n();
  const wechatReminderSubscriptionQuery = useWeChatReminderSubscription();
  const updateWechatReminderSubscriptionMutation =
    useUpdateWeChatReminderSubscription();

  const isWeChatEnv = computed(() =>
    typeof navigator === "undefined" ? false : isWeChatAbilityEnv(),
  );
  const reminderConfigured = computed(
    () => wechatReminderSubscriptionQuery.data.value?.configured ?? false,
  );
  const reminderAuthenticated = computed(
    () => wechatReminderSubscriptionQuery.data.value?.authenticated ?? false,
  );
  const reminderEnabled = computed(
    () => wechatReminderSubscriptionQuery.data.value?.enabled ?? false,
  );
  const reminderTogglePending = computed(
    () => updateWechatReminderSubscriptionMutation.isPending.value,
  );
  const canToggleReminder = computed(
    () =>
      isWeChatEnv.value &&
      reminderConfigured.value &&
      reminderAuthenticated.value &&
      !wechatReminderSubscriptionQuery.isLoading.value,
  );
  const reminderHintText = computed(() => {
    if (!isWeChatEnv.value) return t("prPage.wechatReminder.nonWechatHint");
    if (!reminderConfigured.value) {
      return t("prPage.wechatReminder.unconfiguredHint");
    }
    if (!reminderAuthenticated.value) {
      return t("prPage.wechatReminder.loginHint");
    }
    return reminderEnabled.value
      ? t("prPage.wechatReminder.enabledHint")
      : t("prPage.wechatReminder.disabledHint");
  });

  const handleToggleWechatReminder = async () => {
    if (id.value === null || !isWeChatEnv.value) return;

    await updateWechatReminderSubscriptionMutation.mutateAsync({
      enabled: !reminderEnabled.value,
    });
  };

  const handleGoWechatLogin = () => {
    if (typeof window === "undefined") return;
    redirectToWeChatOAuthLogin(window.location.href);
  };

  return {
    canToggleReminder,
    handleGoWechatLogin,
    handleToggleWechatReminder,
    isWeChatEnv,
    reminderAuthenticated,
    reminderConfigured,
    reminderEnabled,
    reminderHintText,
    reminderTogglePending,
  };
};
