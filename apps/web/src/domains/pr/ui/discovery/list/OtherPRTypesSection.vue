<template>
  <div
    v-if="shouldRenderSection && variant === 'panel'"
    ref="sectionRef"
    class="other-pr-types__panel-shell"
  >
    <PuCard
      as="section"
      class="other-pr-types other-pr-types--panel"
      :title="t('prDiscovery.otherTypesTitle')"
      :toggle-label="t('prDiscovery.otherTypesTitle')"
      :default-expanded="false"
      collapsible
      variant="outline"
    >
      <PuLoadingState v-if="isLoading" compact align="start" :message="t('common.loading')" />

      <PRDiscoveryTypeHorizontalList
        v-else
        :items="otherTypes"
        variant="contained"
        card-surface="outline"
        :auto-scroll="isInView"
      />
    </PuCard>
  </div>

  <section
    v-else-if="shouldRenderSection"
    ref="sectionRef"
    class="other-pr-types other-pr-types--embedded"
  >
    <h3 class="other-pr-types__title">
      {{ t("prDiscovery.otherTypesTitle") }}
    </h3>

    <PuLoadingState v-if="isLoading" compact align="start" :message="t('common.loading')" />

    <PRDiscoveryTypeHorizontalList
      v-else
      :items="otherTypes"
      variant="contained"
      card-surface="outline"
      :auto-scroll="isInView"
    />
  </section>
</template>

<script setup lang="ts">
import { PuCard, PuLoadingState } from "@partner-up-dev/design-web";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { usePRDiscoveryCatalog } from "@/domains/pr/queries/usePRDiscovery";
import PRDiscoveryTypeHorizontalList from "@/domains/pr/ui/discovery/list/PRDiscoveryTypeHorizontalList.vue";
import { useInViewStagger } from "@/shared/motion/useInViewStagger";

const props = withDefaults(
  defineProps<{
    currentType?: string | null;
    variant?: "embedded" | "panel";
  }>(),
  {
    currentType: null,
    variant: "embedded",
  },
);

const { t } = useI18n();
const { targetRef: sectionRef, isInView } = useInViewStagger({ once: false });
const { data: items, isLoading, isError } = usePRDiscoveryCatalog();

const otherTypes = computed(() => {
  const itemList = items.value ?? [];

  if (props.currentType === null) {
    return itemList;
  }

  return itemList.filter((item) => item.type !== props.currentType);
});

const shouldRenderSection = computed(() => {
  if (isError.value) {
    return false;
  }

  return isLoading.value || otherTypes.value.length > 0;
});
</script>

<style lang="scss" scoped>
.other-pr-types {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.other-pr-types__panel-shell {
  min-width: 0;
}

.other-pr-types--embedded {
  padding-top: var(--sys-spacing-medium);
  border-top: 1px solid var(--sys-color-outline-variant);
}

.other-pr-types__title {
  margin: 0;
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
}
</style>
