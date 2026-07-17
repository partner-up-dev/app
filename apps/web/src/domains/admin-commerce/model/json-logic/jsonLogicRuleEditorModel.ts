import { createDraftId, isRecord } from "@/domains/admin-commerce/model/product-management/shared";
import { parseJsonText, prettyJson } from "@/domains/admin-commerce/editor-json";

export type JsonLogicRuleMode = "ALWAYS" | "ALL" | "ANY" | "PRESERVE_CUSTOM";
export type JsonLogicValueKind = "string" | "number" | "boolean" | "stringArray";
export type JsonLogicOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUALS"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUALS"
  | "IS_TRUE"
  | "IS_FALSE"
  | "CONTAINS";

export type JsonLogicFieldValueOption = {
  value: string | number | boolean;
  label: string;
};

export type JsonLogicFieldOption = {
  path: string;
  label: string;
  valueKind: JsonLogicValueKind;
  operators?: readonly JsonLogicOperator[];
  valueOptions?: readonly JsonLogicFieldValueOption[];
};

export type JsonLogicConditionDraft = {
  draftId: string;
  fieldPath: string;
  operator: JsonLogicOperator;
  valueText: string;
};

export type JsonLogicRuleDraft = {
  mode: JsonLogicRuleMode;
  conditions: JsonLogicConditionDraft[];
  customRule: unknown;
  customRuleText: string;
};

export type JsonLogicRuleBuildLabels = {
  fieldLabel: string;
  valueLabel: string;
  customRuleLabel: string;
};

export type JsonLogicRuleParseOptions = {
  allowCustomFields?: boolean;
};

const defaultLabels: JsonLogicRuleBuildLabels = {
  fieldLabel: "字段",
  valueLabel: "值",
  customRuleLabel: "自定义规则",
};

const defaultOperatorByValueKind: Record<JsonLogicValueKind, readonly JsonLogicOperator[]> = {
  string: ["EQUALS", "NOT_EQUALS"],
  number: [
    "EQUALS",
    "NOT_EQUALS",
    "GREATER_THAN",
    "GREATER_THAN_OR_EQUALS",
    "LESS_THAN",
    "LESS_THAN_OR_EQUALS",
  ],
  boolean: ["IS_TRUE", "IS_FALSE"],
  stringArray: ["CONTAINS"],
};

const valueLessOperators = new Set<JsonLogicOperator>(["IS_TRUE", "IS_FALSE"]);

export const getJsonLogicOperatorsForField = (
  field: JsonLogicFieldOption,
): readonly JsonLogicOperator[] => field.operators ?? defaultOperatorByValueKind[field.valueKind];

export const findJsonLogicField = (
  fields: readonly JsonLogicFieldOption[],
  path: string,
): JsonLogicFieldOption | null => fields.find((field) => field.path === path) ?? null;

export const createCustomJsonLogicField = (path: string): JsonLogicFieldOption => ({
  path,
  label: path,
  valueKind: "string",
});

const resolveJsonLogicField = (
  fields: readonly JsonLogicFieldOption[],
  path: string,
  options?: JsonLogicRuleParseOptions,
): JsonLogicFieldOption | null => {
  const field = findJsonLogicField(fields, path);
  if (field) return field;

  const trimmedPath = path.trim();
  if (options?.allowCustomFields && trimmedPath.length > 0) {
    return createCustomJsonLogicField(trimmedPath);
  }

  return null;
};

export const operatorNeedsJsonLogicValue = (operator: JsonLogicOperator): boolean =>
  !valueLessOperators.has(operator);

const defaultValueForField = (field: JsonLogicFieldOption): string => {
  const firstOption = field.valueOptions?.[0];
  if (firstOption) return String(firstOption.value);
  if (field.valueKind === "number") return "0";
  if (field.valueKind === "boolean") return "true";
  return "";
};

