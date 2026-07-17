<template>
  <PuPageScaffold
    :class="['pr-discovery-page', { 'pr-discovery-page--card': activeViewMode === 'CARD' }]"
    data-page="pr-discovery"
    footer-placement="reveal"
    :content-placement="panelRef?.pageStatePlacement ?? 'center'"
  >
    <template #pageHeader>
      <PuHeader
        v-if="!selectedType || selectedTypeDetail || (selectedType && panelRef?.hasLoadFailed)"
        class="pr-discovery-page__header"
        :title="
          selectedType
            ? (selectedTypeDetail?.title ?? t('prDiscovery.loadFailed'))
            : t('prDiscovery.catalogTitle')
        "
        :subtitle="
          selectedType
            ? (selectedTypeDetail?.description ?? undefined)
            : t('prDiscovery.catalogSubtitle')
        "
        title-as="h1"
      >
        <template #leading>
          <PuButton
            v-if="selectedType"
            tone="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('prDiscovery.backAction')"
            data-testid="prd.header.back"
            @click="handleBack"
          >
            <template #leading><span class="i-mdi-arrow-left" aria-hidden="true" /></template>
          </PuButton>
          <PuButton
            v-else
            tone="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('common.backToHome')"
            data-testid="prd.catalog.back"
            @click="handleCatalogBack"
          >
            <template #leading><span class="i-mdi-arrow-left" aria-hidden="true" /></template>
          </PuButton>
        </template>
        <template #actions>
          <PuButton
            v-if="selectedType"
            tone="neutral"
            variant="outline"
            shape="pill"
            size="sm"
            data-testid="prd.header.other-types"
            @click="showOtherTypes = true"
          >
            {{ t("prDiscovery.otherTypesAction") }}
          </PuButton>
        </template>
      </PuHeader>
    </template>

    <PRDiscoveryPanel ref="panelRef" />

    <template #footer>
      <div class="pr-discovery-page__footer">
        <div
          v-if="selectedTypeDetail && panelRef?.isViewResolved"
          class="pr-discovery-page__mode-switch-shell"
          data-testid="prd.mode-switch"
        >
          <PuSegmented
            class="pr-discovery-page__mode-switch"
            :model-value="activeViewMode"
            :aria-label="t('prDiscovery.viewModeAria')"
            full-width
            equal-width
            @update:model-value="handleModeChange"
          >
            <PuSegmentedItem
              v-for="option in modeOptions"
              :key="option.value"
              :value="option.value"
              :label="option.label"
              :data-testid="option.testId"
            >
              <template #leading><span :class="option.icon" aria-hidden="true" /></template>
            </PuSegmentedItem>
          </PuSegmented>
        </div>
        <PageFooter variant="brand" data-region="footer" />
      </div>
    </template>
  </PuPageScaffold>

  <PuDrawer v-model:visible="showOtherTypes" :title="t('prDiscovery.otherTypesTitle')">
    <div data-testid="prd.other-types.drawer">
      <PuLoadingState v-if="catalogQuery.isLoading.value" :message="t('common.loading')" />
      <PuInlineNotice
        v-else-if="catalogQuery.error.value"
        tone="error"
        :message="t('prDiscovery.otherTypesLoadFailed')"
      />
      <PRDiscoveryTypeRadioCardCarousel
        v-else
        :model-value="selectedOtherType"
        :items="otherTypeItems"
        :aria-label="t('prDiscovery.otherTypesTitle')"
        @update:model-value="selectedOtherType = $event"
        @activate="openType"
      />
    </div>
  </PuDrawer>

  <OfficialAccountFollowNudge
    :open="followPrompt.isVisible.value"
    @dismiss="followPrompt.dismissPrompt"
    @complete="followPrompt.markPromptCompleted"
  />
</template>

<script setup lang="ts">
import {
  PuButton,
  PuDrawer,
  PuHeader,
  PuInlineNotice,
  PuLoadingState,
  PuPageScaffold,
  PuSegmented,
  PuSegmentedItem,
} from "@partner-up-dev/design-web";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import OfficialAccountFollowNudge from "@/domains/marketing/ui/OfficialAccountFollowNudge.vue";
import { useOfficialAccountFollowPrompt } from "@/domains/marketing/use-cases/useOfficialAccountFollowPrompt";
import type { PRDiscoveryViewMode } from "@/domains/pr/model/discovery";
import {
  usePRDiscoveryCatalog,
  usePRDiscoveryTypeDetail,
} from "@/domains/pr/queries/usePRDiscovery";
import PRDiscoveryTypeRadioCardCarousel from "@/domains/pr/ui/discovery/list/PRDiscoveryTypeRadioCardCarousel.vue";
import PRDiscoveryPanel from "@/domains/pr/ui/PRDiscoveryPanel.vue";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";
import PageFooter from "@/shared/ui/sections/PageFooter.vue";

