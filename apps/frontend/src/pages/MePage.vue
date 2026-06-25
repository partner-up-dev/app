<template>
  <PuPageScaffold class="me-page">
    <template #pageHeader>
      <PuHeader
        :title="t('mePage.title')"
        :subtitle="t('mePage.description')"
        title-as="h1"
      >
        <template #leading>
          <PuButton
            tone="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('common.backToHome')"
            @click="handleBack"
          >
            <template #leading>
              <span class="i-mdi-arrow-left" aria-hidden="true"></span>
            </template>
          </PuButton>
        </template>
      </PuHeader>
    </template>

    <div class="me-page__body">
      <PuInlineNotice
        v-if="bindFeedbackMessage"
        :tone="bindFeedbackCode === 'success' ? 'success' : 'error'"
        :message="bindFeedbackMessage"
      />

      <PuInlineNotice tone="error" v-if="errorMessage" :message="errorMessage" />

      <PuLoadingState
        v-if="
          userSessionStore.isAuthenticated && currentUserQuery.isLoading.value
        "
        :message="t('mePage.loading')"
      />

      <PuCard as="section" gap="md">
        <div class="section-header">
          <div>
            <h2>{{ t("mePage.profile.title") }}</h2>
            <p>{{ t("mePage.profile.description") }}</p>
          </div>
          <PuButton
            v-if="userSessionStore.isAuthenticated"
            class="profile-session-action"
            shape="pill"
            tone="danger" variant="outline"
            size="sm"

            data-testid="me.session.logout"
            :loading="logoutPending"
            @click="handleLogout"
          >
            <template #leading>
              <span class="i-mdi:logout" aria-hidden="true"></span>
            </template>
            {{
              logoutPending
                ? t("mePage.logout.pending")
                : t("mePage.logout.action")
            }}
          </PuButton>
        </div>

        <div class="profile-panel">
          <PuImg
            :src="avatarUrl ?? ''"
            :alt="t('mePage.profile.avatarAlt')"
            :name="currentUser?.nickname ?? undefined"
            :fallback-initial="avatarFallbackText"
            size="xLarge"
            shape="circle"
            :show-loading="false"
          />

          <div class="profile-form">
            <PuFormItem
              :label="t('mePage.profile.nicknameLabel')"
              for-id="me-profile-nickname"
            >
              <input
                id="me-profile-nickname"
                v-model="nicknameDraft"
                class="text-input"
                type="text"
                :placeholder="t('mePage.profile.nicknamePlaceholder')"
                :disabled="!canEditProfile"
                maxlength="40"
                @keydown.enter.prevent="handleSaveNickname"
              />
            </PuFormItem>

            <PuFormItem
              :label="t('mePage.profile.phoneLabel')"
              for-id="me-profile-phone"
            >
              <input
                id="me-profile-phone"
                v-model="phoneDraft"
                class="text-input"
                type="tel"
                data-testid="me.profile.phone.input"
                inputmode="numeric"
                maxlength="11"
                :placeholder="t('mePage.profile.phonePlaceholder')"
                :disabled="!canEditProfile"
                @keydown.enter.prevent="handleSavePhoneNumber"
              />
            </PuFormItem>
            <p v-if="phoneHintText" class="profile-field-hint">
              {{ phoneHintText }}
            </p>

            <div class="profile-actions">
              <PuButton
                shape="pill"
                size="sm"

                :disabled="!canSaveNickname"
                :loading="updateProfileMutation.isPending.value"
                @click="handleSaveNickname"
              >
                {{ t("mePage.profile.saveNickname") }}
              </PuButton>

              <PuButton
                shape="pill"
                size="sm"

                data-testid="me.profile.phone.save"
                :disabled="!canSavePhoneNumber"
                :loading="updatePhoneNumberMutation.isPending.value"
                @click="handleSavePhoneNumber"
              >
                {{ t("mePage.profile.savePhone") }}
              </PuButton>
            </div>

            <PuFileUpload
              v-model="avatarUploadValue"
              class="avatar-upload-control"
              mode="file"
              layout="inline"
              :accept="IMAGE_UPLOAD_ACCEPT"
              :choose-label="t('mePage.profile.changeAvatar')"
              :replace-label="t('mePage.profile.changeAvatar')"
              :drop-label="t('mePage.profile.changeAvatar')"
              :disabled="!canEditProfile || updateAvatarMutation.isPending.value"
              @add="handleAvatarUploadAdd"
              @remove="handleAvatarUploadRemove"
              @reject="handleAvatarUploadReject"
              @update:model-value="handleAvatarUploadUpdate"
            />
            <PuInlineNotice
              v-if="avatarUploadError"
              tone="error"
              :message="avatarUploadError"
            />
          </div>
        </div>

        <div class="profile-meta-list">
          <div class="profile-meta-row profile-meta-row--identity">
            <div class="profile-meta-body">
              <span class="profile-meta-label">
                {{ t("mePage.profile.wechatIdentityLabel") }}
              </span>
              <p>{{ wechatIdentityHintText }}</p>

              <PuTag
                v-if="wechatBound"
                class="wechat-bound-tag"
                tone="primary"
                size="md"
                :text="t('mePage.profile.wechatBound')"
                variant="soft"
                shape="pill"
              />
              <PuButton
                v-else
                class="wechat-identity-action"
                shape="pill"
                size="sm"

                :disabled="wechatIdentityActionDisabled"
                :loading="wechatIdentityActionPending"
                @click="handleStartWeChatIdentity"
              >
                {{ wechatIdentityActionLabel }}
              </PuButton>
            </div>
          </div>

          <div class="profile-meta-row profile-meta-row--compact">
            <div class="profile-meta-body">
              <span class="profile-meta-label">{{
                t("mePage.credentials.userIdLabel")
              }}</span>
              <code class="credential-value">{{ storedUserIdLabel }}</code>
            </div>
            <PuButton
              class="credential-clipboard-action"
              shape="pill"
              tone="neutral" variant="ghost"
              size="sm"

              :disabled="!storedUserId"
              @click="handleCopyCredential(storedUserId)"
            >
              <span class="sr-only">
                {{
                  copiedField === "userId"
                    ? t("common.copied")
                    : t("common.copy")
                }}
              </span>
              <span
                :class="
                  copiedField === 'userId'
                    ? 'i-mdi:check'
                    : 'i-mdi:content-copy'
                "
                aria-hidden="true"
              ></span>
            </PuButton>
          </div>
        </div>
      </PuCard>

      <div class="shortcut-grid">
        <RouterLink class="shortcut-card" :to="{ name: 'pr-mine' }">
          <div class="shortcut-card__text">
            <h2>{{ t("mePage.history.title") }}</h2>
            <p>{{ t("mePage.history.description") }}</p>
          </div>
          <span
            class="shortcut-card__icon i-mdi:arrow-right"
            aria-hidden="true"
          ></span>
        </RouterLink>

        <RouterLink
          class="shortcut-card"
          :to="{ name: 'poi-location-apply', query: { view: 'mine' } }"
        >
          <div class="shortcut-card__text">
            <h2>{{ t("mePage.locationApplications.title") }}</h2>
            <p>{{ t("mePage.locationApplications.description") }}</p>
          </div>
          <span
            class="shortcut-card__icon i-mdi:arrow-right"
            aria-hidden="true"
          ></span>
        </RouterLink>
      </div>

      <template v-if="userSessionStore.isAuthenticated">
        <WeChatNotificationSubscriptionsCard
          :title="t('mePage.reminder.title')"
        >
          <APRNotificationSubscriptions
            :updating-label="t('prPage.wechatReminder.updating')"
            @error-change="handleNotificationSubscriptionErrorChange"
          />
        </WeChatNotificationSubscriptionsCard>

      </template>
    </div>

    <template #footer>
      <PageFooter variant="minimal" />
    </template>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useQueryClient } from "@tanstack/vue-query";
