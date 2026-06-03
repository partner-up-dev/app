import {
  buildJsonLogicRule,
  toJsonLogicRuleDraft,
  type JsonLogicFieldOption,
  type JsonLogicRuleBuildLabels,
  type JsonLogicRuleDraft,
} from "@/domains/admin-commerce/model/json-logic/jsonLogicRuleEditorModel";

export const placementMatchingRuleFields = [
  {
    path: "kind",
    label: "上下文类型",
    valueKind: "string",
    valueOptions: [{ value: "PR", label: "PR" }],
  },
  {
    path: "type",
    label: "PR 类型",
    valueKind: "string",
  },
  {
    path: "status",
    label: "PR 状态",
    valueKind: "string",
    valueOptions: [
      { value: "OPEN", label: "OPEN" },
      { value: "READY", label: "READY" },
      { value: "ACTIVE", label: "ACTIVE" },
      { value: "CLOSED", label: "CLOSED" },
    ],
  },
  {
    path: "time.hasConcreteTime",
    label: "有完整时间",
    valueKind: "boolean",
  },
  {
    path: "hasLocation",
    label: "有地点",
    valueKind: "boolean",
  },
  {
    path: "hasRoute",
    label: "有路线",
    valueKind: "boolean",
  },
  {
    path: "activeParticipantCount",
    label: "当前参与人数",
    valueKind: "number",
  },
  {
    path: "minPartners",
    label: "最少人数",
    valueKind: "number",
  },
  {
    path: "maxPartners",
    label: "最多人数",
    valueKind: "number",
  },
  {
    path: "routePointCount",
    label: "路线点数量",
    valueKind: "number",
  },
  {
    path: "preferences",
    label: "偏好包含",
    valueKind: "stringArray",
  },
] satisfies readonly JsonLogicFieldOption[];

export const createPlacementMatchingRuleDraft = (): JsonLogicRuleDraft =>
  toJsonLogicRuleDraft(true, placementMatchingRuleFields, {
    allowCustomFields: true,
  });

export const toPlacementMatchingRuleDraft = (
  rule: unknown,
): JsonLogicRuleDraft =>
  toJsonLogicRuleDraft(rule, placementMatchingRuleFields, {
    allowCustomFields: true,
  });

export const buildPlacementMatchingRule = (
  draft: JsonLogicRuleDraft,
  labels?: Partial<JsonLogicRuleBuildLabels>,
): unknown =>
  buildJsonLogicRule(draft, {
    fields: placementMatchingRuleFields,
    alwaysRule: true,
    allowCustomFields: true,
    labels,
  });
