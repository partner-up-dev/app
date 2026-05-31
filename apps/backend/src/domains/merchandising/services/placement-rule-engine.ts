import * as jsonLogicNamespace from "json-logic-js";
import type { RulesLogic } from "json-logic-js";
import type { PlacementMatchingRuleJson } from "../model";

const jsonLogicModule = jsonLogicNamespace as typeof jsonLogicNamespace & {
  default?: typeof jsonLogicNamespace;
};

const jsonLogic = jsonLogicModule.default ?? jsonLogicModule;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPrimitiveJsonLogicRule = (value: unknown): value is RulesLogic =>
  value === null ||
  typeof value === "boolean" ||
  typeof value === "number" ||
  typeof value === "string";

export const isPlacementMatchingRuleJson = (
  value: unknown,
): value is PlacementMatchingRuleJson =>
  isPrimitiveJsonLogicRule(value) ||
  (isRecord(value) && jsonLogic.is_logic(value));

export function assertPlacementMatchingRuleJson(
  value: unknown,
): asserts value is PlacementMatchingRuleJson {
  if (!isPlacementMatchingRuleJson(value)) {
    throw new Error("Placement matchingRule must be a JSONLogic rule");
  }
}

export function doesPlacementRuleMatch(input: {
  rule: unknown;
  context: unknown;
}): boolean {
  if (!isPlacementMatchingRuleJson(input.rule)) return false;

  try {
    const result: unknown = jsonLogic.apply(
      input.rule as RulesLogic,
      input.context,
    );
    return jsonLogic.truthy(result);
  } catch {
    return false;
  }
}