import {
  PuButton,
  PuCard,
  PuFileUpload,
  PuFormItem,
  PuHeader,
  PuImg,
  PuInlineNotice,
  PuLoadingState,
  PuPageScaffold,
  PuTag,
  type PuFileUploadItem,
  type PuFileUploadRejection,
  type PuFileUploadValue,
} from "@partner-up-dev/design-web";
import { IMAGE_UPLOAD_ACCEPT } from "@/shared/upload/useDesignWebImageUpload";
import PageFooter from "@/shared/ui/sections/PageFooter.vue";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";
import WeChatNotificationSubscriptionsCard from "@/shared/ui/sections/WeChatNotificationSubscriptionsCard.vue";
import APRNotificationSubscriptions from "@/shared/ui/sections/APRNotificationSubscriptions.vue";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { useCurrentUserProfile } from "@/domains/user/queries/useCurrentUserProfile";
import { useUpdateCurrentUserProfile } from "@/domains/user/queries/useUpdateCurrentUserProfile";
import { useUpdateCurrentUserAvatar } from "@/domains/user/queries/useUpdateCurrentUserAvatar";
import { useUpdateCurrentUserPhoneNumber } from "@/domains/user/queries/useUpdateCurrentUserPhoneNumber";
import { useStartWeChatBind } from "@/domains/user/queries/useStartWeChatBind";
import { isWeChatBrowser } from "@/shared/browser/isWeChatBrowser";
import { copyToClipboard } from "@/lib/clipboard";
import { redirectToWeChatOAuthLogin } from "@/processes/wechat/oauth-login";
import { resetAuthSessionToFreshAnonymous } from "@/processes/auth/useAuthSessionBootstrap";
import { queryKeys } from "@/shared/api/query-keys";

