<template>
  <PuPageScaffold content-placement="center" class="contact-author-page">
    <template #header>
      <PageHeader :title="t('contactAuthorPage.title')" />
    </template>

    <PuLoadingState
      v-if="publicConfigQuery.isLoading.value"
      :message="t('common.loading')"
    />

    <ErrorToast
      v-if="publicConfigQuery.error.value"
      :message="
        publicConfigQuery.error.value instanceof Error
          ? publicConfigQuery.error.value.message
          : t('errors.fetchPublicConfigFailed')
      "
      persistent
    />

    <section class="author-body">
      <p class="description">{{ t("contactAuthorPage.description") }}</p>
      <div class="qr-frame">
        <img
          v-if="qrCodeUrl"
          :src="qrCodeUrl"
          :alt="t('contactAuthorPage.qrAlt')"
          class="qr-image"
        />
        <p v-else class="qr-empty">
          {{ t("contactAuthorPage.qrMissing") }}
        </p>
      </div>
    </section>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import { PUBLIC_CONFIG_KEYS, usePublicConfig } from "@/shared/config/queries/usePublicConfig";
import { PuLoadingState, PuPageScaffold } from "@partner-up-dev/design-web";

const DEFAULT_AUTHOR_QR_CODE_URL =
  "https://oss-app.partner-up.cn/5264495b163398842ad04ee5ee42a3df.jpg";

const { t } = useI18n();
const publicConfigQuery = usePublicConfig(PUBLIC_CONFIG_KEYS.authorWechatQrCode);

const normalizeHttpUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const qrCodeUrl = computed(() => {
  if (
    publicConfigQuery.isLoading.value ||
    publicConfigQuery.error.value
  ) {
    return DEFAULT_AUTHOR_QR_CODE_URL;
  }

  return normalizeHttpUrl(publicConfigQuery.data.value?.value) ?? DEFAULT_AUTHOR_QR_CODE_URL;
});

</script>

<style lang="scss" scoped>
.author-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sys-spacing-large);
}

.description {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}

.qr-frame {
  width: min(100%, 280px);
  aspect-ratio: 1 / 1;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sys-spacing-small);
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-empty {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}
</style>
