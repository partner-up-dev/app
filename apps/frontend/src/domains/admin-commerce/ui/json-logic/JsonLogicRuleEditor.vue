<template>
  <section class="jl-rule-editor">
    <div v-if="title || description" class="jl-rule-editor__header">
      <h3 v-if="title" class="pm-section-title">{{ title }}</h3>
      <p v-if="description" class="pm-hint">{{ description }}</p>
    </div>

    <SegmentedControl
      :model-value="rule.mode"
      :options="modeOptions"
      :aria-label="t('adminCommerceJsonLogic.modeAria')"
      size="sm"
      block
      @update:model-value="updateMode"
    />

    <p v-if="rule.mode === 'PRESERVE_CUSTOM'" class="pm-hint">
      {{ t("adminCommerceJsonLogic.customPreservedHint") }}
    </p>

    <label v-if="rule.mode === 'PRESERVE_CUSTOM'" class="pm-field">
      <span class="pm-field-label">
        {{ t("adminCommerceJsonLogic.customJsonLabel") }}
      </span>
      <textarea
        v-model="rule.customRuleText"
        class="pm-field-input jl-custom-rule-textarea"
        rows="8"
        spellcheck="false"
      ></textarea>
    </label>

    <template v-if="rule.mode === 'ALL' || rule.mode === 'ANY'">
      <div class="jl-rule-editor__condition-header">
        <strong class="pm-subsection-title">
          {{ t("adminCommerceJsonLogic.conditionsTitle") }}
        </strong>
        <Button appearance="pill" tone="outline" size="sm" type="button" @click="addCondition">
          <template #leading>
            <span class="i-mdi-plus" />
          </template>
          {{ t("adminCommerceJsonLogic.addConditionAction") }}
        </Button>
      </div>

      <p v-if="rule.conditions.length === 0" class="pm-hint">
        {{ t("adminCommerceJsonLogic.emptyConditions") }}
      </p>

      <article
        v-for="condition in rule.conditions"
        :key="condition.draftId"
        class="jl-condition-row"
      >
        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceJsonLogic.fieldLabel") }}</span>
          <select
            v-model="condition.fieldPath"
            class="pm-field-input"
            @change="normalizeCondition(condition)"
          >
            <option
              v-for="field in fields"
              :key="field.path"
              :value="field.path"
            >
              {{ field.label }}
            </option>
          </select>
        </label>

        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceJsonLogic.operatorLabel") }}</span>
          <select v-model="condition.operator" class="pm-field-input">
            <option
              v-for="operator in operatorsForCondition(condition)"
              :key="operator"
              :value="operator"
            >
              {{ operatorLabel(operator) }}
            </option>
          </select>
        </label>

        <label
          v-if="valueFieldForCondition(condition)"
          class="pm-field"
        >
          <span class="pm-field-label">{{ t("adminCommerceJsonLogic.valueLabel") }}</span>
          <select
            v-if="valueFieldForCondition(condition)?.valueOptions?.length"
            v-model="condition.valueText"
            class="pm-field-input"
          >
            <option
              v-for="option in valueFieldForCondition(condition)?.valueOptions"
              :key="String(option.value)"
              :value="String(option.value)"
            >
              {{ option.label }}
            </option>
          </select>
          <input
            v-else
            v-model="condition.valueText"
            class="pm-field-input"
            :type="valueFieldForCondition(condition)?.valueKind === 'number' ? 'number' : 'text'"
          />
        </label>

        <Button
          appearance="pill"
          tone="danger"
          size="sm"
          type="button"
          @click="removeCondition(condition.draftId)"
        >
          <template #leading>
            <span class="i-mdi-delete-outline" />
          </template>
          {{ t("adminCommerceJsonLogic.removeConditionAction") }}
        </Button>
      </article>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  createJsonLogicConditionDraft,
  findJsonLogicField,
  getJsonLogicOperatorsForField,
  normalizeJsonLogicConditionDraft,
  normalizeJsonLogicRuleDraft,
  operatorNeedsJsonLogicValue,
  type JsonLogicConditionDraft,
  type JsonLogicFieldOption,
  type JsonLogicOperator,
  type JsonLogicRuleDraft,
  type JsonLogicRuleMode,
} from "@/domains/admin-commerce/model/json-logic/jsonLogicRuleEditorModel";
import Button from "@/shared/ui/actions/Button.vue";
import SegmentedControl, {
  type SegmentedControlOption,
  type SegmentedControlValue,
} from "@/shared/ui/controls/SegmentedControl.vue";
import "@/domains/admin-commerce/ui/product-management/product-management.scss";

const props = defineProps<{
  fields: readonly JsonLogicFieldOption[];
  title?: string;
  description?: string;
}>();

const rule = defineModel<JsonLogicRuleDraft>({ required: true });
const { t } = useI18n();

const modeOptions = computed<SegmentedControlOption[]>(() => [
  {
    value: "ALWAYS",
    label: t("adminCommerceJsonLogic.modeAlways"),
    icon: "i-mdi-check-circle-outline",
  },
  {
    value: "ALL",
    label: t("adminCommerceJsonLogic.modeAll"),
    icon: "i-mdi-format-list-checks",
  },
  {
    value: "ANY",
    label: t("adminCommerceJsonLogic.modeAny"),
    icon: "i-mdi-call-split",
  },
  {
    value: "PRESERVE_CUSTOM",
    label: t("adminCommerceJsonLogic.modeCustom"),
    icon: "i-mdi-code-json",
  },
]);

const updateMode = (value: SegmentedControlValue) => {
  rule.value = {
    ...rule.value,
    mode: value as JsonLogicRuleMode,
  };
};

const normalizeCondition = (condition: JsonLogicConditionDraft) => {
  Object.assign(
    condition,
    normalizeJsonLogicConditionDraft(condition, props.fields),
  );
};

const addCondition = () => {
  rule.value.conditions.push(createJsonLogicConditionDraft(props.fields));
};

const removeCondition = (draftId: string) => {
  rule.value = {
    ...rule.value,
    conditions: rule.value.conditions.filter(
      (condition) => condition.draftId !== draftId,
    ),
  };
};

const operatorsForCondition = (
  condition: JsonLogicConditionDraft,
): readonly JsonLogicOperator[] => {
  const field = findJsonLogicField(props.fields, condition.fieldPath);
  return field ? getJsonLogicOperatorsForField(field) : [];
};

const valueFieldForCondition = (
  condition: JsonLogicConditionDraft,
): JsonLogicFieldOption | null => {
  if (!operatorNeedsJsonLogicValue(condition.operator)) return null;
  return findJsonLogicField(props.fields, condition.fieldPath);
};

const operatorLabel = (operator: JsonLogicOperator): string =>
  t(`adminCommerceJsonLogic.operator.${operator}`);

watch(
  () => props.fields,
  (fields) => {
    rule.value = normalizeJsonLogicRuleDraft(rule.value, fields);
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.jl-rule-editor {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.jl-rule-editor__header {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.jl-rule-editor__condition-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.jl-condition-row {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: var(--sys-spacing-small);
  align-items: end;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
}

.jl-custom-rule-textarea {
  min-height: 10rem;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

@media (max-width: 780px) {
  .jl-condition-row {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
}
</style>
