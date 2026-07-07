<template>
  <section
    v-if="shouldShowPreferenceControl"
    class="form-mode-preference-control"
  >
    <div class="preference-cell-list">
      <PuCell
        v-for="cell in preferenceCells"
        :key="cell.key"
        as="button"
        class="preference-cell"
        type="button"
        :title="cell.title"
        :value="buildPreferenceCellValue(cell)"
        suffix-icon="i-mdi-chevron-right"
        @click="openPreferenceDrawer(cell)"
      />
    </div>

    <PuInlineNotice
      v-if="preferenceSubmissionMessage"
      tone="error"
      :message="preferenceSubmissionMessage"
    />

    <PuDrawer
      v-model:visible="preferenceDrawerOpen"
      :title="preferenceDrawerTitle"
      height="40vh"
      @close="handlePreferenceDrawerClose"
    >
      <div v-if="activeDrawerCell" class="preference-drawer">
        <section class="preference-group">
          <PuChipGroup class="preference-group__list" wrap gap="sm">
            <PuChip
              v-for="tag in activeDrawerPresetTags"
              :key="tag.label"
              as="button"
              type="button"
              shape="pill"
              :selected="isDrawerTagSelected(tag.label)"
              :tone="isDrawerTagSelected(tag.label) ? 'primary' : 'neutral'"
              :variant="isDrawerTagSelected(tag.label) ? 'soft' : 'outline'"
              :label="formatTagDisplayLabel(tag.label, activeDrawerCell)"
              @click="handleSelectDrawerTag(tag.label)"
            />
          </PuChipGroup>

          <PuFormItem
            class="preference-custom-field"
            :label="t('anchorEvent.formMode.customTagTitle')"
          >
            <PuChipGroup class="preference-custom-field__chips" wrap gap="sm">
              <PuChipInput
                v-for="tag in activeDrawerCustomTags"
                :key="tag.label"
                :model-value="formatTagDisplayLabel(tag.label, activeDrawerCell)"
                shape="pill"
                select-on-focus
                commit-on-blur
                :tone="isDrawerTagSelected(tag.label) ? 'primary' : 'neutral'"
                :variant="isDrawerTagSelected(tag.label) ? 'soft' : 'outline'"
                :remove-label="buildCustomTagRemoveLabel(tag.label)"
                @focus="selectCustomLabel(tag.label)"
                @commit="handleCommitCustomTag(tag.label, $event)"
                @remove="handleRemoveCustomTag(tag.label)"
              />

              <PuChipInput
                :model-value="customTagDraft"
                shape="pill"
                tone="neutral"
                variant="dashed"
                commit-on-blur
                :removable="false"
                :placeholder="t('anchorEvent.formMode.customTagPlaceholder')"
                @update:model-value="handleCustomTagDraftUpdate"
                @commit="handleAddCustomTag"
                @cancel="handleCustomTagDraftUpdate"
              />
            </PuChipGroup>
          </PuFormItem>

          <div v-if="activeDrawerDescription" class="tag-description-panel">
            {{ activeDrawerDescription }}
          </div>
        </section>
      </div>

      <template #footer>
        <div class="drawer-actions">
          <PuButton
            shape="pill"
            tone="neutral"
            variant="outline"
            @click="closePreferenceDrawer"
          >
            {{ t("common.cancel") }}
          </PuButton>
          <PuButton shape="pill" @click="handleSavePreferenceDrawer">
            {{ t("common.confirm") }}
          </PuButton>
        </div>
      </template>
    </PuDrawer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";
import {
  buildPreferenceTagGroups,
  derivePreferenceCategory,
} from "@/domains/event/model/form-mode";
import { useAnchorEventPreferenceTagSubmissions } from "@/domains/event/queries/useAnchorEventPreferenceTagSubmissions";
import {
  PuButton,
  PuCell,
  PuChip,
  PuChipGroup,
  PuChipInput,
  PuDrawer,
  type PuDrawerCloseEvent,
  PuFormItem,
  PuInlineNotice,
} from "@partner-up-dev/design-web";

type FormModePresetTag = AnchorEventFormModeResponse["presetTags"][number];
type PreferenceCell =
  | {
      key: string;
      kind: "category";
      title: string;
      category: string;
    }
  | {
      key: string;
      kind: "uncategorized" | "all";
      title: string;
    };

