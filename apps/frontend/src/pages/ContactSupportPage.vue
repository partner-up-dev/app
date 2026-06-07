<template>
  <PageScaffoldCentered class="contact-support-page">
    <template #header>
      <PageHeader :title="t('contactSupportPage.title')" />
    </template>

    <section
      class="contact-actions"
      :aria-label="t('contactSupportPage.actionsTitle')"
    >
      <div class="contact-card contact-card--support">
        <Chip tone="secondary" size="lg">
          {{ t("contactSupportPage.supportBadge") }}
        </Chip>
        <div class="contact-copy">
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

      <div class="contact-card contact-card--beta-group">
        <Chip class="contact-badge--beta-group" tone="secondary" size="lg">
          {{ t("contactSupportPage.betaGroupBadge") }}
        </Chip>
        <div class="contact-copy">
          <h2>{{ t("contactSupportPage.betaGroupTitle") }}</h2>
          <p>{{ t("contactSupportPage.betaGroupDescription") }}</p>
        </div>

        <ActionLink
          class="contact-action contact-action--beta-group"
          :to="{ name: 'about', hash: '#beta-groups' }"
          appearance="pill"
          tone="outline"
        >
          {{ t("contactSupportPage.betaGroupAction") }}
        </ActionLink>
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
  </PageScaffoldCentered>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import SupportContactAction from "@/domains/support/ui/sections/SupportContactAction.vue";
import SupportContactQrModal from "@/domains/support/ui/sections/SupportContactQrModal.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PageScaffoldCentered from "@/shared/ui/layout/PageScaffoldCentered.vue";
import Chip from "@/shared/ui/display/Chip.vue";
import ActionLink from "@/shared/ui/actions/ActionLink.vue";
import { isWeChatBrowser } from "@/shared/browser/isWeChatBrowser";
import { useWeChatMiniProgramWebView } from "@/shared/wechat/useWeChatMiniProgramWebView";
import { PUBLIC_CONFIG_KEYS, usePublicConfig } from "@/shared/config/queries/usePublicConfig";

const DEFAULT_SUPPORT_LINK_WECHAT_IN =
  "https://work.weixin.qq.com/nl/act/p/3f8820e724cb44c5";
const DEFAULT_SUPPORT_LINK_WECHAT_OUT =
  "https://work.weixin.qq.com/nl/act/p/4030a5b69149404d";

const { t } = useI18n();
const { isMiniProgramWebView } = useWeChatMiniProgramWebView();
const supportQrModalOpen = ref(false);

const supportLinkWechatInQuery = usePublicConfig(
  PUBLIC_CONFIG_KEYS.wecomSupportLinkWechatIn,
);
const supportLinkWechatOutQuery = usePublicConfig(
  PUBLIC_CONFIG_KEYS.wecomSupportLinkWechatOut,
);

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
  if (
    supportLinkWechatInQuery.isLoading.value ||
    supportLinkWechatInQuery.error.value
  ) {
    return DEFAULT_SUPPORT_LINK_WECHAT_IN;
  }

  return resolveSupportLink(
    supportLinkWechatInQuery.data.value?.value,
    DEFAULT_SUPPORT_LINK_WECHAT_IN,
  );
});

const supportLinkWechatOut = computed(() => {
  if (
    supportLinkWechatOutQuery.isLoading.value ||
    supportLinkWechatOutQuery.error.value
  ) {
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

.contact-card--beta-group {
  grid-column: 1 / -1;
  align-content: space-between;
  border-color: var(--sys-color-outline-variant);
  background: var(--sys-color-surface-container-low);
}

.contact-badge--beta-group {
  opacity: 0.8;
}

.contact-copy {
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
