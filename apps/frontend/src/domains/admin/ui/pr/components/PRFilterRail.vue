<template>
  <AdminRailPanel :title="t('adminPR.filtersTitle')">
    <template v-if="showCreateAction" #actions>
      <Button
        appearance="pill"
        tone="outline"
        size="sm"
        type="button"
        @click="emit('create-pr')"
      >
        {{ t("adminPR.newPRAction") }}
      </Button>
    </template>

    <label class="field">
      <span class="field-label">{{ t("adminPR.searchTypeLabel") }}</span>
      <input v-model="filters.type" class="field-input" :list="typeOptionsListId" />
    </label>

    <label class="field">
      <span class="field-label">{{ t("adminPR.searchLocationLabel") }}</span>
      <input
        v-model="filters.location"
        class="field-input"
        :list="locationOptionsListId"
      />
    </label>

    <label class="field">
      <span class="field-label">{{ t("adminPR.searchStatusLabel") }}</span>
      <select v-model="filters.status" class="field-input">
        <option value="">{{ t("adminPR.searchStatusAll") }}</option>
        <option value="DRAFT">DRAFT</option>
        <option value="OPEN">OPEN</option>
        <option value="READY">READY</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="CLOSED">CLOSED</option>
        <option value="EXPIRED">EXPIRED</option>
      </select>
    </label>

    <label class="field">
      <span class="field-label">{{ t("adminPR.searchStartLabel") }}</span>
      <input v-model="filters.startAt" class="field-input" type="datetime-local" />
    </label>

    <label class="field">
      <span class="field-label">{{ t("adminPR.searchEndLabel") }}</span>
      <input v-model="filters.endAt" class="field-input" type="datetime-local" />
    </label>
  </AdminRailPanel>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AdminPRFilters } from "@/domains/admin/use-cases/pr/useAdminPRWorkspaceSelection";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";
import Button from "@/shared/ui/actions/Button.vue";

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
</script>

<style lang="scss" scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.field-label {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}

.field-input {
  width: 100%;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}
</style>
