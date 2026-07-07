<template>
  <PuModal :open="open" :title="title" max-width="420px" @close="emit('close')">
    <div class="support-contact-qr-modal">
      <p class="support-contact-qr-modal__description">
        {{ description }}
      </p>

      <div class="support-contact-qr-modal__qr">
        <img
          v-if="qrCodeDataUrl"
          :src="qrCodeDataUrl"
          :alt="qrAlt"
          class="support-contact-qr-modal__qr-image"
        />
        <p v-else class="support-contact-qr-modal__qr-empty">
          {{ qrCodeError ?? missingText }}
        </p>
      </div>

      <p v-if="targetUrl" class="support-contact-qr-modal__url">
        {{ targetUrl }}
      </p>

      <PuButton shape="rect" block @click="emit('close')">
        {{ t("common.close") }}
      </PuButton>
    </div>
  </PuModal>
</template>

<script setup lang="ts">
import { PuButton, PuModal } from "@partner-up-dev/design-web";
import { computed, toRef } from "vue";
import { useI18n } from "vue-i18n";
import { useQrCodeDataUrl } from "@/shared/wechat/useQrCodeDataUrl";

const props = defineProps<{
  open: boolean;
  title: string;
  description: string;
  targetUrl: string;
  qrAlt: string;
  missingText: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const openRef = toRef(props, "open");
const targetUrlRef = toRef(props, "targetUrl");
const { qrCodeDataUrl, qrCodeError } = useQrCodeDataUrl(openRef, targetUrlRef);
</script>

<style scoped lang="scss">
.support-contact-qr-modal {
  display: grid;
  justify-items: center;
  gap: var(--sys-spacing-small);
}

.support-contact-qr-modal__description,
.support-contact-qr-modal__qr-empty {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}

.support-contact-qr-modal__qr {
  display: grid;
  place-items: center;
  width: min(100%, 280px);
  aspect-ratio: 1;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container-lowest);
}

.support-contact-qr-modal__qr-image {
  width: min(100%, 260px);
  border-radius: var(--sys-radius-small);
}

.support-contact-qr-modal__url {
  @include mx.pu-font(control);
  width: 100%;
  margin: 0;
  padding: var(--sys-spacing-xsmall);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-high);
  color: var(--sys-color-on-surface-variant);
  overflow-wrap: anywhere;
}

.support-contact-qr-modal :deep(.pu-button) {
  width: 100%;
}
</style>
