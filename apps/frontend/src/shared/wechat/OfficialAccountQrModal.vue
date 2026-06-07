<template>
  <Modal
    :open="open"
    :title="t('officialAccountFollow.modalTitle')"
    max-width="420px"
    @close="emit('close')"
  >
    <div class="official-account-modal-body">
      <p class="official-account-modal-description">
        {{ t("officialAccountFollow.modalDescription") }}
      </p>
      <img
        v-if="officialAccountQrCodeUrl"
        :src="officialAccountQrCodeUrl"
        :alt="t('officialAccountFollow.qrAlt')"
        class="official-account-qr-image"
      />
      <p v-else class="official-account-qr-empty">
        {{ t("officialAccountFollow.qrMissing") }}
      </p>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Modal from "@/shared/ui/overlay/Modal.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import { useWeChatOfficialAccountQrCode } from "@/shared/wechat/useWeChatOfficialAccountQrCode";

interface Props {
  open: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();
const { t } = useI18n();
const { officialAccountQrCodeUrl } = useWeChatOfficialAccountQrCode();

useBodyScrollLock(computed(() => props.open));
</script>

<style lang="scss" scoped>
.official-account-modal-body {
  display: grid;
  justify-items: center;
  gap: var(--sys-spacing-small);
}

.official-account-modal-description {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.official-account-qr-image {
  width: min(100%, 260px);
  border-radius: var(--sys-radius-medium);
}

.official-account-qr-empty {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}
</style>
