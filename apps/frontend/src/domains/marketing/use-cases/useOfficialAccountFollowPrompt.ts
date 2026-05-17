import { computed, onUnmounted, ref, watch } from "vue";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { useWeChatOfficialAccountFollowStatus } from "@/shared/wechat/queries/useWeChatOfficialAccountFollowStatus";
import { trackEvent } from "@/shared/telemetry/track";

export type OfficialAccountFollowPromptSource =
  | "home"
  | "anchor_event"
  | "pr_join_result"
  | "pr_waitlist_result";

type StoredPromptCooldown = {
  cooldownUntilMs: number;
  source: OfficialAccountFollowPromptSource;
  action: "shown" | "dismissed" | "completed";
  updatedAtMs: number;
};

const STORAGE_KEY = "__partner_up_official_account_follow_prompt_v1__";
const SYNC_ALIGNED_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const isStoredPromptCooldown = (
  value: unknown,
): value is StoredPromptCooldown => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.cooldownUntilMs === "number" &&
    Number.isFinite(record.cooldownUntilMs) &&
    (record.source === "home" ||
      record.source === "anchor_event" ||
      record.source === "pr_join_result" ||
      record.source === "pr_waitlist_result") &&
    (record.action === "shown" ||
      record.action === "dismissed" ||
      record.action === "completed") &&
    typeof record.updatedAtMs === "number" &&
    Number.isFinite(record.updatedAtMs)
  );
};

const readCooldownUntilMs = (): number => {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return 0;
    }
    const parsed = JSON.parse(rawValue) as unknown;
    return isStoredPromptCooldown(parsed) ? parsed.cooldownUntilMs : 0;
  } catch {
    return 0;
  }
};

const writeCooldown = (payload: StoredPromptCooldown): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore localStorage write failures.
  }
};

export const useOfficialAccountFollowPrompt = (
  source: OfficialAccountFollowPromptSource,
) => {
  const userSessionStore = useUserSessionStore();
  const followStatusQuery = useWeChatOfficialAccountFollowStatus();
  const isVisible = ref(false);
  let timerId: number | null = null;

  const isBackendConfirmedFollowed = computed(
    () => followStatusQuery.data.value?.status === "FOLLOWED",
  );
  const isFollowStatusPending = computed(
    () =>
      userSessionStore.isAuthenticated &&
      followStatusQuery.isLoading.value &&
      !followStatusQuery.error.value,
  );
  const isCooldownActiveNow = (): boolean => Date.now() < readCooldownUntilMs();
  const canPromptNow = (): boolean =>
    !isVisible.value &&
    !isBackendConfirmedFollowed.value &&
    !isFollowStatusPending.value &&
    !isCooldownActiveNow();
  const canPrompt = computed(() => canPromptNow());

  const clearTimer = (): void => {
    if (typeof window === "undefined" || timerId === null) {
      return;
    }
    window.clearTimeout(timerId);
    timerId = null;
  };

  const markCooldown = (
    durationMs: number,
    action: StoredPromptCooldown["action"],
  ): void => {
    writeCooldown({
      cooldownUntilMs: Date.now() + durationMs,
      source,
      action,
      updatedAtMs: Date.now(),
    });
  };

  const markPromptPresented = (): void => {
    markCooldown(SYNC_ALIGNED_COOLDOWN_MS, "shown");
    trackEvent("official_account_follow_nudge_shown", {
      source,
    });
  };

  const requestPrompt = (): boolean => {
    if (!canPromptNow()) {
      return false;
    }
    markPromptPresented();
    isVisible.value = true;
    return true;
  };

  const requestPromptAfterDelay = (delayMs: number): void => {
    clearTimer();
    if (typeof window === "undefined") {
      return;
    }
    timerId = window.setTimeout(() => {
      timerId = null;
      requestPrompt();
    }, delayMs);
  };

  const dismissPrompt = (): void => {
    markCooldown(SYNC_ALIGNED_COOLDOWN_MS, "dismissed");
    isVisible.value = false;
    trackEvent("official_account_follow_nudge_action_click", {
      source,
      action: "dismiss",
    });
  };

  const markPromptCompleted = (): void => {
    markCooldown(SYNC_ALIGNED_COOLDOWN_MS, "completed");
    isVisible.value = false;
    trackEvent("official_account_follow_nudge_action_click", {
      source,
      action: "complete",
    });
  };

  watch(isBackendConfirmedFollowed, (followed) => {
    if (followed) {
      isVisible.value = false;
      clearTimer();
    }
  });

  onUnmounted(() => {
    clearTimer();
  });

  return {
    isVisible,
    canPrompt,
    canPromptNow,
    requestPrompt,
    requestPromptAfterDelay,
    markPromptPresented,
    dismissPrompt,
    markPromptCompleted,
  };
};
