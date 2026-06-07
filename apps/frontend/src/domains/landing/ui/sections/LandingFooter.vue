<template>
  <footer class="home-section home-section--footer">
    <section class="landing-footer__brand">
      <nav class="landing-footer__nav" :aria-label="t('home.landing.footerNavTitle')">
        <RouterLink
          v-for="link in footerNavLinks"
          :key="link.routeName"
          class="landing-footer__nav-link"
          :to="{ name: link.routeName }"
        >
          <span class="landing-footer__nav-label">{{ link.label }}</span>
          <span
            class="landing-footer__nav-icon i-mdi:arrow-right"
            aria-hidden="true"
          ></span>
        </RouterLink>
      </nav>
      <div class="landing-footer__brand-main">
        <img
          class="landing-footer__brand-logo"
          src="/share-logo.png"
          :alt="t('app.name')"
          width="48"
          height="48"
          loading="lazy"
          decoding="async"
        />
        <h2>{{ t("app.name") }}</h2>
      </div>
      <p>{{ t("home.landing.footerIntroBody") }}</p>
    </section>

    <section class="landing-footer__legal">
      <p class="landing-footer__copyright">© 搭一把科技有限公司</p>
      <a href="https://beian.miit.gov.cn/" class="landing-footer__beian"
        >粤ICP备2024324879号</a
      >
    </section>
  </footer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const route = useRoute();

const footerNavLinks = computed(() =>
  [
    {
      routeName: "pr-mine",
      label: t("myPrsPage.title"),
    },
    {
      routeName: "me",
      label: t("home.landing.footerNavMine"),
    },
    {
      routeName: "contact-support",
      label: t("contactSupportPage.title"),
    },
    {
      routeName: "about",
      label: t("aboutPage.title"),
    },
  ].filter((link) => route.name !== link.routeName),
);
</script>

<style lang="scss" scoped>
.home-section--footer {
  display: flex;
  flex-direction: column;
  min-width: 0;
  justify-content: flex-start;
  gap: var(--landing-footer-gap);
  padding-top: var(--landing-footer-padding-top, 0);
  padding-left: var(--landing-footer-padding-inline-start, 0);
  padding-right: var(--landing-footer-padding-inline-end, 0);
  padding-bottom: calc(
    var(--landing-section-padding-block) + var(--pu-safe-bottom)
  );
  animation-delay: 260ms;
  background-color: var(--sys-color-surface-container);
}

.landing-footer__brand {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.landing-footer__brand-main {
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-small);

  h2 {
    @include mx.pu-font(title-large);
    color: var(--sys-color-on-surface);
    line-height: var(--sys-size-large);
    margin: 0;
  }
}

.landing-footer__brand-logo {
  width: var(--sys-size-large);
  height: var(--sys-size-large);
  border-radius: var(--sys-radius-small);
  object-fit: cover;
}

.landing-footer__brand p {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
  max-width: var(--landing-footer-copy-measure);
  margin: 0;
}

.landing-footer__nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-small);
}

.landing-footer__nav-link {
  @include mx.pu-font(label-large);
  position: relative;
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 2.75rem;
  color: var(--sys-color-on-surface-variant);
  text-decoration: none;

  transition:
    color 180ms ease,
    opacity 180ms ease;
  &::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -2px;
    height: 1px;
    background: currentColor;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 180ms ease;
  }

  .landing-footer__nav-icon {
    margin-left: var(--sys-spacing-xsmall);
    display: inline-block;
    vertical-align: middle;
    // color: var(--sys-color-secondary);
    @include mx.pu-icon(medium);
  }

  // .landing-footer__nav-label {
  //   text-decoration: underline;
  //   text-underline-offset: 3px;
  // }

  &:hover {
    color: var(--sys-color-on-surface);
  }

  &:hover::before {
    transform: scaleX(1);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.landing-footer__legal {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xsmall);
  color: var(--sys-color-on-surface-variant);
}

.landing-footer__copyright {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
}

.landing-footer__beian {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
  text-decoration: none;
  transition:
    color 180ms ease,
    text-decoration 180ms ease;

  &:hover {
    color: var(--sys-color-primary);
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

@media (max-width: 768px) {
  .landing-footer__brand-main h2 {
    @include mx.pu-font(headline-small);
  }

  .landing-footer__brand p {
    @include mx.pu-font(body-large);
  }

  .landing-footer__nav {
    gap: var(--sys-spacing-xsmall) var(--sys-spacing-medium);
  }

  .landing-footer__nav-link {
    @include mx.pu-font(title-small);
    min-height: 3rem;
    padding: var(--sys-spacing-xsmall);
  }

  .landing-footer__legal {
    gap: var(--sys-spacing-xsmall);
  }

  .landing-footer__copyright,
  .landing-footer__beian {
    @include mx.pu-font(label-medium);
  }
}
</style>
