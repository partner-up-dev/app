<template>
  <section
    v-if="shouldShowPreferenceControl"
    class="form-mode-preference-control"
  >
    <div class="preference-cell-list">
      <Cell
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

    <p
      v-if="preferenceSubmissionMessage"
      class="inline-message inline-message--error"
    >
      {{ preferenceSubmissionMessage }}
    </p>

    <BottomDrawer
      :open="preferenceDrawerOpen"
      :title="preferenceDrawerTitle"
      min-height="40vh"
      @close="handlePreferenceDrawerClose"
    >
      <div v-if="activeDrawerCell" class="preference-drawer">
        <section class="preference-group">
          <div class="preference-group__list">
            <div
              v-for="tag in activeDrawerTags"
              :key="tag.label"
              class="tag-pill"
              :class="{
                'tag-pill--selected': isDrawerTagSelected(tag.label),
                'tag-pill--removable': isDrawerCustomTag(tag.label),
              }"
            >
              <button
                class="tag-pill__main"
                type="button"
                @click="handleSelectDrawerTag(tag.label)"
              >
                <span class="tag-pill__label">
                  {{ formatTagDisplayLabel(tag.label, activeDrawerCell) }}
                </span>
              </button>

              <button
                v-if="isDrawerCustomTag(tag.label)"
                class="tag-pill__remove"
                type="button"
                :aria-label="
                  t('anchorEvent.formMode.removeCustomTagAction', {
                    label: formatTagDisplayLabel(tag.label, activeDrawerCell),
                  })
                "
                @click="handleRemoveCustomTag(tag.label)"
              >
                <span class="i-mdi-close" aria-hidden="true"></span>
              </button>
            </div>

            <div v-if="drawerCustomTagEditing" class="tag-pill tag-pill--draft">
              <input
                v-model.trim="drawerCustomTagInput"
                class="tag-pill__input"
                :placeholder="t('anchorEvent.formMode.customTagPlaceholder')"
                type="text"
                maxlength="80"
                @keydown.enter.prevent="handleAddCustomTag"
                @keydown.esc.prevent="cancelCustomTagDraft"
              />
              <button
                class="tag-pill__remove"
                type="button"
                :aria-label="t('common.cancel')"
                @click="cancelCustomTagDraft"
              >
                <span
                  class="i-mdi-close tag-pill__close"
                  aria-hidden="true"
                ></span>
              </button>
            </div>

            <button
              v-else
              class="tag-pill tag-pill--add"
              type="button"
              :aria-label="t('anchorEvent.formMode.addCustomTagAction')"
              @click="openCustomTagDraft"
            >
              <span class="tag-pill__plus" aria-hidden="true">+</span>
            </button>
          </div>

          <p
            v-if="drawerCustomTagMessage"
            class="inline-message inline-message--error"
          >
            {{ drawerCustomTagMessage }}
          </p>

          <div v-if="activeDrawerDescription" class="tag-description-panel">
            {{ activeDrawerDescription }}
          </div>
        </section>
      </div>

      <template #footer>
        <div class="drawer-actions">
          <Button
            appearance="pill"
            tone="outline"
            type="button"
            @click="closePreferenceDrawer"
          >
            {{ t("common.cancel") }}
          </Button>
          <Button
            appearance="pill"
            type="button"
            @click="handleSavePreferenceDrawer"
          >
            {{ t("common.confirm") }}
          </Button>
        </div>
      </template>
    </BottomDrawer>
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
import Button from "@/shared/ui/actions/Button.vue";
import Cell from "@/shared/ui/display/Cell.vue";
import BottomDrawer from "@/shared/ui/overlay/BottomDrawer.vue";

type FormModePresetTag = AnchorEventFormModeResponse["presetTags"][number];
type BottomDrawerCloseReason = "backdrop" | "close-button" | "escape";
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
const drawerCustomTagEditing = ref(false);
const drawerCustomTagInput = ref("");
const drawerCustomTagMessage = ref<string | null>(null);
const preferenceSubmissionMessage = ref<string | null>(null);

