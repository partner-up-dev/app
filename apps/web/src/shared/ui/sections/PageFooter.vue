<template>
  <footer
    class="page-footer"
    :class="[
      `page-footer--${variant}`,
      { 'home-section home-section--footer': variant === 'brand' },
    ]"
  >
    <section v-if="variant === 'brand'" class="page-footer__brand">
      <nav class="page-footer__nav" :aria-label="t('home.landing.footerNavTitle')">
        <RouterLink
          v-for="link in visibleFooterLinks"
          :key="link.routeName"
          class="page-footer__nav-link"
          :to="{ name: link.routeName }"
        >
          <span class="page-footer__nav-label">{{ link.label }}</span>
          <span class="page-footer__nav-icon i-mdi:arrow-right" aria-hidden="true"></span>
        </RouterLink>
      </nav>
      <div class="page-footer__brand-body">
        <img
          class="page-footer__brand-logo"
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

    <nav v-else class="page-footer__nav" :aria-label="t('aboutPage.footerNavLabel')">
      <RouterLink
        v-for="link in visibleFooterLinks"
        :key="link.routeName"
        class="page-footer__nav-link"
        :to="{ name: link.routeName }"
      >
        {{ link.label }}
      </RouterLink>
    </nav>

    <section v-if="variant === 'brand'" class="page-footer__legal">
      <p class="page-footer__copyright">© 搭一把科技有限公司</p>
      <a href="https://beian.miit.gov.cn/" class="page-footer__beian">粤ICP备2024324879号</a>
    </section>
  </footer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

type PageFooterVariant = "minimal" | "brand";

const props = withDefaults(
  defineProps<{
    variant?: PageFooterVariant;
  }>(),
  {
    variant: "minimal",
  },
);

const { t } = useI18n();
const route = useRoute();

const minimalLinks = computed(() => [
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

const brandLinks = computed(() => [
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
]);

const footerLinks = computed(() =>
  props.variant === "brand" ? brandLinks.value : minimalLinks.value,
);

const visibleFooterLinks = computed(() =>
  footerLinks.value.filter((link) => route.name !== link.routeName),
);
</script>

<style lang="scss" scoped>
.page-footer {
  min-width: 0;
}

.page-footer--minimal {
  margin-top: var(--sys-spacing-large);
  padding-top: var(--sys-spacing-small);
  padding-right: calc(var(--sys-spacing-medium) + var(--pu-safe-right));
  padding-bottom: var(--sys-spacing-medium);
  padding-left: calc(var(--sys-spacing-medium) + var(--pu-safe-left));
  border-top: 1px solid var(--sys-color-outline-variant);

  .page-footer__nav {
    align-items: center;
    justify-content: center;
    gap: var(--sys-spacing-small) var(--sys-spacing-medium);
  }

  .page-footer__nav-link {
    @include mx.pu-font(control);
    color: var(--sys-color-secondary);

    &:hover {
      color: var(--sys-color-on-primary-container);
    }
  }
}

.page-footer--brand {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: var(--page-footer-gap);
  padding-top: var(
    --page-footer-padding-top,
    var(--landing-section-padding-block, var(--sys-spacing-large))
  );
  padding-left: var(
    --page-footer-padding-inline-start,
    calc(
      var(--landing-section-padding-inline-compact, var(--sys-spacing-medium)) + var(--pu-safe-left)
    )
  );
  padding-right: var(
    --page-footer-padding-inline-end,
    calc(
      var(--landing-section-padding-inline-compact, var(--sys-spacing-medium)) +
        var(--pu-safe-right)
    )
  );
  padding-bottom: calc(
    var(
        --page-footer-padding-bottom,
        var(--landing-section-padding-block, var(--sys-spacing-large))
      ) +
      var(--pu-safe-bottom)
  );
  animation-delay: 260ms;
  background-color: var(--sys-color-surface-container);

  .page-footer__nav {
    gap: var(--sys-spacing-small);
  }

  .page-footer__nav-link {
    @include mx.pu-font(control);
    position: relative;
    width: fit-content;
    min-height: 2.75rem;
    color: var(--sys-color-on-surface-variant);

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

    &:hover {
      color: var(--sys-color-on-surface);
    }

    &:hover::before {
      transform: scaleX(1);
    }
  }
}

.page-footer__nav {
  display: flex;
  flex-wrap: wrap;
}

.page-footer__nav-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
    border-radius: var(--sys-radius-xsmall);
  }
}

.page-footer__nav-icon {
  margin-left: var(--sys-spacing-xsmall);
  display: inline-block;
  vertical-align: middle;
  @include mx.pu-icon(medium);
}

.page-footer__brand {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);

  p {
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
    max-width: var(--page-footer-copy-measure);
    margin: 0;
  }
}

.page-footer__brand-body {
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-small);

  h2 {
    @include mx.pu-font(title);
    line-height: calc(
      var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall)
    );
    color: var(--sys-color-on-surface);
    margin: 0;
  }
}

.page-footer__brand-logo {
  width: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  border-radius: var(--sys-radius-small);
  object-fit: cover;
}

.page-footer__legal {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xsmall);
  color: var(--sys-color-on-surface-variant);
}

.page-footer__copyright {
  @include mx.pu-font(caption);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
}

.page-footer__beian {
  @include mx.pu-font(caption);
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
  .page-footer--brand {
    .page-footer__nav {
      gap: var(--sys-spacing-xsmall) var(--sys-spacing-medium);
    }

    .page-footer__nav-link {
      @include mx.pu-font(section);
      min-height: 3rem;
      padding: var(--sys-spacing-xsmall);
    }
  }

  .page-footer__brand p {
    @include mx.pu-font(body);
  }

  .page-footer__legal {
    gap: var(--sys-spacing-xsmall);
  }

  .page-footer__copyright,
  .page-footer__beian {
    @include mx.pu-font(control);
  }
}
</style>
