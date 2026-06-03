<template>
  <FullScreenPageScaffold class="ordering-shell" :data-testid="dataTestid">
    <template #header>
      <PageHeader
        :title="title"
        :subtitle="subtitle"
        :back-fallback-to="backFallbackTo"
        variant="small"
      >
        <template v-if="$slots.actions" #top-actions>
          <slot name="actions" />
        </template>
      </PageHeader>
    </template>

    <main class="ordering-shell__content">
      <slot />
    </main>

    <template #footer>
      <slot name="bottom-action" />
    </template>

    <slot name="floating" />
    <slot name="drawer" />
  </FullScreenPageScaffold>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";
import FullScreenPageScaffold from "@/shared/ui/layout/FullScreenPageScaffold.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";

defineProps<{
  title: string;
  subtitle?: string;
  backFallbackTo: RouteLocationRaw;
  dataTestid?: string;
}>();
</script>

<style scoped lang="scss">
.ordering-shell {
  position: relative;
  min-width: 0;
  --pu-page-max-width: 44rem;
  --pu-page-padding-bottom: 0;
}

.ordering-shell :deep(.full-screen-page-scaffold__footer) {
  width: 100vw;
  margin-right: calc(50% - 50vw);
  margin-left: calc(50% - 50vw);
}

.ordering-shell__content {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
</style>
