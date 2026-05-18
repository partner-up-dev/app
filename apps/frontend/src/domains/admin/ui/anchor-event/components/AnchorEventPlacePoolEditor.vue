<template>
  <div class="anchor-event-place-pool-editor">
    <SegmentedControl
      :model-value="form.placePoolMode"
      :options="placePoolModeOptions"
      :aria-label="t('adminPR.eventPlacePoolModeAria')"
      data-testid="admin-anchor-event.place-pool.mode"
      block
      @update:model-value="handleModeChange"
    />

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
import SegmentedControl, {
  type SegmentedControlOption,
  type SegmentedControlValue,
} from "@/shared/ui/controls/SegmentedControl.vue";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import AnchorEventLocationPoolEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventLocationPoolEditor.vue";
import AnchorEventRoutePoolEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventRoutePoolEditor.vue";

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();

const placePoolModeOptions = computed<SegmentedControlOption[]>(() => [
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

const handleModeChange = (value: SegmentedControlValue): void => {
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
