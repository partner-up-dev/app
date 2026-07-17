<template>
  <AdminRailPanel :title="t('adminPR.filtersTitle')">
    <template v-if="showCreateAction" #actions>
      <PuButton shape="pill" tone="neutral" variant="outline" size="sm" @click="emit('create-pr')">
        {{ t("adminPR.newPRAction") }}
      </PuButton>
    </template>

    <PuFormItem :label="t('adminPR.searchTypeLabel')" for-id="admin-pr-filter-type">
      <PuInput id="admin-pr-filter-type" v-model="filters.type" :list="typeOptionsListId" />
    </PuFormItem>

    <PuFormItem :label="t('adminPR.searchLocationLabel')" for-id="admin-pr-filter-location">
      <PuInput
        id="admin-pr-filter-location"
        v-model="filters.location"
        :list="locationOptionsListId"
      />
    </PuFormItem>

    <PuFormItem :label="t('adminPR.searchStatusLabel')" for-id="admin-pr-filter-status">
      <PuSelect id="admin-pr-filter-status" v-model="filterStatus" :options="statusOptions" />
    </PuFormItem>

    <PuFormItem :label="t('adminPR.searchStartLabel')">
      <PuInput v-model="filters.startAt" native-type="datetime-local" />
    </PuFormItem>

    <PuFormItem :label="t('adminPR.searchEndLabel')">
      <PuInput v-model="filters.endAt" native-type="datetime-local" />
    </PuFormItem>
  </AdminRailPanel>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { AdminPRFilters } from "@/domains/admin/use-cases/pr/useAdminPRWorkspaceSelection";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";
import {
  PuButton,
  PuFormItem,
  PuInput,
  PuSelect,
  type PuSelectOption,
  type PuSelectValue,
} from "@partner-up-dev/design-web";

defineProps<{
  showCreateAction?: boolean;
  typeOptionsListId: string;
  locationOptionsListId: string;
}>();

const emit = defineEmits<{
  "create-pr": [];
}>();

const filters = defineModel<AdminPRFilters>("filters", { required: true });
const { t } = useI18n();

const statusOptions = computed<PuSelectOption[]>(() => [
  { label: t("adminPR.searchStatusAll"), value: "" },
  { label: "DRAFT", value: "DRAFT" },
  { label: "OPEN", value: "OPEN" },
  { label: "READY", value: "READY" },
  { label: "ACTIVE", value: "ACTIVE" },
  { label: "CLOSED", value: "CLOSED" },
  { label: "EXPIRED", value: "EXPIRED" },
]);

const filterStatus = computed({
  get: () => filters.value.status,
  set: (value: PuSelectValue) => {
    filters.value.status = typeof value === "string" ? value : "";
  },
});
</script>
