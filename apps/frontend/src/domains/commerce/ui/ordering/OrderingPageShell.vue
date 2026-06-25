<template>
  <PuPageScaffold
    viewport="screen"
    :padding="noPadding ? 'none' : undefined"
    class="ordering-page-shell"
    :data-testid="dataTestid"
  >
    <template #pageHeader>
      <PuHeader
        :title="title"
        :subtitle="subtitle"
        title-as="h1"
        size="sm"
      >
        <template #leading>
          <PuButton
            tone="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('common.backToPrevious')"
            @click="handleBack"
          >
            <template #leading>
              <span class="i-mdi-arrow-left" aria-hidden="true"></span>
            </template>
          </PuButton>
        </template>
        <template v-if="$slots.actions" #actions>
          <slot name="actions" />
        </template>
      </PuHeader>
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
import { PuButton, PuHeader, PuPageScaffold } from "@partner-up-dev/design-web";
import { useI18n } from "vue-i18n";
import type { RouteLocationRaw } from "vue-router";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";

const props = defineProps<{
  title: string;
  subtitle?: string;
  backFallbackTo: RouteLocationRaw;
  dataTestid?: string;
  noPadding?: boolean;
}>();

const { t } = useI18n();
const { handleBack } = useFallbackBack(() => props.backFallbackTo);
</script>

<style scoped lang="scss">
.ordering-page-shell {
  position: relative;
  min-width: 0;
  --pu-page-max-width: 44rem;
  --pu-page-padding-bottom: 0;
  --pu-page-scaffold-region-gap: 0;
}

.ordering-page-shell :deep(.pu-page-scaffold__footer) {
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