const props = defineProps<{
  eventId: number;
  modelValue: readonly string[];
  presetTags: readonly FormModePresetTag[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

const { t } = useI18n();
const preferenceTagSubmissionMutation =
  useAnchorEventPreferenceTagSubmissions();

const localCustomTags = ref<FormModePresetTag[]>([]);
const preferenceDrawerOpen = ref(false);
const activeDrawerCell = ref<PreferenceCell | null>(null);
const drawerSelectedCategoryMap = ref<Record<string, string | null>>({});
const drawerSelectedUncategorizedLabels = ref<string[]>([]);
const drawerCustomTags = ref<FormModePresetTag[]>([]);
const customTagDraft = ref("");
const preferenceSubmissionMessage = ref<string | null>(null);

const normalizeTagKey = (label: string): string =>
  label.trim().toLocaleLowerCase("zh-CN");

const mergeTagsByLabel = (
  tags: readonly FormModePresetTag[],
): FormModePresetTag[] => {
  const byLabel = new Map<string, FormModePresetTag>();
  for (const tag of tags) {
    const key = normalizeTagKey(tag.label);
    if (key.length === 0 || byLabel.has(key)) {
      continue;
    }
    byLabel.set(key, tag);
  }
  return Array.from(byLabel.values());
};

const shouldShowPreferenceControl = computed(() => props.presetTags.length > 0);

const effectivePresetTags = computed<FormModePresetTag[]>(() =>
  mergeTagsByLabel([...props.presetTags, ...localCustomTags.value]),
);

const drawerEffectiveTags = computed<FormModePresetTag[]>(() =>
  mergeTagsByLabel([...props.presetTags, ...drawerCustomTags.value]),
);

const presetTagKeys = computed(
  () => new Set(props.presetTags.map((tag) => normalizeTagKey(tag.label))),
);

const preferenceTagGroups = computed(() =>
  buildPreferenceTagGroups(effectivePresetTags.value),
);

const drawerPresetTagGroups = computed(() =>
  buildPreferenceTagGroups(props.presetTags),
);

const preferenceCells = computed<PreferenceCell[]>(() => {
  const groups = preferenceTagGroups.value;
  if (groups.categorized.length === 0) {
    return [
      {
        key: "all",
        kind: "all",
        title: t("anchorEvent.formMode.preferencePlaceholder"),
      },
    ];
  }

  const cells: PreferenceCell[] = groups.categorized.map((group) => ({
    key: `category:${group.category}`,
    kind: "category",
    title: group.category,
    category: group.category,
  }));

  if (groups.uncategorized.length > 0) {
    cells.push({
      key: "uncategorized",
      kind: "uncategorized",
      title: groups.uncategorizedLabel,
    });
  }

  return cells;
});

const preferenceDrawerTitle = computed(() => {
  const cell = activeDrawerCell.value;
  if (!cell || cell.kind === "all") {
    return t("anchorEvent.formMode.preferenceDrawerTitle");
  }

  return t("anchorEvent.formMode.preferenceCategoryDrawerTitle", {
    category: cell.title,
  });
});

const isTagInPreferenceCell = (
  tag: FormModePresetTag,
  cell: PreferenceCell,
): boolean => {
  const category = derivePreferenceCategory(tag.label);
  if (cell.kind === "category") {
    return category === cell.category;
  }

  return category === null;
};

const activeDrawerPresetTags = computed<FormModePresetTag[]>(() => {
  const cell = activeDrawerCell.value;
  if (!cell) {
    return [];
  }

  const groups = drawerPresetTagGroups.value;
  if (cell.kind === "category") {
    return (
      groups.categorized.find((group) => group.category === cell.category)
        ?.tags ?? []
    );
  }

  if (cell.kind === "uncategorized") {
    return groups.uncategorized;
  }

  return groups.categorized.length === 0 ? groups.uncategorized : [];
});

const activeDrawerCustomTags = computed<FormModePresetTag[]>(() => {
  const cell = activeDrawerCell.value;
  if (!cell) {
    return [];
  }

  return mergeTagsByLabel(drawerCustomTags.value).filter(
    (tag) =>
      !presetTagKeys.value.has(normalizeTagKey(tag.label)) &&
      isTagInPreferenceCell(tag, cell),
  );
});

const activeDrawerSelectedLabel = computed(() => {
  const cell = activeDrawerCell.value;
  if (!cell) {
    return null;
  }

  if (cell.kind === "category") {
    return drawerSelectedCategoryMap.value[cell.category] ?? null;
  }

  return drawerSelectedUncategorizedLabels.value[0] ?? null;
});

const activeDrawerDescription = computed(() => {
  const selectedLabel = activeDrawerSelectedLabel.value;
  if (!selectedLabel) {
    return "";
  }

  const selectedTag = activeDrawerPresetTags.value.find(
    (tag) => tag.label === selectedLabel,
  );
  return selectedTag?.description.trim() ?? "";
});

const stripCategoryPrefix = (label: string, category: string): string => {
  const normalized = label.trim();
  const separatorIndex = normalized.indexOf(":");
  if (separatorIndex < 0) {
    return normalized;
  }

  const labelCategory = normalized.slice(0, separatorIndex).trim();
  if (
    labelCategory.toLocaleLowerCase("zh-CN") !==
    category.toLocaleLowerCase("zh-CN")
  ) {
    return normalized;
  }

  return normalized.slice(separatorIndex + 1).trim() || normalized;
};

const stripAnyCategoryPrefix = (label: string): string => {
  const normalized = label.trim();
  const separatorIndex = normalized.indexOf(":");
  if (separatorIndex < 0) {
    return normalized;
  }

  return normalized.slice(separatorIndex + 1).trim() || normalized;
};

const formatTagDisplayLabel = (label: string, cell: PreferenceCell): string =>
  cell.kind === "category" ? stripCategoryPrefix(label, cell.category) : label;

const buildCustomTagRemoveLabel = (label: string): string => {
  const cell = activeDrawerCell.value;
  return t("anchorEvent.formMode.removeCustomTagAction", {
    label: cell ? formatTagDisplayLabel(label, cell) : label,
  });
};

const buildPreferenceCellValue = (cell: PreferenceCell): string => {
  if (cell.kind === "category") {
    const selected = props.modelValue.find(
      (label) => derivePreferenceCategory(label) === cell.category,
    );
    return selected ? formatTagDisplayLabel(selected, cell) : "";
  }

  const values = props.modelValue.filter(
    (label) => derivePreferenceCategory(label) === null,
  );
  return values.map((label) => formatTagDisplayLabel(label, cell)).join("、");
};

const openPreferenceDrawer = (cell: PreferenceCell) => {
  activeDrawerCell.value = cell;
  const nextCategoryMap: Record<string, string | null> = {};
  const nextUncategorized: string[] = [];

  for (const preference of props.modelValue) {
    const category = derivePreferenceCategory(preference);
    if (category) {
      nextCategoryMap[category] = preference;
      continue;
    }
    nextUncategorized.push(preference);
  }

  drawerSelectedCategoryMap.value = nextCategoryMap;
  drawerSelectedUncategorizedLabels.value = [...nextUncategorized];
  drawerCustomTags.value = [...localCustomTags.value];
  customTagDraft.value = "";
  preferenceDrawerOpen.value = true;
};

const closePreferenceDrawer = () => {
  preferenceDrawerOpen.value = false;
  activeDrawerCell.value = null;
};

const handlePreferenceDrawerClose = async ({
  reason,
}: PuDrawerCloseEvent): Promise<void> => {
  if (reason === "overlay") {
    await handleSavePreferenceDrawer();
    return;
  }

  closePreferenceDrawer();
};

const handleSelectDrawerCategoryTag = (category: string, label: string) => {
  drawerSelectedCategoryMap.value = {
    ...drawerSelectedCategoryMap.value,
    [category]:
      drawerSelectedCategoryMap.value[category] === label ? null : label,
  };
};

const handleToggleDrawerUncategorizedTag = (label: string) => {
  if (drawerSelectedUncategorizedLabels.value.includes(label)) {
    drawerSelectedUncategorizedLabels.value =
      drawerSelectedUncategorizedLabels.value.filter((item) => item !== label);
    return;
  }
  drawerSelectedUncategorizedLabels.value = [
    ...drawerSelectedUncategorizedLabels.value,
    label,
  ];
};

const isDrawerTagSelected = (label: string): boolean => {
  const cell = activeDrawerCell.value;
  if (!cell) {
    return false;
  }

  if (cell.kind === "category") {
    return drawerSelectedCategoryMap.value[cell.category] === label;
  }

  return drawerSelectedUncategorizedLabels.value.includes(label);
};

const handleSelectDrawerTag = (label: string) => {
  const cell = activeDrawerCell.value;
  if (!cell) {
    return;
  }

  if (cell.kind === "category") {
    handleSelectDrawerCategoryTag(cell.category, label);
    return;
  }

  handleToggleDrawerUncategorizedTag(label);
};

const buildCustomTagLabelForActiveCell = (value: string): string | null => {
  const cell = activeDrawerCell.value;
  if (!cell) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  if (cell.kind !== "category") {
    return normalized;
  }

  const label = stripAnyCategoryPrefix(normalized);
  return label ? `${cell.category}:${label}` : null;
};

const selectCustomLabel = (label: string) => {
  const cell = activeDrawerCell.value;
  if (!cell) {
    return;
  }

  if (cell.kind === "category") {
    drawerSelectedCategoryMap.value = {
      ...drawerSelectedCategoryMap.value,
      [cell.category]: label,
    };
    return;
  }

  if (!drawerSelectedUncategorizedLabels.value.includes(label)) {
    drawerSelectedUncategorizedLabels.value = [
      ...drawerSelectedUncategorizedLabels.value,
      label,
    ];
  }
};

const replaceDrawerSelection = (previousLabel: string, nextLabel: string) => {
  const category = derivePreferenceCategory(previousLabel);
  if (category) {
    if (drawerSelectedCategoryMap.value[category] !== previousLabel) {
      return;
    }
    drawerSelectedCategoryMap.value = {
      ...drawerSelectedCategoryMap.value,
      [category]: nextLabel,
    };
    return;
  }

  drawerSelectedUncategorizedLabels.value =
    drawerSelectedUncategorizedLabels.value.map((item) =>
      item === previousLabel ? nextLabel : item,
    );
};

const removeDrawerSelection = (label: string) => {
  const category = derivePreferenceCategory(label);
  if (category) {
    if (drawerSelectedCategoryMap.value[category] !== label) {
      return;
    }
    drawerSelectedCategoryMap.value = {
      ...drawerSelectedCategoryMap.value,
      [category]: null,
    };
    return;
  }

  drawerSelectedUncategorizedLabels.value =
    drawerSelectedUncategorizedLabels.value.filter((item) => item !== label);
};

const handleRemoveCustomTag = (label: string) => {
  const key = normalizeTagKey(label);
  drawerCustomTags.value = drawerCustomTags.value.filter(
    (tag) => normalizeTagKey(tag.label) !== key,
  );
  removeDrawerSelection(label);
};

const handleCustomTagDraftUpdate = (value: string) => {
  customTagDraft.value = value;
};

const hasDrawerTagLabel = (label: string, exceptLabel?: string): boolean => {
  const key = normalizeTagKey(label);
  const exceptKey = exceptLabel ? normalizeTagKey(exceptLabel) : null;
  return drawerEffectiveTags.value.some((tag) => {
    const tagKey = normalizeTagKey(tag.label);
    return tagKey === key && tagKey !== exceptKey;
  });
};

const handleCommitCustomTag = (previousLabel: string, value: string) => {
  const normalized = buildCustomTagLabelForActiveCell(value);
  if (!normalized) {
    handleRemoveCustomTag(previousLabel);
    return;
  }

  if (hasDrawerTagLabel(normalized, previousLabel)) {
    handleRemoveCustomTag(previousLabel);
    selectCustomLabel(normalized);
    return;
  }

  const previousKey = normalizeTagKey(previousLabel);
  drawerCustomTags.value = drawerCustomTags.value.map((tag) =>
    normalizeTagKey(tag.label) === previousKey
      ? {
          ...tag,
          label: normalized,
        }
      : tag,
  );
  replaceDrawerSelection(previousLabel, normalized);
  selectCustomLabel(normalized);
};

const handleAddCustomTag = (value: string) => {
  const normalized = buildCustomTagLabelForActiveCell(value);
  if (!normalized) {
    return;
  }

  if (!hasDrawerTagLabel(normalized)) {
    const tag = {
      id: -Date.now(),
      label: normalized,
      description: "",
    };
    drawerCustomTags.value = [...drawerCustomTags.value, tag];
  }

  selectCustomLabel(normalized);
  customTagDraft.value = "";
};

const handleSavePreferenceDrawer = async () => {
  const nextSelectedPreferences = [
    ...Object.values(drawerSelectedCategoryMap.value).filter(
      (value): value is string => Boolean(value),
    ),
    ...drawerSelectedUncategorizedLabels.value,
  ];

  const existingLocalKeys = new Set(
    localCustomTags.value.map((tag) => normalizeTagKey(tag.label)),
  );
  const newCustomLabels = drawerCustomTags.value
    .filter((tag) => !existingLocalKeys.has(normalizeTagKey(tag.label)))
    .map((tag) => tag.label);

  localCustomTags.value = [...drawerCustomTags.value];
  emit("update:modelValue", Array.from(new Set(nextSelectedPreferences)));
  closePreferenceDrawer();

  if (newCustomLabels.length === 0) {
    return;
  }

  try {
    await preferenceTagSubmissionMutation.mutateAsync({
      eventId: props.eventId,
      labels: newCustomLabels,
    });
    preferenceSubmissionMessage.value = null;
  } catch {
    preferenceSubmissionMessage.value = t(
      "anchorEvent.formMode.customTagSubmitFailed",
    );
  }
};
</script>

<style lang="scss" scoped>
.form-mode-preference-control,
.preference-cell-list,
.preference-drawer,
.preference-group {
  display: flex;
  flex-direction: column;
}

.form-mode-preference-control {
  gap: var(--sys-spacing-xsmall);
}

.preference-drawer {
  min-height: 40vh;
  gap: var(--sys-spacing-large);
}

.preference-group {
  gap: var(--sys-spacing-medium);
}

.preference-custom-field {
  margin: 0;
}

.drawer-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
}

.drawer-actions > :deep(button) {
  width: 100%;
}

.tag-description-panel {
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container-low);
  color: var(--sys-color-on-surface-variant);
  white-space: pre-line;
  @include mx.pu-font(body);
}
</style>