const route = useRoute();
const { t } = useI18n();
const { handleBack } = useFallbackBack();
const userSessionStore = useUserSessionStore();
const queryClient = useQueryClient();

const currentUserQuery = useCurrentUserProfile();
const updateProfileMutation = useUpdateCurrentUserProfile();
const updateAvatarMutation = useUpdateCurrentUserAvatar();
const updatePhoneNumberMutation = useUpdateCurrentUserPhoneNumber();
const startWeChatBindMutation = useStartWeChatBind();

const avatarUploadValue = ref<PuFileUploadValue>(null);
const avatarUploadError = ref<string | null>(null);
const nicknameDraft = ref("");
const phoneDraft = ref("");
const copiedField = ref<"userId" | null>(null);
const copyErrorMessage = ref<string | null>(null);
const logoutErrorMessage = ref<string | null>(null);
const logoutPending = ref(false);
const notificationSubscriptionsPanelError = ref<Error | null>(null);
const wechatLoginPending = ref(false);

const currentUser = computed(() =>
  userSessionStore.isAuthenticated ? (currentUserQuery.data.value ?? null) : null,
);
const canEditProfile = computed(
  () => userSessionStore.isAuthenticated && currentUser.value !== null,
);
const avatarUrl = computed(() => currentUser.value?.avatar ?? null);
const wechatBound = computed(() => currentUser.value?.wechatBound ?? false);
const storedUserId = computed(() => userSessionStore.userId ?? null);
const storedUserIdLabel = computed(
  () => storedUserId.value ?? t("mePage.credentials.missingUserId"),
);
const isWeChatEnv = computed(() =>
  typeof navigator === "undefined" ? false : isWeChatBrowser(),
);
const bindFeedbackCode = computed(() => {
  const raw = route.query.wechatBind;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return null;
});
const bindFeedbackMessage = computed(() => {
  if (bindFeedbackCode.value === "success") {
    return t("mePage.wechat.bindSuccess");
  }
  if (bindFeedbackCode.value === "conflict") {
    return t("mePage.wechat.bindConflict");
  }
  if (bindFeedbackCode.value === "failed") {
    return t("mePage.wechat.bindFailed");
  }
  return null;
});
const avatarFallbackText = computed(() => {
  const nickname = currentUser.value?.nickname?.trim();
  if (!nickname) return t("mePage.profile.avatarFallback");
  return nickname.slice(0, 1).toUpperCase();
});
const canSaveNickname = computed(() => {
  const normalizedDraft = nicknameDraft.value.trim();
  const normalizedCurrent = currentUser.value?.nickname?.trim() ?? "";
  return (
    canEditProfile.value &&
    normalizedDraft.length > 0 &&
    normalizedDraft !== normalizedCurrent &&
    !updateProfileMutation.isPending.value
  );
});
const normalizedPhoneDraft = computed(() => phoneDraft.value.trim());
const currentPhoneLabel = computed(() => currentUser.value?.phoneMasked ?? "");
const phoneDraftError = computed(() => {
  const value = normalizedPhoneDraft.value;
  if (!value) return null;
  return /^1\d{10}$/.test(value)
    ? null
    : t("mePage.profile.phoneInvalid");
});
const canSavePhoneNumber = computed(() => {
  const value = normalizedPhoneDraft.value;
  const hasPhone = currentUser.value?.hasPhoneNumber ?? false;
  return (
    canEditProfile.value &&
    !phoneDraftError.value &&
    (value.length > 0 || hasPhone) &&
    value !== currentPhoneLabel.value &&
    !updatePhoneNumberMutation.isPending.value
  );
});
const phoneHintText = computed(() => {
  if (phoneDraftError.value) return phoneDraftError.value;
  if (currentUser.value?.phoneMasked) {
    return t("mePage.profile.phoneCurrent", {
      phone: currentUser.value.phoneMasked,
    });
  }
  return t("mePage.profile.phoneHint");
});
const wechatIdentityActionPending = computed(() =>
  userSessionStore.isAuthenticated
    ? startWeChatBindMutation.isPending.value
    : wechatLoginPending.value,
);
const wechatIdentityActionLabel = computed(() =>
  wechatIdentityActionPending.value
    ? t("mePage.wechat.bindingAction")
    : t("mePage.wechat.bindAction"),
);
const wechatIdentityActionDisabled = computed(
  () =>
    wechatBound.value ||
    !isWeChatEnv.value ||
    wechatIdentityActionPending.value ||
    (userSessionStore.isAuthenticated && currentUser.value === null),
);
const wechatIdentityHintText = computed(() => {
  if (wechatBound.value) {
    return t("mePage.wechat.boundHint");
  }
  if (!isWeChatEnv.value) {
    return t("mePage.wechat.nonWechatHint");
  }
  if (!userSessionStore.isAuthenticated) {
    return t("mePage.wechatLogin.wechatHint");
  }
  return t("mePage.wechat.unboundHint");
});