export const createJsonLogicConditionDraft = (
  fields: readonly JsonLogicFieldOption[],
): JsonLogicConditionDraft => {
  const field = fields[0];
  if (!field) {
    return {
      draftId: createDraftId("json-logic-condition"),
      fieldPath: "",
      operator: "EQUALS",
      valueText: "",
    };
  }

  return {
    draftId: createDraftId("json-logic-condition"),
    fieldPath: field.path,
    operator: getJsonLogicOperatorsForField(field)[0] ?? "EQUALS",
    valueText: defaultValueForField(field),
  };
};

export const createJsonLogicRuleDraft = (
  fields: readonly JsonLogicFieldOption[],
): JsonLogicRuleDraft => ({
  mode: "ALWAYS",
  conditions: [createJsonLogicConditionDraft(fields)],
  customRule: true,
  customRuleText: prettyJson(true),
});

export const normalizeJsonLogicConditionDraft = (
  condition: JsonLogicConditionDraft,
  fields: readonly JsonLogicFieldOption[],
  options?: JsonLogicRuleParseOptions,
): JsonLogicConditionDraft => {
  const field = resolveJsonLogicField(fields, condition.fieldPath, options) ?? fields[0];
  if (!field) return condition;

  const operators = getJsonLogicOperatorsForField(field);
  const operator = operators.includes(condition.operator)
    ? condition.operator
    : (operators[0] ?? "EQUALS");

  return {
    ...condition,
    fieldPath: field.path,
    operator,
    valueText:
      condition.fieldPath === field.path ? condition.valueText : defaultValueForField(field),
  };
};

export const normalizeJsonLogicRuleDraft = (
  draft: JsonLogicRuleDraft,
  fields: readonly JsonLogicFieldOption[],
  options?: JsonLogicRuleParseOptions,
): JsonLogicRuleDraft => ({
  ...draft,
  conditions: draft.conditions.map((condition) =>
    normalizeJsonLogicConditionDraft(condition, fields, options),
  ),
});

const readVarPath = (value: unknown): string | null => {
  if (!isRecord(value) || Object.keys(value).length !== 1) return null;
  return typeof value.var === "string" ? value.var : null;
};

const isPrimitiveConditionValue = (value: unknown): value is string | number | boolean =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean";

const parseConditionValueText = (value: unknown, field: JsonLogicFieldOption): string | null => {
  if (!isPrimitiveConditionValue(value)) return null;
  if (field.valueKind === "number" && typeof value === "number") {
    return String(value);
  }
  if (
    (field.valueKind === "string" || field.valueKind === "stringArray") &&
    typeof value === "string"
  ) {
    return value;
  }
  if (field.valueKind === "boolean" && typeof value === "boolean") {
    return String(value);
  }
  return null;
};

const parseBinaryCondition = (
  operator: JsonLogicOperator,
  expression: unknown,
  fields: readonly JsonLogicFieldOption[],
  options?: JsonLogicRuleParseOptions,
): JsonLogicConditionDraft | null => {
  if (!Array.isArray(expression) || expression.length !== 2) return null;

  const fieldPath = readVarPath(expression[0]);
  if (!fieldPath) return null;

  const field = resolveJsonLogicField(fields, fieldPath, options);
  if (!field) return null;

  if (!getJsonLogicOperatorsForField(field).includes(operator)) return null;

  if (field.valueKind === "boolean") {
    if (operator === "EQUALS" && expression[1] === true) {
      return {
        draftId: createDraftId("json-logic-condition"),
        fieldPath,
        operator: "IS_TRUE",
        valueText: "true",
      };
    }
    if (operator === "EQUALS" && expression[1] === false) {
      return {
        draftId: createDraftId("json-logic-condition"),
        fieldPath,
        operator: "IS_FALSE",
        valueText: "false",
      };
    }
  }

  const valueText = parseConditionValueText(expression[1], field);
  if (valueText === null) return null;

  return {
    draftId: createDraftId("json-logic-condition"),
    fieldPath,
    operator,
    valueText,
  };
};