type PanelExposed = {
  activeViewMode: PRDiscoveryViewMode;
  setViewMode: (mode: PRDiscoveryViewMode) => void;
  returnToSelection?: () => void;
  formModeResultState?: "selection" | "no-match";
  pageStatePlacement?: "center" | "start";
  isViewResolved: boolean;
  hasLoadFailed: boolean;
};
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { handleBack: handleCatalogBack } = useFallbackBack();
const panelRef = ref<PanelExposed | null>(null);
const showOtherTypes = ref(false);
const selectedOtherType = ref<string | null>(null);
const selectedType = computed(() =>
  typeof route.query.type === "string" && route.query.type.trim() ? route.query.type.trim() : null,
);
const catalogQuery = usePRDiscoveryCatalog();
const otherTypeItems = computed(() =>
  (catalogQuery.data.value ?? []).filter((item) => item.type !== selectedType.value),
);
watch(
  otherTypeItems,
  (items) => {
    if (!items.some((item) => item.type === selectedOtherType.value)) {
      selectedOtherType.value = items[0]?.type ?? null;
    }
  },
  { immediate: true },
);
watch(selectedType, () => {
  selectedOtherType.value = null;
});
const typeDetailQuery = usePRDiscoveryTypeDetail(selectedType);
const selectedTypeDetail = computed(() =>
  typeDetailQuery.data.value?.type === selectedType.value ? typeDetailQuery.data.value : null,
);
const activeViewMode = computed(() => panelRef.value?.activeViewMode ?? "LIST");
const followPrompt = useOfficialAccountFollowPrompt("pr_discovery");
const modeOptions = computed(() => [
  {
    value: "LIST" as const,
    label: t("prDiscovery.viewMode.list"),
    icon: "i-mdi-view-list",
    testId: "prd.mode.list",
  },
  {
    value: "CARD" as const,
    label: t("prDiscovery.viewMode.card"),
    icon: "i-mdi-cards-outline",
    testId: "prd.mode.card",
  },
  {
    value: "FORM" as const,
    label: t("prDiscovery.viewMode.form"),
    icon: "i-mdi-form-select",
    testId: "prd.mode.form",
  },
]);
const handleModeChange = (value: string | number) => {
  if (value === "LIST" || value === "CARD" || value === "FORM") {
    panelRef.value?.setViewMode(value);
  }
};
const handleBack = () => {
  if (panelRef.value?.hasLoadFailed) {
    void router.push({ name: "pr-discovery" });
    return;
  }
  if (activeViewMode.value === "FORM" && panelRef.value?.formModeResultState === "no-match") {
    panelRef.value.returnToSelection?.();
    return;
  }
  if (typeof window !== "undefined" && window.history.state?.back) router.back();
  else void router.push({ name: "pr-discovery" });
};
const openType = (type: string) => {
  showOtherTypes.value = false;
  void router.push({ name: "pr-discovery", query: { type } });
};
onMounted(() => {
  followPrompt.requestPromptAfterDelay(3000);
});
</script>

<style scoped lang="scss">
.pr-discovery-page {
  display: flex;
  flex-direction: column;
  min-width: 0;
  isolation: isolate;
}

.pr-discovery-page :deep(.footer-reveal-page-scaffold__viewport) {
  position: relative;
  z-index: 1;
}

.pr-discovery-page :deep(.footer-reveal-page-scaffold__footer) {
  position: relative;
  z-index: 30;
}

.pr-discovery-page--card :deep(.footer-reveal-page-scaffold__viewport) {
  height: var(--pu-vh);
  overflow: hidden;
}

.pr-discovery-page__header {
  flex-shrink: 0;
}

.pr-discovery-page__footer {
  position: relative;
  z-index: 30;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--sys-color-surface-container);
}

.pr-discovery-page__mode-switch-shell {
  position: sticky;
  top: 0;
  z-index: 40;
  min-width: 0;
  padding-top: var(--sys-spacing-medium);
  padding-left: var(--page-footer-padding-inline-start, 0);
  padding-right: var(--page-footer-padding-inline-end, 0);
  background: var(--sys-color-surface-container);
}

.pr-discovery-page__mode-switch {
  width: 100%;
  max-width: var(--dcs-layout-page-max-width);
  margin-inline: auto;
}
</style>
