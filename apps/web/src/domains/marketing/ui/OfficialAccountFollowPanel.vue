<template>
  <section class="official-account-follow-panel">
    <div class="panel-summary">
      <span class="panel-icon i-mdi-wechat" aria-hidden="true"></span>
      <div class="panel-text">
        <h3 class="panel-title">
          {{ t("officialAccountFollow.modalTitle") }}
        </h3>
        <p class="panel-description">
          {{ t("officialAccountFollow.modalDescription") }}
        </p>
      </div>
    </div>

    <div class="qr-frame">
      <img
        v-if="officialAccountQrCodeUrl"
        :src="officialAccountQrCodeUrl"
        :alt="t('officialAccountFollow.qrAlt')"
        class="qr-image"
      />
      <p v-else class="qr-empty">
        {{
          officialAccountQrCodeLoading ? t("common.loading") : t("officialAccountFollow.qrMissing")
        }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useWeChatOfficialAccountQrCode } from "@/shared/wechat/useWeChatOfficialAccountQrCode";

const { t } = useI18n();
const { officialAccountQrCodeLoading, officialAccountQrCodeUrl } = useWeChatOfficialAccountQrCode();
</script>

<style lang="scss" scoped>
.official-account-follow-panel {
  display: grid;
  gap: var(--sys-spacing-medium);
}

.panel-summary {
  display: flex;
  gap: var(--sys-spacing-small);
  align-items: flex-start;
}

.panel-icon {
  flex: 0 0 auto;
  color: var(--sys-color-primary);
  @include mx.pu-icon(large, true);
}

.panel-text {
  min-width: 0;
}

.panel-title {
  @include mx.pu-font(section);
  margin: 0;
  color: var(--sys-color-on-surface);
}

.panel-description {
  @include mx.pu-font(body);
  margin: var(--sys-spacing-xsmall) 0 0;
  color: var(--sys-color-on-surface-variant);
}

.qr-frame {
  display: grid;
  place-items: center;
  min-height: 220px;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
  padding: var(--sys-spacing-small);
}

.qr-image {
  width: min(100%, 240px);
  border-radius: var(--sys-radius-small);
}

.qr-empty {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}
</style>
