<template>
  <PuPageScaffold content-placement="center" class="contact-support-page">
    <template #pageHeader>
      <PuHeader :title="t('contactSupportPage.title')" title-as="h1">
        <template #leading>
          <PuButton
            tone="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('common.backToHome')"
            @click="handleBack"
          >
            <template #leading>
              <span class="i-mdi-arrow-left" aria-hidden="true"></span>
            </template>
          </PuButton>
        </template>
      </PuHeader>
    </template>

    <section class="contact-actions" :aria-label="t('contactSupportPage.actionsTitle')">
      <div class="contact-card contact-card--support">
        <PuChip tone="secondary" size="lg">
          {{ t("contactSupportPage.supportBadge") }}
        </PuChip>
        <div class="contact-text">
          <h2>{{ t("contactSupportPage.supportTitle") }}</h2>
          <p>{{ t("contactSupportPage.supportDescription") }}</p>
        </div>

        <SupportContactAction
          class="contact-action contact-action--support"
          :href="supportLink"
          :qr-entry="usesMiniProgramQrEntry"
          tone="secondary"
          @open-qr="supportQrModalOpen = true"
        >
          {{ t("contactSupportPage.supportAction") }}
        </SupportContactAction>
      </div>

      <div class="contact-card contact-card--type-community">
        <PuChip tone="secondary" size="lg">
          {{ t("contactSupportPage.typeCommunity.badge") }}
        </PuChip>
        <div class="contact-text">
          <h2>{{ t("contactSupportPage.typeCommunity.title") }}</h2>
          <p>{{ t("contactSupportPage.typeCommunity.description") }}</p>
        </div>

        <PuButton
          class="contact-action contact-action--type-community"
          :action="{ to: { name: 'about', hash: '#type-communities' } }"
          shape="pill"
          tone="primary"
          variant="outline"
          data-testid="support.type-community.open"
        >
          {{ t("contactSupportPage.typeCommunity.action") }}
        </PuButton>
      </div>
    </section>

    <nav class="support-entry-links" :aria-label="t('aboutPage.footerNavLabel')">
      <RouterLink class="support-entry-link" :to="{ name: 'contact-author' }">
        {{ t("contactSupportPage.authorEntry") }}
      </RouterLink>
      <RouterLink class="support-entry-link" :to="{ name: 'about' }">
        {{ t("aboutPage.title") }}
      </RouterLink>
    </nav>

    <SupportContactQrModal
      :open="supportQrModalOpen"
      :title="t('contactSupportPage.supportQrModalTitle')"
      :description="t('contactSupportPage.supportQrModalDescription')"
      :target-url="supportLink"
      :qr-alt="t('contactSupportPage.supportQrAlt')"
      :missing-text="t('contactSupportPage.supportQrMissing')"
      @close="supportQrModalOpen = false"
    />
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { PuButton, PuChip, PuHeader, PuPageScaffold } from "@partner-up-dev/design-web";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import SupportContactAction from "@/domains/support/ui/sections/SupportContactAction.vue";
import SupportContactQrModal from "@/domains/support/ui/sections/SupportContactQrModal.vue";
import { isWeChatBrowser } from "@/shared/browser/isWeChatBrowser";
import { PUBLIC_CONFIG_KEYS, usePublicConfig } from "@/shared/config/queries/usePublicConfig";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";
import { useWeChatMiniProgramWebView } from "@/shared/wechat/useWeChatMiniProgramWebView";

const DEFAULT_SUPPORT_LINK_WECHAT_IN = "https://work.weixin.qq.com/nl/act/p/3f8820e724cb44c5";
const DEFAULT_SUPPORT_LINK_WECHAT_OUT = "https://work.weixin.qq.com/nl/act/p/4030a5b69149404d";

const { t } = useI18n();
const { handleBack } = useFallbackBack();
const { isMiniProgramWebView } = useWeChatMiniProgramWebView();
const supportQrModalOpen = ref(false);

const supportLinkWechatInQuery = usePublicConfig(PUBLIC_CONFIG_KEYS.wecomSupportLinkWechatIn);
const supportLinkWechatOutQuery = usePublicConfig(PUBLIC_CONFIG_KEYS.wecomSupportLinkWechatOut);

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

const resolveSupportLink = (
  configuredValue: string | null | undefined,
  fallback: string,
): string => {
  return normalizeHttpUrl(configuredValue) ?? fallback;
};

const supportLinkWechatIn = computed(() => {
  if (supportLinkWechatInQuery.isLoading.value || supportLinkWechatInQuery.error.value) {
    return DEFAULT_SUPPORT_LINK_WECHAT_IN;
  }

  return resolveSupportLink(
    supportLinkWechatInQuery.data.value?.value,
    DEFAULT_SUPPORT_LINK_WECHAT_IN,
  );
});

const supportLinkWechatOut = computed(() => {
  if (supportLinkWechatOutQuery.isLoading.value || supportLinkWechatOutQuery.error.value) {
    return DEFAULT_SUPPORT_LINK_WECHAT_OUT;
  }

  return resolveSupportLink(
    supportLinkWechatOutQuery.data.value?.value,
    DEFAULT_SUPPORT_LINK_WECHAT_OUT,
  );
});

const supportLink = computed(() =>
  isWeChatBrowser() ? supportLinkWechatIn.value : supportLinkWechatOut.value,
);

const usesMiniProgramQrEntry = computed(() => isMiniProgramWebView.value);
</script>

<style lang="scss" scoped>
.contact-actions {
  width: min(100%, 33rem);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-medium);
}

.contact-card {
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  display: grid;
  gap: var(--sys-spacing-small);
  background: var(--sys-color-surface);
}

.contact-card--support {
  grid-column: 1 / -1;
  align-content: space-between;
  border-color: var(--sys-color-secondary);
}

.contact-text {
  display: grid;
  gap: var(--sys-spacing-xsmall);

  h2 {
    @include mx.pu-font(section);
    margin: 0;
    color: var(--sys-color-on-surface);
  }

  p {
    @include mx.pu-font(body);
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }
}

.contact-action {
  width: fit-content;

  &:hover {
    opacity: 0.92;
    transform: translateY(-1px);
  }
}

.support-entry-links {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sys-spacing-small) var(--sys-spacing-medium);
}

.support-entry-link {
  @include mx.pu-font(control);
  color: var(--sys-color-secondary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
    border-radius: var(--sys-radius-xsmall);
  }
}

@media (max-width: 768px) {
  .contact-support-page :deep(.page-scaffold-centered__main) {
    align-items: stretch;
  }

  .contact-actions {
    grid-template-columns: 1fr;
  }

  .support-entry-links {
    justify-content: center;
  }

  .contact-action {
    width: 100%;
  }

  .contact-card {
    justify-items: stretch;
  }
}
</style>
