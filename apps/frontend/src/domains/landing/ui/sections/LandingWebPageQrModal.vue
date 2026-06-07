<template>
  <Modal
    :open="open"
    :title="t('home.bookmarkNudge.webQrModalTitle')"
    max-width="420px"
    @close="emit('close')"
  >
    <div class="landing-web-qr-modal">
      <p class="landing-web-qr-modal__description">
        {{ t("home.bookmarkNudge.webQrModalDescription") }}
      </p>

      <img
        v-if="homePageWechatQrCodeUrl"
        :src="homePageWechatQrCodeUrl"
        :alt="t('home.bookmarkNudge.webQrModalQrAlt')"
        class="landing-web-qr-modal__image"
      />
      <p v-else class="landing-web-qr-modal__empty">
        {{ t("home.bookmarkNudge.webQrModalQrMissing") }}
      </p>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Modal from "@/shared/ui/overlay/Modal.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import { useHomePageWechatQrCode } from "@/shared/wechat/useHomePageWechatQrCode";

interface Props {
  open: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();
const { t } = useI18n();
const { homePageWechatQrCodeUrl } = useHomePageWechatQrCode();

useBodyScrollLock(computed(() => props.open));
</script>

<style lang="scss" scoped>
.landing-web-qr-modal {
  display: grid;
  justify-items: center;
  gap: var(--sys-spacing-small);
}

.landing-web-qr-modal__description {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}

.landing-web-qr-modal__image {
  width: min(100%, 260px);
  border-radius: var(--sys-radius-medium);
}

.landing-web-qr-modal__empty {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}
</style>
