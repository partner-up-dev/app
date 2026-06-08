<template>
  <PageScaffoldFlow class="user-profile-page">
    <template #header>
      <PageHeader
        :title="t('userProfilePage.title')"
        :subtitle="subtitle"
        :back-fallback-to="backFallbackTo"
      />
    </template>

    <LoadingIndicator
      v-if="isLoading"
      :message="t('userProfilePage.loading')"
    />

    <EmptyState
      v-else-if="isNotFound"
      :title="t('userProfilePage.notFoundTitle')"
      :description="t('userProfilePage.notFoundDescription')"
      icon="i-mdi-account-off-outline"
      tone="outline"
    />

    <ErrorToast
      v-else-if="errorMessage"
      :message="errorMessage"
      persistent
    />

    <SurfaceCard v-else-if="profile" gap="md">
      <div
        v-if="profile.isCurrentLocalUser"
        class="profile-actions"
      >
        <RouterLink class="edit-profile-link" :to="{ name: 'me' }">
          {{ t("userProfilePage.editProfileLink") }}
        </RouterLink>
      </div>

      <div class="profile-row">
        <Avatar
          :src="profile.avatarUrl"
          :alt="t('userProfilePage.avatarAlt', { name: displayName })"
          :name="displayName"
          :fallback="avatarFallbackText"
          size="lg"
          bordered
        />

        <div class="profile-text">
          <span class="nickname-label">{{ t("userProfilePage.nicknameLabel") }}</span>
          <strong class="nickname-value">{{ displayName }}</strong>
        </div>
      </div>
    </SurfaceCard>

    <template #footer>
      <PageFooter variant="minimal" />
    </template>
  </PageScaffoldFlow>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import PageScaffoldFlow from "@/shared/ui/layout/PageScaffoldFlow.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import EmptyState from "@/shared/ui/feedback/EmptyState.vue";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import Avatar from "@/shared/ui/identity/Avatar.vue";
import PageFooter from "@/shared/ui/sections/PageFooter.vue";
import {
  prDetailPath,
} from "@/domains/pr/routing/routes";
import { usePRPartnerProfile } from "@/domains/user/queries/usePRPartnerProfile";

const route = useRoute();
const { t } = useI18n();

const parsePositiveInt = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const prId = computed(() => parsePositiveInt(route.params.id));
const partnerId = computed(() => parsePositiveInt(route.params.partnerId));

const { data, isLoading, error } = usePRPartnerProfile(prId, partnerId);
const profile = computed(() => data.value ?? null);

const subtitle = computed(() => t("userProfilePage.subtitle"));

const displayName = computed(() => {
  const value = profile.value?.displayName?.trim();
  if (value && value.length > 0) return value;
  return t("userProfilePage.nicknameFallback");
});

const avatarFallbackText = computed(() => {
  const trimmed = displayName.value.trim();
  if (trimmed.length > 0) {
    return trimmed.slice(0, 1).toUpperCase();
  }
  return t("userProfilePage.avatarFallback");
});

const isNotFound = computed(() => {
  if (!(error.value instanceof Error)) {
    return false;
  }
  return error.value.message.toLowerCase().includes("not found");
});

const errorMessage = computed(() => {
  if (isNotFound.value) {
    return null;
  }
  if (error.value instanceof Error) {
    return error.value.message;
  }
  return null;
});

const backFallbackTo = computed(() => {
  if (prId.value !== null) {
    return prDetailPath(prId.value as PRId);
  }

  return "/";
});
</script>

<style scoped lang="scss">
.profile-actions {
  display: flex;
  justify-content: flex-end;
}

.edit-profile-link {
  @include mx.pu-font(control);
  color: var(--sys-color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.profile-row {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-medium);
}

.profile-text {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
}

.nickname-label {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.nickname-value {
  @include mx.pu-font(title);
  color: var(--sys-color-on-surface);
  overflow-wrap: anywhere;
}
</style>
