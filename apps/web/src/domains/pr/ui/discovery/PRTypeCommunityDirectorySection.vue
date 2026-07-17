<template>
  <section
    id="type-communities"
    class="pr-type-community-directory about-item"
    :aria-label="t('aboutPage.typeCommunities.sectionTitle')"
    data-testid="about.type-communities"
  >
    <div class="pr-type-community-directory__header">
      <h2>{{ t("aboutPage.typeCommunities.title") }}</h2>
      <p>{{ t("aboutPage.typeCommunities.description") }}</p>
    </div>

    <p v-if="catalogQuery.isLoading.value" class="pr-type-community-directory__state">
      {{ t("aboutPage.typeCommunities.loading") }}
    </p>
    <p
      v-else-if="catalogQuery.error.value"
      class="pr-type-community-directory__state pr-type-community-directory__state--error"
    >
      {{ t("aboutPage.typeCommunities.loadFailed") }}
    </p>
    <p v-else-if="catalogItems.length === 0" class="pr-type-community-directory__state">
      {{ t("aboutPage.typeCommunities.empty") }}
    </p>
    <div v-else class="pr-type-community-directory__list">
      <div v-for="item in catalogItems" :key="item.type" class="pr-type-community-directory__row">
        <span class="pr-type-community-directory__label">{{ item.title }}</span>
        <button
          type="button"
          class="pr-type-community-directory__action"
          data-testid="about.type-community.open"
          @click="openCommunity(item.type)"
        >
          {{ t("aboutPage.typeCommunities.action") }}
        </button>
      </div>
    </div>

    <PuModal
      :open="selectedType !== null"
      :title="modalTitle"
      max-width="420px"
      @close="closeCommunity"
    >
      <div class="pr-type-community-directory__modal">
        <p
          v-if="
            typeDetailQuery.isLoading.value ||
            (selectedTypeDetail === null && !typeDetailQuery.error.value)
          "
          class="pr-type-community-directory__state"
        >
          {{ t("common.loading") }}
        </p>
        <p
          v-else-if="typeDetailQuery.error.value"
          class="pr-type-community-directory__state pr-type-community-directory__state--error"
        >
          {{ t("aboutPage.typeCommunities.loadFailed") }}
        </p>
        <PRTypeCommunityQrPanel
          v-else
          :type-title="selectedTypeTitle"
          :qr-code-url="selectedTypeDetail?.communityQrCode ?? null"
        />
      </div>
    </PuModal>
  </section>
</template>

<script setup lang="ts">
import { PuModal } from "@partner-up-dev/design-web";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  usePRDiscoveryCatalog,
  usePRDiscoveryTypeDetail,
} from "@/domains/pr/queries/usePRDiscovery";
import PRTypeCommunityQrPanel from "@/domains/pr/ui/discovery/PRTypeCommunityQrPanel.vue";

const { t } = useI18n();
const catalogQuery = usePRDiscoveryCatalog();
const selectedType = ref<string | null>(null);
const typeDetailQuery = usePRDiscoveryTypeDetail(selectedType);

const catalogItems = computed(() => catalogQuery.data.value ?? []);
const selectedTypeItem = computed(
  () => catalogItems.value.find((item) => item.type === selectedType.value) ?? null,
);
const selectedTypeDetail = computed(() =>
  typeDetailQuery.data.value?.type === selectedType.value ? typeDetailQuery.data.value : null,
);
const selectedTypeTitle = computed(
  () => selectedTypeItem.value?.title ?? selectedTypeDetail.value?.title ?? "",
);
const modalTitle = computed(() =>
  t("aboutPage.typeCommunities.modalTitle", { typeTitle: selectedTypeTitle.value }),
);

const openCommunity = (type: string): void => {
  selectedType.value = type;
};

const closeCommunity = (): void => {
  selectedType.value = null;
};
</script>

<style scoped lang="scss">
.pr-type-community-directory {
  display: grid;
  gap: var(--sys-spacing-small);
}

.pr-type-community-directory__header {
  display: grid;
  gap: var(--sys-spacing-xsmall);

  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(section);
    color: var(--sys-color-on-surface);
  }

  p {
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
  }
}

.pr-type-community-directory__state {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.pr-type-community-directory__state--error {
  color: var(--sys-color-error);
}

.pr-type-community-directory__list {
  display: grid;
}

.pr-type-community-directory__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sys-spacing-small);
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  padding: var(--sys-spacing-small) 0;
}

.pr-type-community-directory__row + .pr-type-community-directory__row {
  border-top: 1px solid var(--sys-color-outline-variant);
}

.pr-type-community-directory__label {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface);
  overflow-wrap: anywhere;
}

.pr-type-community-directory__action {
  appearance: none;
  border: 0;
  padding: var(--sys-spacing-xsmall);
  background: transparent;
  @include mx.pu-font(control);
  color: var(--sys-color-primary);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 0.14em;
}

.pr-type-community-directory__action:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 2px;
  border-radius: var(--sys-radius-xsmall);
}

.pr-type-community-directory__modal {
  display: grid;
  justify-items: center;
  gap: var(--sys-spacing-small);
}
</style>
