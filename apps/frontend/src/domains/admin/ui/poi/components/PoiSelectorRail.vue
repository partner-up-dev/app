<template>
  <AdminRailPanel :title="t('adminPois.poiListTitle')">
    <p class="hint">{{ t("adminPois.poiCount", { count: pois.length }) }}</p>

    <PuFormItem :label="t('adminPois.poiLabel')" for-id="admin-poi-selector">
      <PuSelect
        id="admin-poi-selector"
        v-model="selectedPoiId"
        :options="poiOptions"
      />
    </PuFormItem>

    <div class="divider" aria-hidden="true" />

    <section class="create-poi">
      <h3 class="create-poi__title">{{ t("adminPois.createPoiTitle") }}</h3>
      <PuFormItem :label="t('adminPois.newPoiLabel')" for-id="admin-poi-new-name">
        <PuInput
          id="admin-poi-new-name"
          v-model="newPoiName"
          :placeholder="t('adminPois.newPoiPlaceholder')"
        />
      </PuFormItem>
      <PuButton
        shape="pill"
        tone="neutral" variant="outline"
        size="sm"

        :disabled="isCreatingPoi || !canCreatePoi"
        @click="emit('create-poi')"
      >
        {{
          isCreatingPoi
            ? t("adminPois.creatingPoi")
            : t("adminPois.createPoiAction")
        }}
      </PuButton>
    </section>
  </AdminRailPanel>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { AdminPoisResponse } from "@/domains/admin/queries/useAdminPoiManagement";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";
import {
  PuButton,
  PuFormItem,
  PuInput,
  PuSelect,
  type PuSelectOption,
  type PuSelectValue,
} from "@partner-up-dev/design-web";

type PoiRecord = NonNullable<AdminPoisResponse>[number];
type PoiStatus = PoiRecord["status"];

const props = defineProps<{
  modelValue: string;
  pois: PoiRecord[];
  canCreatePoi: boolean;
  isCreatingPoi: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "create-poi": [];
}>();

const newPoiName = defineModel<string>("newPoiName", { required: true });
const { t } = useI18n();

const poiOptions = computed<PuSelectOption[]>(() => [
  { label: t("adminPois.poiPlaceholder"), value: "" },
  ...props.pois.map((poi) => ({
    label: `#${poi.id} · ${poi.name} · ${statusLabel(poi.status)}`,
    value: String(poi.id),
  })),
]);

const selectedPoiId = computed({
  get: () => props.modelValue,
  set: (value: PuSelectValue) => {
    emit("update:modelValue", typeof value === "string" ? value : "");
  },
});

const statusLabel = (status: PoiStatus): string => {
  switch (status) {
    case "PENDING":
      return t("adminPois.statusPending");
    case "PUBLISHED":
      return t("adminPois.statusPublished");
    case "REJECTED":
      return t("adminPois.statusRejected");
  }
};
</script>

<style lang="scss" scoped>
.hint {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.divider {
  height: 1px;
  background: var(--sys-color-outline-variant);
}

.create-poi {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.create-poi__title {
  @include mx.pu-font(section);
  margin: 0;
  color: var(--sys-color-on-surface);
}
</style>
