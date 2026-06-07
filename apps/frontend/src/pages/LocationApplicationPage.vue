<template>
  <PageScaffoldFlow class="location-application-page">
    <template #header>
      <PageHeader
        :title="t('locationApplicationPage.title')"
        :subtitle="t('locationApplicationPage.subtitle')"
        :back-fallback-to="backFallbackTo"
      />
    </template>

    <div class="location-application-page__main">
      <InlineNotice
        v-if="submitSuccessTitle"
        tone="success"
        :message="submitSuccessTitle"
      />
      <ErrorToast v-if="pageError" :message="pageError" persistent />

      <SurfaceCard gap="md">
        <form class="application-form" @submit.prevent="handleSubmit">
          <FormField
            :label="t('locationApplicationPage.nameLabel')"
            for-id="location-application-name"
            required
          >
            <input
              id="location-application-name"
              v-model="titleDraft"
              class="text-input"
              type="text"
              maxlength="80"
              :placeholder="t('locationApplicationPage.namePlaceholder')"
            />
          </FormField>

          <FormField
            :label="t('locationApplicationPage.imageLabel')"
            for-id="location-application-image-url"
            :hint="imageHint"
            required
          >
            <ImageUrlInput
              v-model="imageUrlDraft"
              v-model:uploading="isUploadingImage"
              input-id="location-application-image-url"
              purpose="poi"
              :placeholder="t('locationApplicationPage.imageUrlPlaceholder')"
              :upload-label="t('locationApplicationPage.pickImageAction')"
              :uploading-label="t('common.loading')"
              :preview-alt="t('locationApplicationPage.imagePreviewAlt')"
              :allow-url-input="false"
            />
          </FormField>

          <Button
            appearance="rect"
            size="lg"
            type="submit"
            :disabled="!canSubmit"
            :loading="submitMutation.isPending.value"
          >
            {{ t("locationApplicationPage.submitAction") }}
          </Button>
        </form>
      </SurfaceCard>

      <SurfaceCard gap="md">
        <div class="section-header">
          <div>
            <h2>{{ t("locationApplicationPage.mineTitle") }}</h2>
            <p>{{ t("locationApplicationPage.mineSubtitle") }}</p>
          </div>
        </div>

        <LoadingIndicator
          v-if="applicationsQuery.isLoading.value"
          :message="t('common.loading')"
        />
        <p v-else-if="applications.length === 0" class="empty-text">
          {{ t("locationApplicationPage.emptyMine") }}
        </p>
        <div v-else class="application-list">
          <article
            v-for="application in applications"
            :key="application.id"
            class="application-card"
          >
            <img
              v-if="application.imageUrl"
              class="application-card__image"
              :src="application.imageUrl"
              :alt="application.title"
            />
            <div class="application-card__copy">
              <div class="application-card__title-row">
                <h3>{{ application.title }}</h3>
                <Chip :tone="statusChipTone(application.status)" size="sm">
                  {{ statusLabel(application.status) }}
                </Chip>
              </div>
              <p class="application-card__meta">
                {{ formatCreatedAt(application.createdAt) }}
              </p>
              <p v-if="application.rejectReason" class="application-card__reason">
                {{ application.rejectReason }}
              </p>
            </div>
          </article>
        </div>
      </SurfaceCard>
    </div>
  </PageScaffoldFlow>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, type RouteLocationRaw } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PageScaffoldFlow from "@/shared/ui/layout/PageScaffoldFlow.vue";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import FormField from "@/shared/ui/forms/FormField.vue";
import Button from "@/shared/ui/actions/Button.vue";
import Chip from "@/shared/ui/display/Chip.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ImageUrlInput from "@/shared/upload/ImageUrlInput.vue";
import {
  useMyPoiApplications,
  useSubmitPoiApplication,
} from "@/shared/poi/queries/usePoiApplications";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";

type PoiApplicationStatus = "PENDING" | "PUBLISHED" | "REJECTED";

const { t } = useI18n();
const route = useRoute();
const sessionReady = ref(false);
const titleDraft = ref("");
const imageUrlDraft = ref("");
const isUploadingImage = ref(false);
const submitSuccessTitle = ref<string | null>(null);

const applicationsQuery = useMyPoiApplications(sessionReady);
const submitMutation = useSubmitPoiApplication();

const fromEventQuery = computed(() => {
  const value = route.query.fromEvent;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return value;
  }
  return null;
});

const backFallbackTo = computed<RouteLocationRaw>(() =>
  fromEventQuery.value
    ? {
        name: "anchor-event-landing",
        params: {
          eventId: fromEventQuery.value,
        },
      }
    : { name: "me" },
);

const applications = computed(() => applicationsQuery.data.value ?? []);
const normalizedTitle = computed(() => titleDraft.value.trim());
const imageUrl = computed(() => imageUrlDraft.value.trim() || null);
const canSubmit = computed(
  () =>
    normalizedTitle.value.length > 0 &&
    imageUrl.value !== null &&
    !isUploadingImage.value &&
    !submitMutation.isPending.value,
);
const imageHint = computed(() =>
  imageUrl.value
    ? t("locationApplicationPage.imageReady")
    : t("locationApplicationPage.imageHint"),
);
const pageError = computed(() => {
  const candidates = [
    applicationsQuery.error.value,
    submitMutation.error.value,
  ];
  const first = candidates.find((candidate) => candidate instanceof Error);
  return first instanceof Error ? first.message : null;
});

const handleSubmit = async () => {
  if (!canSubmit.value || !imageUrl.value) {
    return;
  }

  const submitted = await submitMutation.mutateAsync({
    title: normalizedTitle.value,
    imageUrl: imageUrl.value,
  });
  submitSuccessTitle.value = t("locationApplicationPage.submitSuccess", {
    title: submitted.title,
  });
  titleDraft.value = "";
  imageUrlDraft.value = "";
};

const statusLabel = (status: PoiApplicationStatus): string =>
  t(`locationApplicationPage.status.${status}`);

const statusChipTone = (
  status: PoiApplicationStatus,
): "primary" | "secondary" | "danger" =>
  status === "PUBLISHED"
    ? "primary"
    : status === "REJECTED"
      ? "danger"
      : "secondary";

const formatCreatedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

onMounted(async () => {
  await ensureAuthSessionBootstrapped();
  sessionReady.value = true;
});
</script>

<style scoped lang="scss">
.location-application-page__main,
.application-form,
.application-list,
.application-card__copy {
  display: flex;
  flex-direction: column;
}

.location-application-page__main {
  gap: var(--sys-spacing-large);
}

.application-form,
.application-list,
.application-card__copy {
  gap: var(--sys-spacing-medium);
}

.section-header {
  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(section);
  }

  p {
    margin-top: var(--sys-spacing-xsmall);
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
  }
}

.text-input {
  width: 100%;
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.empty-text {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.application-card {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  gap: var(--sys-spacing-small);
  align-items: center;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
}

.application-card__image {
  width: 5.5rem;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container);
}

.application-card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);

  h3 {
    margin: 0;
    @include mx.pu-font(section);
    overflow-wrap: anywhere;
  }
}

.application-card__meta,
.application-card__reason {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}

.application-card__reason {
  color: var(--sys-color-error);
}

@media (max-width: 640px) {
  .application-card {
    grid-template-columns: 1fr;
  }

  .application-card__image {
    width: 100%;
    aspect-ratio: 16 / 9;
  }
}
</style>
