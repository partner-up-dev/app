<template>
  <PuPageScaffold viewport="screen" class="ordering-page-shell" :data-testid="dataTestid">
    <template #header>
      <PuPageHeader
        :title="title"
        :subtitle="subtitle"
        density="compact"
        show-back
        @back="handleBack"
      >
        <template v-if="$slots.actions" #actions>
          <slot name="actions" />
        </template>
      </PuPageHeader>
    </template>

    <main class="ordering-page-shell__body">
      <slot />
    </main>

    <template #footer>
      <slot name="footer-action" />
    </template>

    <slot name="floating" />
    <slot name="drawer" />
  </PuPageScaffold>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";
import { PuPageHeader, PuPageScaffold } from "@partner-up-dev/design-web";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";

const props = defineProps<{
  title: string;
  subtitle?: string;
  backFallbackTo: RouteLocationRaw;
  dataTestid?: string;
}>();

const { handleBack } = useFallbackBack(() => props.backFallbackTo);
</script>

<style scoped lang="scss">
.ordering-page-shell {
  position: relative;
  min-width: 0;
  --pu-page-max-width: 44rem;
  --pu-page-padding-bottom: 0;
}

.ordering-page-shell :deep(.full-screen-page-scaffold__footer) {
  width: 100vw;
  margin-right: calc(50% - 50vw);
  margin-left: calc(50% - 50vw);
}

.ordering-page-shell__body {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
</style>
