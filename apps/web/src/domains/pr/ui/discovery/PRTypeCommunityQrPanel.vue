<template>
  <section class="pr-type-community-qr-panel">
    <div class="pr-type-community-qr-panel__summary">
      <span
        class="pr-type-community-qr-panel__icon i-mdi-account-group-outline"
        aria-hidden="true"
      />
      <div class="pr-type-community-qr-panel__text">
        <h3 class="pr-type-community-qr-panel__title">
          {{ t("prDiscovery.typeDetail.communityTitle") }}
        </h3>
        <p class="pr-type-community-qr-panel__description">
          {{ t("prDiscovery.typeDetail.communityDescription") }}
        </p>
      </div>
    </div>

    <div class="pr-type-community-qr-panel__qr-frame">
      <PuImg
        v-if="normalizedQrCodeUrl"
        class="pr-type-community-qr-panel__qr-image"
        :src="normalizedQrCodeUrl"
        :alt="qrAlt"
        mode="aspectFill"
        :show-loading="false"
      />
      <p v-else class="pr-type-community-qr-panel__qr-empty">
        {{ t("prDiscovery.typeDetail.communityQrMissing") }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { PuImg } from "@partner-up-dev/design-web";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { normalizeCommunityQrUrl } from "@/domains/pr/model/pr-type-community";

const props = defineProps<{
  typeTitle: string;
  qrCodeUrl: string | null;
}>();

const { t } = useI18n();
const normalizedQrCodeUrl = computed(() => normalizeCommunityQrUrl(props.qrCodeUrl));
const qrAlt = computed(() =>
  t("prDiscovery.typeDetail.communityQrAlt", {
    typeTitle: props.typeTitle.trim(),
  }),
);
</script>

<style lang="scss" scoped>
.pr-type-community-qr-panel {
  display: grid;
  gap: var(--sys-spacing-medium);
}

.pr-type-community-qr-panel__summary {
  display: flex;
  gap: var(--sys-spacing-small);
  align-items: flex-start;
}

.pr-type-community-qr-panel__icon {
  flex: 0 0 auto;
  color: var(--sys-color-primary);
  @include mx.pu-icon(large, true);
}

.pr-type-community-qr-panel__text {
  min-width: 0;
}

.pr-type-community-qr-panel__title {
  @include mx.pu-font(section);
  margin: 0;
  color: var(--sys-color-on-surface);
}

.pr-type-community-qr-panel__description {
  @include mx.pu-font(body);
  margin: var(--sys-spacing-xsmall) 0 0;
  color: var(--sys-color-on-surface-variant);
}

.pr-type-community-qr-panel__qr-frame {
  display: grid;
  place-items: center;
  min-height: 220px;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
  padding: var(--sys-spacing-small);
}

.pr-type-community-qr-panel__qr-image {
  display: block;
  width: min(100%, 240px);
  aspect-ratio: 1 / 1;
  border-radius: var(--sys-radius-small);
}

.pr-type-community-qr-panel__qr-empty {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}
</style>
