import { computed, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import {
  redirectToWeChatOAuthBind,
  redirectToWeChatOAuthLogin,
} from "@/processes/wechat/oauth-login";
import {
  isWeChatAbilityEnv,
  isWeChatAbilityMockingEnabled,
} from "@/shared/wechat/ability-mocking";
import { useWeChatNotificationSubscriptions } from "@/shared/wechat/queries/useWeChatNotificationSubscriptions";
import { useUpdateWeChatNotificationSubscription } from "@/shared/wechat/queries/useUpdateWeChatNotificationSubscription";
import { useWeChatMiniProgramWebView } from "@/shared/wechat/useWeChatMiniProgramWebView";
import { useWeChatShare } from "@/shared/wechat/useWeChatShare";

export type WeChatNotificationKind =
  | "REMINDER_CONFIRMATION"
  | "ACTIVITY_START_REMINDER"
  | "NEW_PARTNER"
  | "MEETING_POINT_UPDATED"
  | "WAITLIST_PROMOTED"
  | "WAITLIST_ALTERNATIVE_AVAILABLE"
  | "PR_MESSAGE";

type NotificationActionKind =
  | "ADD_ONE"
  | "OPEN_SUBSCRIBE"
  | "SHOW_MINIPROGRAM_WEBVIEW_NOTICE"
  | "LOGIN"
  | "BIND"
  | null;

type OpenSubscribeStatus =
  | "accept"
  | "reject"
  | "cancel"
  | "filter"
  | "unknown";

export type NotificationSubscriptionCardItem = {
  key: WeChatNotificationKind;
  title: string;
  description: string;
  actionLabel: string | null;
  actionKind: NotificationActionKind;
  openSubscribeTemplateId: string | null;
  actionDisabled: boolean;
  pending: boolean;
};

type UseWeChatNotificationSubscriptionsPanelInput = {
  visibleKinds: readonly WeChatNotificationKind[];
};

export const useWeChatNotificationSubscriptionsPanel = ({
  visibleKinds,
}: UseWeChatNotificationSubscriptionsPanelInput) => {
  const { t } = useI18n();
  const query = useWeChatNotificationSubscriptions();
  const mutation = useUpdateWeChatNotificationSubscription();
  const { initWeChatSdk } = useWeChatShare();
  const { isMiniProgramWebView: detectedMiniProgramWebView } =
    useWeChatMiniProgramWebView();
  const openSubscribeReady = ref<boolean>(isWeChatAbilityMockingEnabled());
  const openSubscribePreparing = ref(false);
  const openSubscribeError = ref<string | null>(null);

  let openSubscribeInitPromise: Promise<boolean> | null = null;

  const isWeChatEnv = computed(() =>
    typeof navigator === "undefined" ? false : isWeChatAbilityEnv(),
  );
  const isMiniProgramWebView = computed(() =>
    isWeChatAbilityMockingEnabled() ? false : detectedMiniProgramWebView.value,
  );

  const ensureOpenSubscribeReady = async (): Promise<boolean> => {
    if (isWeChatAbilityMockingEnabled()) {
      openSubscribeReady.value = true;
      openSubscribeError.value = null;
      return true;
    }
    if (!isWeChatEnv.value) {
      openSubscribeReady.value = false;
      return false;
    }
    if (isMiniProgramWebView.value) {
      openSubscribeReady.value = false;
      openSubscribeError.value = t(
        "prPage.notificationSubscriptions.miniProgramWebViewHint",
      );
      return false;
    }
    if (openSubscribeReady.value) {
      return true;
    }
    if (openSubscribeInitPromise) {
      return await openSubscribeInitPromise;
    }

    openSubscribeInitPromise = (async () => {
      openSubscribePreparing.value = true;
      try {
        await initWeChatSdk({
          openTagList: ["wx-open-subscribe"],
        });
        openSubscribeReady.value = true;
        openSubscribeError.value = null;
        return true;
      } catch (error) {
        openSubscribeReady.value = false;
        openSubscribeError.value =
          error instanceof Error ? error.message : t("errors.wechatInitFailed");
        return false;
      } finally {
        openSubscribePreparing.value = false;
        openSubscribeInitPromise = null;
      }
    })();

    return await openSubscribeInitPromise;
  };

  watchEffect(() => {
    if (isWeChatAbilityMockingEnabled()) {
      return;
    }
    if (!isWeChatEnv.value) {
      return;
    }
    if (isMiniProgramWebView.value) {
      return;
    }

    const payload = query.data.value;
    if (
      !payload?.configured ||
      !payload.authenticated ||
      !payload.wechatBound
    ) {
      return;
    }

    const needsOpenSubscribe = visibleKinds.some((kind) => {
      const entry = payload.subscriptions[kind];
      return Boolean(
        entry &&
          entry.configured &&
          entry.requiresOpenSubscribe &&
          entry.templateId,
      );
    });

    if (
      !needsOpenSubscribe ||
      openSubscribeReady.value ||
      openSubscribePreparing.value
    ) {
      return;
    }

    void ensureOpenSubscribeReady();
  });

  const parseOpenSubscribeStatus = (
    detail: unknown,
    templateId: string,
  ): OpenSubscribeStatus => {
    if (isWeChatAbilityMockingEnabled()) {
      return "accept";
    }

    if (!detail || typeof detail !== "object") {
      return "unknown";
    }

    const payload = detail as { subscribeDetails?: unknown };
    if (typeof payload.subscribeDetails !== "string") {
      return "unknown";
    }

    try {
      const rawDetails = JSON.parse(payload.subscribeDetails) as Record<
        string,
        unknown
      >;
      const templateDetailRaw =
        rawDetails[templateId] ?? Object.values(rawDetails)[0] ?? null;
      if (!templateDetailRaw) {
        return "unknown";
      }

      const templateDetail =
        typeof templateDetailRaw === "string"
          ? (JSON.parse(templateDetailRaw) as { status?: unknown })
          : (templateDetailRaw as { status?: unknown });

      const status =
        typeof templateDetail.status === "string"
          ? templateDetail.status.toLowerCase()
          : "";

      if (
        status === "accept" ||
        status === "reject" ||
        status === "cancel" ||
        status === "filter"
      ) {
        return status;
      }
      return "unknown";
    } catch {
      return "unknown";
    }
  };

  const handleAction = async (kind: WeChatNotificationKind): Promise<void> => {
    const item = items.value.find((entry) => entry.key === kind);
    if (!item || !item.actionKind || item.actionDisabled || item.pending) {
      return;
    }
    if (item.actionKind === "LOGIN") {
      if (typeof window !== "undefined") {
        redirectToWeChatOAuthLogin(window.location.href);
      }
      return;
    }

    if (item.actionKind === "BIND") {
      if (typeof window !== "undefined") {
        await redirectToWeChatOAuthBind(window.location.href);
      }
      return;
    }

    if (item.actionKind === "OPEN_SUBSCRIBE") {
      await ensureOpenSubscribeReady();
      return;
    }

    if (item.actionKind === "ADD_ONE") {
      await mutation.mutateAsync({
        kind,
        action: "ADD_ONE",
      });
    }
  };

  const handleOpenSubscribeSuccess = async (
    kind: WeChatNotificationKind,
    detail: unknown,
  ): Promise<void> => {
    const item = items.value.find((entry) => entry.key === kind);
    if (!item || item.actionKind !== "OPEN_SUBSCRIBE" || item.pending) {
      return;
    }

    const templateId = item.openSubscribeTemplateId;
    const status = templateId
      ? parseOpenSubscribeStatus(detail, templateId)
      : "unknown";

    if (status === "accept") {
      await mutation.mutateAsync({
        kind,
        action: "ADD_ONE",
      });
      return;
    }

    if (status === "reject") {
      await mutation.mutateAsync({
        kind,
        action: "CLEAR",
      });
    }
  };

  const handleOpenSubscribeError = async (
    kind: WeChatNotificationKind,
    detail: unknown,
  ): Promise<void> => {
    if (detail && typeof detail === "object") {
      const payload = detail as { errMsg?: unknown; errCode?: unknown };
      const errMsg = typeof payload.errMsg === "string" ? payload.errMsg : "";
      const errCode =
        typeof payload.errCode === "string" ? payload.errCode : "";
      if (errMsg || errCode) {
        openSubscribeError.value = [errCode, errMsg].filter(Boolean).join(": ");
      }
    }
  };

  const resolveItemTitle = (kind: WeChatNotificationKind): string => {
    if (kind === "REMINDER_CONFIRMATION") {
      return t(
        "prPage.notificationSubscriptions.items.REMINDER_CONFIRMATION.title",
      );
    }
    if (kind === "ACTIVITY_START_REMINDER") {
      return t(
        "prPage.notificationSubscriptions.items.ACTIVITY_START_REMINDER.title",
      );
    }
    if (kind === "NEW_PARTNER") {
      return t("prPage.notificationSubscriptions.items.NEW_PARTNER.title");
    }
    if (kind === "MEETING_POINT_UPDATED") {
      return t(
        "prPage.notificationSubscriptions.items.MEETING_POINT_UPDATED.title",
      );
    }
    if (kind === "WAITLIST_PROMOTED") {
      return t(
        "prPage.notificationSubscriptions.items.WAITLIST_PROMOTED.title",
      );
    }
    if (kind === "WAITLIST_ALTERNATIVE_AVAILABLE") {
      return t(
        "prPage.notificationSubscriptions.items.WAITLIST_ALTERNATIVE_AVAILABLE.title",
      );
    }
    return t("prPage.notificationSubscriptions.items.PR_MESSAGE.title");
  };

  const resolveItemEnabledHint = (kind: WeChatNotificationKind): string => {
    if (kind === "REMINDER_CONFIRMATION") {
      return t(
        "prPage.notificationSubscriptions.items.REMINDER_CONFIRMATION.enabledHint",
      );
    }
    if (kind === "ACTIVITY_START_REMINDER") {
      return t(
        "prPage.notificationSubscriptions.items.ACTIVITY_START_REMINDER.enabledHint",
      );
    }
    if (kind === "NEW_PARTNER") {
      return t(
        "prPage.notificationSubscriptions.items.NEW_PARTNER.enabledHint",
      );
    }
    if (kind === "MEETING_POINT_UPDATED") {
      return t(
        "prPage.notificationSubscriptions.items.MEETING_POINT_UPDATED.enabledHint",
      );
    }
    if (kind === "WAITLIST_PROMOTED") {
      return t(
        "prPage.notificationSubscriptions.items.WAITLIST_PROMOTED.enabledHint",
      );
    }
    if (kind === "WAITLIST_ALTERNATIVE_AVAILABLE") {
      return t(
        "prPage.notificationSubscriptions.items.WAITLIST_ALTERNATIVE_AVAILABLE.enabledHint",
      );
    }
    return t("prPage.notificationSubscriptions.items.PR_MESSAGE.enabledHint");
  };

  const resolveItemDisabledHint = (kind: WeChatNotificationKind): string => {
    if (kind === "REMINDER_CONFIRMATION") {
      return t(
        "prPage.notificationSubscriptions.items.REMINDER_CONFIRMATION.disabledHint",
      );
    }
    if (kind === "ACTIVITY_START_REMINDER") {
      return t(
        "prPage.notificationSubscriptions.items.ACTIVITY_START_REMINDER.disabledHint",
      );
    }
    if (kind === "NEW_PARTNER") {
      return t(
        "prPage.notificationSubscriptions.items.NEW_PARTNER.disabledHint",
      );
    }
    if (kind === "MEETING_POINT_UPDATED") {
      return t(
        "prPage.notificationSubscriptions.items.MEETING_POINT_UPDATED.disabledHint",
      );
    }
    if (kind === "WAITLIST_PROMOTED") {
      return t(
        "prPage.notificationSubscriptions.items.WAITLIST_PROMOTED.disabledHint",
      );
    }
    if (kind === "WAITLIST_ALTERNATIVE_AVAILABLE") {
      return t(
        "prPage.notificationSubscriptions.items.WAITLIST_ALTERNATIVE_AVAILABLE.disabledHint",
      );
    }
    return t("prPage.notificationSubscriptions.items.PR_MESSAGE.disabledHint");
  };

  const items = computed<NotificationSubscriptionCardItem[]>(() => {
    const result: NotificationSubscriptionCardItem[] = [];
    const payload = query.data.value;
    const oauthConfigured = payload?.configured ?? false;
    const authenticated = payload?.authenticated ?? false;
    const wechatBound = payload?.wechatBound ?? false;
    const pendingKind = mutation.variables.value?.kind ?? null;

    for (const kind of visibleKinds) {
      const entry = payload?.subscriptions[kind];
      const remainingCount = Math.max(0, entry?.remainingCount ?? 0);
      const enabled = remainingCount > 0;
      const kindConfigured = entry?.configured ?? false;
      const pending = mutation.isPending.value && pendingKind === kind;

      let description = "";
      let actionLabel: string | null = null;
      let actionKind: NotificationActionKind = null;
      let openSubscribeTemplateId: string | null = null;
      let actionDisabled = true;
      const requiresOpenSubscribe = entry?.requiresOpenSubscribe ?? false;
      const templateId = entry?.templateId ?? null;

      if (!oauthConfigured) {
        description = t("prPage.wechatReminder.unconfiguredHint");
      } else if (!isWeChatEnv.value) {
        description = t("prPage.wechatReminder.nonWechatHint");
      } else if (isMiniProgramWebView.value) {
        description = t(
          "prPage.notificationSubscriptions.miniProgramWebViewHint",
        );
        actionLabel = t("prPage.notificationSubscriptions.openInWechatAction");
        actionKind = "SHOW_MINIPROGRAM_WEBVIEW_NOTICE";
        actionDisabled = false;
      } else if (!kindConfigured) {
        if (kind === "NEW_PARTNER") {
          description = t(
            "prPage.notificationSubscriptions.items.NEW_PARTNER.unconfiguredHint",
          );
        } else if (kind === "MEETING_POINT_UPDATED") {
          description = t(
            "prPage.notificationSubscriptions.items.MEETING_POINT_UPDATED.unconfiguredHint",
          );
        } else if (kind === "WAITLIST_PROMOTED") {
          description = t(
            "prPage.notificationSubscriptions.items.WAITLIST_PROMOTED.unconfiguredHint",
          );
        } else if (kind === "WAITLIST_ALTERNATIVE_AVAILABLE") {
          description = t(
            "prPage.notificationSubscriptions.items.WAITLIST_ALTERNATIVE_AVAILABLE.unconfiguredHint",
          );
        } else if (kind === "PR_MESSAGE") {
          description = t(
            "prPage.notificationSubscriptions.items.PR_MESSAGE.unconfiguredHint",
          );
        } else if (kind === "ACTIVITY_START_REMINDER") {
          description = t(
            "prPage.notificationSubscriptions.items.ACTIVITY_START_REMINDER.unconfiguredHint",
          );
        } else if (kind === "REMINDER_CONFIRMATION") {
          description = t("prPage.wechatReminder.unconfiguredHint");
        }
      } else if (!authenticated) {
        description = t("prPage.wechatReminder.loginHint");
        actionLabel = t("prPage.wechatReminder.loginAction");
        actionKind = "LOGIN";
        actionDisabled = false;
      } else if (!wechatBound) {
        description = t("mePage.wechat.unboundHint");
        actionLabel = t("mePage.wechat.bindAction");
        actionKind = "BIND";
        actionDisabled = false;
      } else {
        const itemHint = enabled
          ? resolveItemEnabledHint(kind)
          : resolveItemDisabledHint(kind);
        description = t(
          "prPage.notificationSubscriptions.remainingCountWithHint",
          {
            count: remainingCount,
            hint: itemHint,
          },
        );
        actionLabel = t("prPage.notificationSubscriptions.subscribeOnceAction");

        if (requiresOpenSubscribe && !isWeChatAbilityMockingEnabled()) {
          actionKind = "OPEN_SUBSCRIBE";
          openSubscribeTemplateId = openSubscribeReady.value
            ? templateId
            : null;
          actionDisabled = pending || !templateId;
          if (!templateId) {
            description = t(
              "prPage.notificationSubscriptions.openSubscribeUnavailableHint",
            );
          } else if (!openSubscribeReady.value && openSubscribeError.value) {
            description = t(
              "prPage.notificationSubscriptions.openSubscribeUnavailableHint",
            );
          }
        } else {
          actionKind = "ADD_ONE";
          actionDisabled = pending;
        }
      }

      result.push({
        key: kind,
        title: resolveItemTitle(kind),
        description,
        actionLabel,
        actionKind,
        openSubscribeTemplateId,
        actionDisabled,
        pending,
      });
    }

    return result;
  });

  return {
    isWeChatEnv,
    isMiniProgramWebView,
    items,
    query,
    mutation,
    handleAction,
    handleOpenSubscribeSuccess,
    handleOpenSubscribeError,
  };
};