const errorMessage = computed(() => {
  const candidates = [
    currentUserQuery.error.value,
    updateProfileMutation.error.value,
    updateAvatarMutation.error.value,
    updatePhoneNumberMutation.error.value,
    startWeChatBindMutation.error.value,
    notificationSubscriptionsPanelError.value,
  ];

  const firstError = candidates.find((candidate) => candidate instanceof Error);
  if (firstError instanceof Error) {
    return firstError.message;
  }

  return logoutErrorMessage.value ?? copyErrorMessage.value;
});

watch(
  () => currentUser.value?.nickname,
  (nextNickname) => {
    nicknameDraft.value = nextNickname ?? "";
  },
  { immediate: true },
);

const handleSaveNickname = async () => {
  if (!canSaveNickname.value) return;
  await updateProfileMutation.mutateAsync({
    nickname: nicknameDraft.value.trim(),
  });
};

const handleSavePhoneNumber = async () => {
  if (!canSavePhoneNumber.value) return;
  await updatePhoneNumberMutation.mutateAsync({
    phoneNumber: normalizedPhoneDraft.value || null,
  });
  phoneDraft.value = "";
};

const handleAvatarUploadUpdate = (value: PuFileUploadValue) => {
  avatarUploadValue.value = value;
  avatarUploadError.value = null;
};

const handleAvatarUploadAdd = async (
  item: PuFileUploadItem,
): Promise<void> => {
  if (!item.file) {
    avatarUploadValue.value = item;
    return;
  }

  avatarUploadValue.value = {
    ...item,
    status: "uploading",
    message: t("common.loading"),
  };
  avatarUploadError.value = null;

  try {
    await updateAvatarMutation.mutateAsync({ avatar: item.file });
    avatarUploadValue.value = null;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t("errors.updateCurrentUserAvatarFailed");
    avatarUploadError.value = message;
    avatarUploadValue.value = {
      ...item,
      status: "error",
      message,
    };
  }
};

const handleAvatarUploadRemove = () => {
  avatarUploadValue.value = null;
  avatarUploadError.value = null;
};

const handleAvatarUploadReject = (rejections: PuFileUploadRejection[]) => {
  avatarUploadError.value = rejections[0]?.message ?? null;
};

const handleStartWeChatLogin = () => {
  if (typeof window === "undefined") return;
  if (!isWeChatEnv.value || wechatLoginPending.value) return;

  wechatLoginPending.value = true;
  redirectToWeChatOAuthLogin(window.location.href);
};