const mergeTagsByLabel = (
  tags: readonly FormModePresetTag[],
): FormModePresetTag[] => {
  const byLabel = new Map<string, FormModePresetTag>();
  for (const tag of tags) {
    const key = tag.label.trim().toLocaleLowerCase("zh-CN");
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

const preferenceTagGroups = computed(() =>
  buildPreferenceTagGroups(effectivePresetTags.value),
);

const drawerTagGroups = computed(() =>
  buildPreferenceTagGroups(drawerEffectiveTags.value),
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

const activeDrawerTags = computed<FormModePresetTag[]>(() => {
  const cell = activeDrawerCell.value;
  if (!cell) {
    return [];
  }

  const groups = drawerTagGroups.value;
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

  const selectedTag = activeDrawerTags.value.find(
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
  drawerCustomTagMessage.value = null;
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
  drawerCustomTagEditing.value = false;
  drawerCustomTagInput.value = "";
  preferenceDrawerOpen.value = true;
};

const closePreferenceDrawer = () => {
  preferenceDrawerOpen.value = false;
  activeDrawerCell.value = null;
  drawerCustomTagEditing.value = false;
  drawerCustomTagInput.value = "";
  drawerCustomTagMessage.value = null;
};

const handlePreferenceDrawerClose = async (
  reason: BottomDrawerCloseReason,
): Promise<void> => {
  if (reason === "backdrop") {
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

const drawerCustomTagKeys = computed(
  () =>
    new Set(
      drawerCustomTags.value.map((tag) =>
        tag.label.trim().toLocaleLowerCase("zh-CN"),
      ),
    ),
);

const isDrawerCustomTag = (label: string): boolean =>
  drawerCustomTagKeys.value.has(label.trim().toLocaleLowerCase("zh-CN"));

const openCustomTagDraft = () => {
  drawerCustomTagMessage.value = null;
  drawerCustomTagInput.value = "";
  drawerCustomTagEditing.value = true;
};

const cancelCustomTagDraft = () => {
  drawerCustomTagInput.value = "";
  drawerCustomTagMessage.value = null;
  drawerCustomTagEditing.value = false;
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
  const key = label.trim().toLocaleLowerCase("zh-CN");
  drawerCustomTags.value = drawerCustomTags.value.filter(
    (tag) => tag.label.trim().toLocaleLowerCase("zh-CN") !== key,
  );
  removeDrawerSelection(label);
};

const handleAddCustomTag = () => {
  drawerCustomTagMessage.value = null;
  const normalized = buildCustomTagLabelForActiveCell(
    drawerCustomTagInput.value,
  );
  if (!normalized) {
    return;
  }

  const knownLabels = new Set(
    [...drawerEffectiveTags.value, ...drawerCustomTags.value].map((tag) =>
      tag.label.trim().toLocaleLowerCase("zh-CN"),
    ),
  );
  const key = normalized.toLocaleLowerCase("zh-CN");
  if (!knownLabels.has(key)) {
    const tag = {
      id: -Date.now(),
      label: normalized,
      description: "",
    };
    drawerCustomTags.value = [...drawerCustomTags.value, tag];
  }

  selectCustomLabel(normalized);
  drawerCustomTagInput.value = "";
  drawerCustomTagEditing.value = false;
};

const handleSavePreferenceDrawer = async () => {
  const nextSelectedPreferences = [
    ...Object.values(drawerSelectedCategoryMap.value).filter(
      (value): value is string => Boolean(value),
    ),
    ...drawerSelectedUncategorizedLabels.value,
  ];

  const existingLocalKeys = new Set(
    localCustomTags.value.map((tag) =>
      tag.label.trim().toLocaleLowerCase("zh-CN"),
    ),
  );
  const newCustomLabels = drawerCustomTags.value
    .filter(
      (tag) =>
        !existingLocalKeys.has(tag.label.trim().toLocaleLowerCase("zh-CN")),
    )
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

.preference-group__title {
  margin: 0;
  @include mx.pu-font(section);
}

.preference-group__list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-small);
}

.tag-pill {
  display: inline-flex;
  align-items: stretch;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  min-width: calc(calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall)) + var(--sys-spacing-large));
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-pill);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  text-align: left;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    transform 180ms ease;
}

.tag-pill--selected {
  border-color: var(--sys-color-primary);
  background: var(--sys-color-primary-container);
}

.tag-pill--add,
.tag-pill--draft {
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  min-height: var(--sys-spacing-large);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-medium);
}

.tag-pill--add {
  justify-content: center;
  border-color: var(--sys-color-secondary);
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
  cursor: pointer;
}

.tag-pill--draft {
  border-color: var(--sys-color-secondary);
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
}

.tag-pill__main {
  display: inline-flex;
  flex-direction: column;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
  padding: var(--sys-spacing-small);
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: center;
}

.tag-pill--removable .tag-pill__main {
  padding-right: calc(var(--sys-spacing-xsmall) / 2);
}

.tag-pill__label {
  @include mx.pu-font(control);
}

.tag-pill__plus {
  color: inherit;
  @include mx.pu-icon(small, true);
}

.tag-pill__close {
  color: inherit;
  @include mx.pu-icon(small, true);
}

.tag-pill__input {
  width: min(12rem, 20vw);
  min-width: 7rem;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  @include mx.pu-font(body);
}

.tag-pill__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: currentColor;
  cursor: pointer;
}

.tag-pill__remove:hover {
  background: var(--sys-color-surface-container-high);
}

.tag-pill__remove :deep([class^="i-"]),
.tag-pill__remove :deep([class*=" i-"]) {
  @include mx.pu-icon(small);
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

.inline-message {
  margin: 0;
  @include mx.pu-font(support);
}

.inline-message--error {
  color: var(--sys-color-error);
}
</style>