const parseContainsCondition = (
  expression: unknown,
  fields: readonly JsonLogicFieldOption[],
  options?: JsonLogicRuleParseOptions,
): JsonLogicConditionDraft | null => {
  if (!Array.isArray(expression) || expression.length !== 2) return null;
  if (typeof expression[0] !== "string") return null;

  const fieldPath = readVarPath(expression[1]);
  if (!fieldPath) return null;

  const field = resolveJsonLogicField(fields, fieldPath, options);
  if (!field || field.valueKind !== "stringArray") return null;
  if (!getJsonLogicOperatorsForField(field).includes("CONTAINS")) return null;

  return {
    draftId: createDraftId("json-logic-condition"),
    fieldPath,
    operator: "CONTAINS",
    valueText: expression[0],
  };
};

const parseBooleanVarCondition = (
  expression: unknown,
  fields: readonly JsonLogicFieldOption[],
  options?: JsonLogicRuleParseOptions,
): JsonLogicConditionDraft | null => {
  const fieldPath = readVarPath(expression);
  if (!fieldPath) return null;
  const field = resolveJsonLogicField(fields, fieldPath, options);
  if (!field || field.valueKind !== "boolean") return null;

  return {
    draftId: createDraftId("json-logic-condition"),
    fieldPath,
    operator: "IS_TRUE",
    valueText: "true",
  };
};

const parseJsonLogicCondition = (
  rule: unknown,
  fields: readonly JsonLogicFieldOption[],
  options?: JsonLogicRuleParseOptions,
): JsonLogicConditionDraft | null => {
  const booleanVarCondition = parseBooleanVarCondition(rule, fields, options);
  if (booleanVarCondition) return booleanVarCondition;

  if (!isRecord(rule)) return null;
  const entries = Object.entries(rule);
  if (entries.length !== 1) return null;

  const [operator, expression] = entries[0] ?? [];
  if (!operator) return null;

  if (operator === "===") {
    return parseBinaryCondition("EQUALS", expression, fields, options);
  }
  if (operator === "!==") {
    return parseBinaryCondition("NOT_EQUALS", expression, fields, options);
  }
  if (operator === ">") {
    return parseBinaryCondition("GREATER_THAN", expression, fields, options);
  }
  if (operator === ">=") {
    return parseBinaryCondition("GREATER_THAN_OR_EQUALS", expression, fields, options);
  }
  if (operator === "<") {
    return parseBinaryCondition("LESS_THAN", expression, fields, options);
  }
  if (operator === "<=") {
    return parseBinaryCondition("LESS_THAN_OR_EQUALS", expression, fields, options);
  }
  if (operator === "in") return parseContainsCondition(expression, fields, options);

  return null;
};

const parseCompoundRule = (
  rule: unknown,
  fields: readonly JsonLogicFieldOption[],
  options?: JsonLogicRuleParseOptions,
): Pick<JsonLogicRuleDraft, "mode" | "conditions"> | null => {
  if (!isRecord(rule)) return null;
  const entries = Object.entries(rule);
  if (entries.length !== 1) return null;

  const [operator, expression] = entries[0] ?? [];
  if ((operator !== "and" && operator !== "or") || !Array.isArray(expression)) {
    return null;
  }

  const conditions = expression.map((item) => parseJsonLogicCondition(item, fields, options));
  if (conditions.some((condition) => condition === null)) return null;

  return {
    mode: operator === "and" ? "ALL" : "ANY",
    conditions: conditions.filter(
      (condition): condition is JsonLogicConditionDraft => condition !== null,
    ),
  };
};

