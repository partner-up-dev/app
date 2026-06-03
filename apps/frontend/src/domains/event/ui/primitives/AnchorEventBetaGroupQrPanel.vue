<template>
  <section
    class="beta-group-qr-panel"
    data-testid="pr-detail.beta-group.panel"
  >
    <div class="beta-group-qr-panel__copy">
      <span
        class="beta-group-qr-panel__icon i-mdi-account-group-outline"
        aria-hidden="true"
      ></span>
      <div class="beta-group-qr-panel__text">
        <h3 class="beta-group-qr-panel__title">
          {{ t("prPage.betaGroupEntry.title") }}
        </h3>
        <p class="beta-group-qr-panel__description">
          {{ t("prPage.betaGroupEntry.description") }}
        </p>
      </div>
    </div>

    <div class="beta-group-qr-panel__qr-frame">
      <img
        v-if="normalizedQrCodeUrl"
        :src="normalizedQrCodeUrl"
        :alt="qrAlt"
        class="beta-group-qr-panel__qr-image"
      />
      <p v-else class="beta-group-qr-panel__qr-empty">
        {{ t("prPage.betaGroupEntry.qrMissing") }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  eventTitle: string;
  qrCodeUrl: string | null;
}>();

const { t } = useI18n();

const normalizeHttpUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const normalizedQrCodeUrl = computed(() => normalizeHttpUrl(props.qrCodeUrl));
const qrAlt = computed(() =>
  t("prPage.betaGroupEntry.qrAlt", { eventTitle: props.eventTitle }),
);
</script>

<style lang="scss" scoped>
.beta-group-qr-panel {
  display: grid;
  gap: var(--sys-spacing-medium);
}

.beta-group-qr-panel__copy {
  display: flex;
  gap: var(--sys-spacing-small);
  align-items: flex-start;
}

.beta-group-qr-panel__icon {
  flex: 0 0 auto;
  color: var(--sys-color-primary);
  @include mx.pu-icon(large, true);
}

.beta-group-qr-panel__text {
  min-width: 0;
}

.beta-group-qr-panel__title {
  @include mx.pu-font(title-small);
  margin: 0;
  color: var(--sys-color-on-surface);
}

.beta-group-qr-panel__description {
  @include mx.pu-font(body-medium);
  margin: var(--sys-spacing-xsmall) 0 0;
  color: var(--sys-color-on-surface-variant);
}

.beta-group-qr-panel__qr-frame {
  display: grid;
  place-items: center;
  min-height: 220px;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
  padding: var(--sys-spacing-small);
}

.beta-group-qr-panel__qr-image {
  width: min(100%, 240px);
  border-radius: var(--sys-radius-small);
}

.beta-group-qr-panel__qr-empty {
  @include mx.pu-font(body-medium);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}
</style>
