<template>
  <Modal
    :open="open"
    :title="t('wechatMiniProgramWebView.title')"
    max-width="420px"
    @close="emit('close')"
  >
    <div class="mini-program-jssdk-notice">
      <p class="mini-program-jssdk-notice__description">
        {{ t("wechatMiniProgramWebView.description") }}
      </p>

      <div class="mini-program-jssdk-notice__qr">
        <img
          v-if="qrCodeDataUrl"
          :src="qrCodeDataUrl"
          :alt="t('wechatMiniProgramWebView.qrAlt')"
          class="mini-program-jssdk-notice__qr-image"
        />
        <p v-else class="mini-program-jssdk-notice__qr-empty">
          {{
            qrCodeError ??
            t("wechatMiniProgramWebView.qrGenerating")
          }}
        </p>
      </div>

      <p class="mini-program-jssdk-notice__instruction">
        {{
          t("wechatMiniProgramWebView.instruction", {
            operation: operationLabel,
          })
        }}
      </p>

      <p v-if="targetUrl" class="mini-program-jssdk-notice__url">
        {{ targetUrl }}
      </p>

      <div class="mini-program-jssdk-notice__actions">
        <Button
          tone="primary-outline"
          appearance="rect"
          type="button"
          @click="copyCurrentUrl"
        >
          {{ copyButtonLabel }}
        </Button>
        <Button appearance="rect" type="button" @click="emit('close')">
          {{ t("common.close") }}
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { copyToClipboard } from "@/lib/clipboard";
import Button from "@/shared/ui/actions/Button.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import { useCurrentWebPageQrCode } from "@/shared/wechat/useCurrentWebPageQrCode";

const props = defineProps<{
  open: boolean;
  operationLabel: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const copyState = ref<"idle" | "copied" | "error">("idle");
const openRef = toRef(props, "open");
const { targetUrl, qrCodeDataUrl, qrCodeError } =
  useCurrentWebPageQrCode(openRef);

const copyButtonLabel = computed(() => {
  if (copyState.value === "copied") return t("common.copied");
  if (copyState.value === "error") return t("common.copyFailed");
  return t("wechatMiniProgramWebView.copyLinkAction");
});

watch(openRef, (isOpen) => {
  if (isOpen) {
    copyState.value = "idle";
  }
});

const copyCurrentUrl = async (): Promise<void> => {
  if (!targetUrl.value) return;

  try {
    await copyToClipboard(targetUrl.value);
    copyState.value = "copied";
  } catch {
    copyState.value = "error";
  }
};

useBodyScrollLock(openRef);
</script>

<style scoped lang="scss">
.mini-program-jssdk-notice {
  display: grid;
  justify-items: center;
  gap: var(--sys-spacing-small);
}

.mini-program-jssdk-notice__description,
.mini-program-jssdk-notice__instruction,
.mini-program-jssdk-notice__qr-empty {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}

.mini-program-jssdk-notice__instruction {
  color: var(--sys-color-on-surface);
}

.mini-program-jssdk-notice__qr {
  display: grid;
  place-items: center;
  width: min(100%, 280px);
  aspect-ratio: 1;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container-lowest);
}

.mini-program-jssdk-notice__qr-image {
  width: min(100%, 260px);
  border-radius: var(--sys-radius-small);
}

.mini-program-jssdk-notice__url {
  @include mx.pu-font(control);
  width: 100%;
  margin: 0;
  padding: var(--sys-spacing-xsmall);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-high);
  color: var(--sys-color-on-surface-variant);
  overflow-wrap: anywhere;
}

.mini-program-jssdk-notice__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sys-spacing-xsmall);
  width: 100%;
}

@media (max-width: 480px) {
  .mini-program-jssdk-notice__actions {
    flex-direction: column;
  }
}
</style>