export const toJsonLogicRuleDraft = (
  rule: unknown,
  fields: readonly JsonLogicFieldOption[],
  options?: JsonLogicRuleParseOptions,
): JsonLogicRuleDraft => {
  if (rule === null || rule === true) {
    return {
      mode: "ALWAYS",
      conditions: [createJsonLogicConditionDraft(fields)],
      customRule: rule,
      customRuleText: prettyJson(rule),
    };
  }

  const compoundRule = parseCompoundRule(rule, fields, options);
  if (compoundRule) {
    return {
      ...compoundRule,
      customRule: rule,
      customRuleText: prettyJson(rule),
    };
  }

  const condition = parseJsonLogicCondition(rule, fields, options);
  if (condition) {
    return {
      mode: "ALL",
      conditions: [condition],
      customRule: rule,
      customRuleText: prettyJson(rule),
    };
  }

  return {
    mode: "PRESERVE_CUSTOM",
    conditions: [createJsonLogicConditionDraft(fields)],
    customRule: rule,
    customRuleText: prettyJson(rule),
  };
};

const parseBuildValue = (
  condition: JsonLogicConditionDraft,
  field: JsonLogicFieldOption,
  labels: JsonLogicRuleBuildLabels,
): string | number | boolean => {
  if (field.valueKind === "number") {
    const parsed = Number(condition.valueText);
    if (!Number.isFinite(parsed)) {
      throw new Error(`${field.label || labels.fieldLabel} ${labels.valueLabel}必须是数字`);
    }
    return parsed;
  }
  if (field.valueKind === "boolean") {
    return condition.valueText === "true";
  }

  const trimmed = condition.valueText.trim();
  if (!trimmed) {
    throw new Error(`${field.label || labels.fieldLabel} ${labels.valueLabel}不能为空`);
  }
  return trimmed;
};

const buildJsonLogicCondition = (
  condition: JsonLogicConditionDraft,
  fields: readonly JsonLogicFieldOption[],
  labels: JsonLogicRuleBuildLabels,
  options?: JsonLogicRuleParseOptions,
): unknown => {
  const field = resolveJsonLogicField(fields, condition.fieldPath, options);
  if (!field) {
    throw new Error(`${labels.fieldLabel}无效`);
  }
  if (!getJsonLogicOperatorsForField(field).includes(condition.operator)) {
    throw new Error(`${field.label} 不支持当前操作符`);
  }

  const variable = { var: field.path };
  if (condition.operator === "IS_TRUE") return { "===": [variable, true] };
  if (condition.operator === "IS_FALSE") return { "===": [variable, false] };

  const value = parseBuildValue(condition, field, labels);

  if (condition.operator === "EQUALS") return { "===": [variable, value] };
  if (condition.operator === "NOT_EQUALS") return { "!==": [variable, value] };
  if (condition.operator === "GREATER_THAN") return { ">": [variable, value] };
  if (condition.operator === "GREATER_THAN_OR_EQUALS") {
    return { ">=": [variable, value] };
  }
  if (condition.operator === "LESS_THAN") return { "<": [variable, value] };
  if (condition.operator === "LESS_THAN_OR_EQUALS") {
    return { "<=": [variable, value] };
  }
  if (condition.operator === "CONTAINS") return { in: [value, variable] };

  throw new Error(`${field.label} 不支持当前操作符`);
};

export const buildJsonLogicRule = (
  draft: JsonLogicRuleDraft,
  input: {
    fields: readonly JsonLogicFieldOption[];
    alwaysRule: unknown;
    labels?: Partial<JsonLogicRuleBuildLabels>;
    allowCustomFields?: boolean;
  },
): unknown => {
  if (draft.mode === "ALWAYS") return input.alwaysRule;

  const labels = { ...defaultLabels, ...input.labels };
  if (draft.mode === "PRESERVE_CUSTOM") {
    return parseJsonText(draft.customRuleText, labels.customRuleLabel);
  }

  const conditions = draft.conditions.map((condition) =>
    buildJsonLogicCondition(condition, input.fields, labels, {
      allowCustomFields: input.allowCustomFields,
    }),
  );
  if (conditions.length === 0) return input.alwaysRule;
  if (conditions.length === 1) return conditions[0];

  return draft.mode === "ALL" ? { and: conditions } : { or: conditions };
};
