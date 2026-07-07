<template>
  <div class="anchor-event-place-pool-editor">
    <PuSegmented
      :model-value="form.placePoolMode"
      :aria-label="t('adminPR.eventPlacePoolModeAria')"
      data-testid="admin-anchor-event.place-pool.mode"
      full-width
      equal-width
      @update:model-value="handleModeChange"
    >
      <PuSegmentedItem
        v-for="option in placePoolModeOptions"
        :key="String(option.value)"
        :value="option.value"
        :label="option.label"
        :disabled="option.disabled"
        :data-testid="option.testId"
      >
        <template v-if="option.icon" #leading>
          <span :class="option.icon" aria-hidden="true" />
        </template>
      </PuSegmentedItem>
    </PuSegmented>

    <AnchorEventLocationPoolEditor
      v-if="form.placePoolMode === 'location'"
      v-model="form"
    />

    <AnchorEventRoutePoolEditor
      v-else
      v-model="form"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  PuSegmented,
  PuSegmentedItem,
  type PuSegmentedValue,
} from "@partner-up-dev/design-web";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import AnchorEventLocationPoolEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventLocationPoolEditor.vue";
import AnchorEventRoutePoolEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventRoutePoolEditor.vue";

type SegmentedOption = {
  value: PuSegmentedValue;
  label: string;
  icon?: string;
  testId?: string;
  disabled?: boolean;
};

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();

const placePoolModeOptions = computed<SegmentedOption[]>(() => [
  {
    value: "location",
    label: t("adminPR.eventPlacePoolModeLocation"),
    icon: "i-mdi-map-marker",
    testId: "admin-anchor-event.place-pool.mode.location",
  },
  {
    value: "route",
    label: t("adminPR.eventPlacePoolModeRoute"),
    icon: "i-mdi-routes",
    testId: "admin-anchor-event.place-pool.mode.route",
  },
]);

const handleModeChange = (value: PuSegmentedValue): void => {
  if (value !== "location" && value !== "route") {
    return;
  }

  form.value = {
    ...form.value,
    placePoolMode: value,
  };
};
</script>

<style scoped lang="scss">
.anchor-event-place-pool-editor {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}
</style>
