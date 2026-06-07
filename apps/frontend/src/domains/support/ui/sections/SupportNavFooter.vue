<template>
  <footer class="support-nav-footer">
    <nav
      class="support-nav-footer__nav"
      :aria-label="t('aboutPage.footerNavLabel')"
    >
      <RouterLink
        v-for="link in visibleFooterLinks"
        :key="link.routeName"
        class="support-nav-footer__link"
        :to="{ name: link.routeName }"
      >
        {{ link.label }}
      </RouterLink>
    </nav>
  </footer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const route = useRoute();

const footerLinks = computed(() => [
  {
    routeName: "me",
    label: t("home.landing.footerNavMine"),
  },
  {
    routeName: "contact-support",
    label: t("contactAuthorPage.footerEntry"),
  },
  {
    routeName: "about",
    label: t("aboutPage.footerEntry"),
  },
]);

const visibleFooterLinks = computed(() =>
  footerLinks.value.filter((link) => route.name !== link.routeName),
);
</script>

<style lang="scss" scoped>
.support-nav-footer {
  margin-top: var(--sys-spacing-large);
  padding-top: var(--sys-spacing-small);
  border-top: 1px solid var(--sys-color-outline-variant);
}

.support-nav-footer__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sys-spacing-small) var(--sys-spacing-medium);
}

.support-nav-footer__link {
  @include mx.pu-font(label-large);
  color: var(--sys-color-secondary);
  text-decoration: none;

  &:hover {
    color: var(--sys-color-on-primary-container);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
    border-radius: var(--sys-radius-xsmall);
  }
}
</style>
