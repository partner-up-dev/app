<template>
  <PageScaffold
    class="footer-reveal-page-scaffold"
    :class="`footer-reveal-page-scaffold--content-${props.contentPlacement}`"
  >
    <div class="footer-reveal-page-scaffold__viewport">
      <header
        v-if="$slots.header"
        class="footer-reveal-page-scaffold__header"
      >
        <slot name="header" />
      </header>

      <main class="footer-reveal-page-scaffold__content">
        <slot />
      </main>
    </div>

    <footer
      v-if="$slots.footer"
      class="footer-reveal-page-scaffold__footer"
    >
      <slot name="footer" />
    </footer>
  </PageScaffold>
</template>

<script setup lang="ts">
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";

const props = withDefaults(
  defineProps<{
    contentPlacement?: "start" | "center";
  }>(),
  {
    contentPlacement: "start",
  },
);
</script>

<style lang="scss" scoped>
.footer-reveal-page-scaffold {
  isolation: isolate;
  display: flex;
  flex-direction: column;
  --pu-page-max-width: none;
  --pu-page-padding-top: 0;
  --pu-page-padding-right: 0;
  --pu-page-padding-bottom: 0;
  --pu-page-padding-left: 0;
  --footer-reveal-first-screen-height: var(--pu-vh);
  --footer-reveal-top-padding: calc(var(--sys-spacing-medium) + var(--pu-safe-top));
  --footer-reveal-inline-start-padding: calc(
    var(--sys-spacing-medium) + var(--pu-safe-left)
  );
  --footer-reveal-inline-end-padding: calc(
    var(--sys-spacing-medium) + var(--pu-safe-right)
  );
  --footer-reveal-content-max-width: var(--dcs-layout-page-max-width);
}

.footer-reveal-page-scaffold__viewport {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: var(--footer-reveal-first-screen-height);
  min-width: 0;
  padding-top: var(--footer-reveal-top-padding);
  padding-left: var(--footer-reveal-inline-start-padding);
  padding-right: var(--footer-reveal-inline-end-padding);
}

.footer-reveal-page-scaffold__header,
.footer-reveal-page-scaffold__content {
  width: 100%;
  max-width: var(--footer-reveal-content-max-width);
  margin-inline: auto;
}

.footer-reveal-page-scaffold__header,
.footer-reveal-page-scaffold__footer {
  min-width: 0;
  flex: 0 0 auto;
}

.footer-reveal-page-scaffold__content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.footer-reveal-page-scaffold--content-center .footer-reveal-page-scaffold__content {
  justify-content: center;
}

.footer-reveal-page-scaffold__footer {
  position: relative;
  z-index: 20;
  isolation: isolate;
  --full-common-footer-padding-top: var(--sys-spacing-medium);
  --full-common-footer-padding-inline-start: var(
    --footer-reveal-inline-start-padding
  );
  --full-common-footer-padding-inline-end: var(
    --footer-reveal-inline-end-padding
  );
}
</style>
