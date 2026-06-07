<template>
  <section class="wechat-access-section" data-block="wechat-access">
    <div class="wechat-access-section__actions">
      <Button
        appearance="rect"
        tone="outline"
        size="md"
        full-width
        @click="showOfficialAccountQrModal = true"
      >
        {{ t("home.landing.officialAccountAction") }}
      </Button>

      <Button
        appearance="rect"
        tone="outline"
        size="md"
        full-width
        @click="showWebPageQrModal = true"
      >
        {{ t("home.landing.webPageQrAction") }}
      </Button>
    </div>

    <p class="wechat-access-section__hint">
      {{ t("home.landing.wechatAccessDescription") }}
    </p>
  </section>

  <LandingWebPageQrModal
    :open="showWebPageQrModal"
    @close="showWebPageQrModal = false"
  />
  <OfficialAccountQrModal
    :open="showOfficialAccountQrModal"
    @close="showOfficialAccountQrModal = false"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";
import LandingWebPageQrModal from "@/domains/landing/ui/sections/LandingWebPageQrModal.vue";
import OfficialAccountQrModal from "@/shared/wechat/OfficialAccountQrModal.vue";

const { t } = useI18n();
const showWebPageQrModal = ref(false);
const showOfficialAccountQrModal = ref(false);
</script>

<style lang="scss" scoped>
.wechat-access-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sys-spacing-small);
  margin-top: var(--sys-spacing-small);
  padding-top: var(--sys-spacing-medium);
}

.wechat-access-section__actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.wechat-access-section__hint {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
  max-width: 32ch;
}

@media (max-width: 768px) {
  .wechat-access-section__hint {
    @include mx.pu-font(body);
    max-width: none;
  }
}
</style>