const handleStartWeChatBind = async () => {
  if (wechatIdentityActionDisabled.value || typeof window === "undefined") {
    return;
  }

  const result = await startWeChatBindMutation.mutateAsync({
    returnTo: window.location.href,
  });
  window.location.assign(result.authorizeUrl);
};

const handleStartWeChatIdentity = async () => {
  if (wechatIdentityActionDisabled.value) return;
  if (!userSessionStore.isAuthenticated) {
    handleStartWeChatLogin();
    return;
  }

  await handleStartWeChatBind();
};

const handleLogout = async () => {
  if (logoutPending.value) return;

  logoutPending.value = true;
  logoutErrorMessage.value = null;

  try {
    await resetAuthSessionToFreshAnonymous();
    queryClient.setQueryData(queryKeys.user.me(), null);
    queryClient.removeQueries({ queryKey: queryKeys.user.me() });
    nicknameDraft.value = "";
    phoneDraft.value = "";
  } catch (error) {
    logoutErrorMessage.value =
      error instanceof Error ? error.message : t("mePage.logout.failed");
  } finally {
    logoutPending.value = false;
  }
};

const handleNotificationSubscriptionErrorChange = (error: Error | null) => {
  notificationSubscriptionsPanelError.value = error;
};

const handleCopyCredential = async (value: string | null) => {
  if (!value) return;

  try {
    await copyToClipboard(value);
    copyErrorMessage.value = null;
    copiedField.value = "userId";
    window.setTimeout(() => {
      if (copiedField.value === "userId") {
        copiedField.value = null;
      }
    }, 1500);
  } catch (error) {
    copyErrorMessage.value =
      error instanceof Error ? error.message : t("common.copyFailed");
  }
};
</script>

<style scoped lang="scss">
.me-page__body {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-large);
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-small);

  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(section);
    color: var(--sys-color-on-surface);
  }

  p {
    margin-top: var(--sys-spacing-xsmall);
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
  }
}

.wechat-bound-tag {
  flex-shrink: 0;
}

.profile-session-action {
  flex-shrink: 0;
}

.profile-panel {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--sys-spacing-medium);
  align-items: center;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.text-input {
  width: 100%;
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.profile-field-hint {
  margin: calc(var(--sys-spacing-xsmall) * -1) 0 0;
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-small);
}

.profile-meta-list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding-top: var(--sys-spacing-small);
  border-top: 1px solid var(--sys-color-outline-variant);
}

.profile-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.profile-meta-row--compact {
  align-items: flex-start;
}

.profile-meta-row--identity {
  align-items: flex-start;
  justify-content: flex-start;
}

.profile-meta-body {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;

  p {
    @include mx.pu-font(support);
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }
}

.profile-meta-label {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.wechat-identity-action {
  margin-top: var(--sys-spacing-xsmall);
  align-self: flex-start;
}

.credential-value {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface);
  overflow-wrap: anywhere;
}

.credential-clipboard-action {
  flex-shrink: 0;
  width: var(--sys-spacing-large);
  min-height: var(--sys-spacing-large);
  padding: 0;

  :deep(.pu-button__content) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  :deep([class^="i-"]),
  :deep([class*=" i-"]) {
    @include mx.pu-icon(small);
  }
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
}

.shortcut-card {
  text-decoration: none;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--sys-spacing-small);
  align-items: start;
  color: inherit;
  min-height: 8rem;
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-medium);
  border: 1px solid var(--sys-color-outline-variant);
  background: var(--sys-color-surface-container);

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 3px;
  }
}

.shortcut-card__text {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;

  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(section);
    color: var(--sys-color-on-surface);
    overflow-wrap: anywhere;
  }

  p {
    @include mx.pu-font(support);
    color: var(--sys-color-on-surface-variant);
    overflow-wrap: anywhere;
  }
}

.shortcut-card__icon {
  display: inline-block;
  @include mx.pu-icon(medium);
  color: var(--sys-color-primary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.avatar-upload-control {
  max-width: 28rem;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
  }

  .profile-session-action {
    align-self: flex-start;
  }

  .profile-panel {
    grid-template-columns: 1fr;
  }

  .profile-panel {
    justify-items: start;
  }

  .profile-meta-row {
    align-items: flex-start;
  }
}
</style>
