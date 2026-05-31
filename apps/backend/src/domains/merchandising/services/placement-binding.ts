import type { PlacementBindingRule } from "../model";

export type PlacementBindingContract = {
  requiredFieldKeys: string[];
};

export function validatePlacementBindingRules(
  rules: readonly PlacementBindingRule[],
): string | null {
  const seenFieldKeys = new Set<string>();

  for (const rule of rules) {
    if (rule.lock !== true) {
      return "Placement binding rules must always lock bound fields";
    }

    if (rule.fieldKey.trim().length === 0) {
      return "Placement binding fieldKey is required";
    }
    if (rule.contextPath.trim().length === 0) {
      return "Placement binding contextPath is required";
    }

    if (seenFieldKeys.has(rule.fieldKey)) {
      return `Duplicate Placement binding field: ${rule.fieldKey}`;
    }
    seenFieldKeys.add(rule.fieldKey);
  }

  return null;
}

export function validatePlacementBindingRulesAgainstContract(input: {
  rules: readonly PlacementBindingRule[];
  contract: PlacementBindingContract;
}): string | null {
  const genericError = validatePlacementBindingRules(input.rules);
  if (genericError) return genericError;

  const fieldKeys = new Set(input.rules.map((rule) => rule.fieldKey));
  for (const requiredFieldKey of input.contract.requiredFieldKeys) {
    if (!fieldKeys.has(requiredFieldKey)) {
      return `Placement binding rules must bind required field: ${requiredFieldKey}`;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readContextPath(context: unknown, path: string): unknown {
  const segments = path.split(".").filter((segment) => segment.length > 0);
  let cursor: unknown = context;
  for (const segment of segments) {
    if (!isRecord(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

export function resolvePlacementBindings(input: {
  context: unknown;
  rules: readonly PlacementBindingRule[];
}): Record<string, unknown> {
  const validationError = validatePlacementBindingRules(input.rules);
  if (validationError) {
    throw new Error(validationError);
  }

  const values: Record<string, unknown> = {};

  for (const rule of input.rules) {
    const value = readContextPath(input.context, rule.contextPath);
    values[rule.fieldKey] = value;
  }

  return values;
}
