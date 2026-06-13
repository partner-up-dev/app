<template>
  <div class="preference-tag-pool-editor">
    <PuLoadingState
      v-if="preferenceTagsQuery.isLoading.value"
      :message="t('common.loading')"
    />

    <p v-else-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </p>

    <p v-else-if="tagRows.length === 0" class="hint">
      {{ t("adminAnchorEvents.emptyPublishedPreferenceTags") }}
    </p>

    <div v-else class="preference-tag-pool-editor__rows">
      <article
        v-for="row in tagRows"
        :key="row.id"
        class="preference-tag-pool-editor__row"
      >
        <label class="field">
          <span class="field-label">
            {{ t("adminAnchorEvents.preferenceTagLabel") }}
          </span>
          <input v-model="row.label" class="field-input" />
        </label>

        <label class="field">
          <span class="field-label">
            {{ t("adminAnchorEvents.preferenceTagDescription") }}
          </span>
          <input v-model="row.description" class="field-input" />
        </label>

        <Button
          appearance="pill"
          tone="outline"
          size="sm"
          type="button"
          @click="removeRow(row.id)"
        >
          {{ t("adminAnchorEvents.removePreferenceTagAction") }}
        </Button>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";
import { PuLoadingState } from "@partner-up-dev/design-web";
import {
  useAdminAnchorEventPreferenceTags,
  useReplaceAdminAnchorEventPreferenceTags,
} from "@/domains/admin/queries/useAdminAnchorEventPreferenceTags";

type PreferenceTagFormRow = {
  id: number | string;
  label: string;
  description: string;
};

const props = withDefaults(
  defineProps<{
    eventId: number | null;
    enabled?: boolean;
  }>(),
  {
    enabled: true,
  },
);

const { t } = useI18n();
const tagRows = ref<PreferenceTagFormRow[]>([]);
const eventId = computed(() => props.eventId);
const isQueryEnabled = computed(() => props.enabled && props.eventId !== null);
const preferenceTagsQuery = useAdminAnchorEventPreferenceTags(
  eventId,
  isQueryEnabled,
);
const replacePreferenceTagsMutation = useReplaceAdminAnchorEventPreferenceTags();

const errorMessage = computed(
  () =>
    preferenceTagsQuery.error.value?.message ||
    replacePreferenceTagsMutation.error.value?.message ||
    null,
);

const normalizeRows = (
  rows: PreferenceTagFormRow[],
): Array<{ label: string; description: string | null }> =>
  rows
    .map((row) => ({
      label: row.label.trim(),
      description: row.description.trim() || null,
    }))
    .filter((row) => row.label.length > 0);

watch(
  [() => preferenceTagsQuery.data.value, isQueryEnabled],
  ([preferenceTags, enabled]) => {
    if (!enabled || !preferenceTags) {
      tagRows.value = [];
      return;
    }

    tagRows.value = preferenceTags.publishedTags.map((tag) => ({
      id: tag.id,
      label: tag.label,
      description: tag.description,
    }));
  },
  { immediate: true },
);

const addRow = (): void => {
  tagRows.value = [
    ...tagRows.value,
    {
      id: `draft-${Date.now()}`,
      label: "",
      description: "",
    },
  ];
};

const removeRow = (rowId: number | string): void => {
  tagRows.value = tagRows.value.filter((row) => row.id !== rowId);
};

const save = async (): Promise<void> => {
  if (!props.enabled || props.eventId === null) {
    return;
  }

  try {
    await replacePreferenceTagsMutation.mutateAsync({
      eventId: props.eventId,
      tags: normalizeRows(tagRows.value),
    });
  } catch {
    // Mutation state drives the local error message.
  }
};

defineExpose({
  addRow,
  save,
  get isSaving() {
    return replacePreferenceTagsMutation.isPending.value;
  },
});
</script>

<style lang="scss" scoped>
.preference-tag-pool-editor,
.preference-tag-pool-editor__rows,
.preference-tag-pool-editor__row,
.field {
  display: flex;
  flex-direction: column;
}

.preference-tag-pool-editor,
.preference-tag-pool-editor__rows,
.preference-tag-pool-editor__row {
  gap: var(--sys-spacing-small);
}

.preference-tag-pool-editor__row {
  padding-block: var(--sys-spacing-small);
  border-top: 1px solid var(--sys-color-outline-variant);
}

.preference-tag-pool-editor__row:first-child {
  padding-top: 0;
  border-top: 0;
}

.field {
  gap: var(--sys-spacing-xsmall);
}

.field-label {
  @include mx.pu-font(control);
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

.hint {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.error-message {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-error);
}
</style>
