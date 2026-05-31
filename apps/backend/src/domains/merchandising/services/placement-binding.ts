import type {
  PlacementBindingContextPath,
  PlacementBindingFieldKey,
  PlacementBindingRule,
} from "../model";
import type { PrPlacementRuleContextData } from "./placement-pr-context";

export type ResolvedPlacementBindingValues = {
  participantCount: number;
  serviceStartAt: string;
  serviceEndAt: string;
};

const allowedContextPathByFieldKey: Record<
  PlacementBindingFieldKey,
  readonly PlacementBindingContextPath[]
> = {
  participantCount: ["activeParticipantCount"],
  serviceStartAt: ["time.startAt"],
  serviceEndAt: ["time.endAt"],
};

export function validatePlacementBindingRules(
  rules: readonly PlacementBindingRule[],
): string | null {
  const seenFieldKeys = new Set<PlacementBindingFieldKey>();

  for (const rule of rules) {
    if (rule.lock !== true) {
      return "Placement binding rules must always lock bound fields";
    }

    if (seenFieldKeys.has(rule.fieldKey)) {
      return `Duplicate Placement binding field: ${rule.fieldKey}`;
    }
    seenFieldKeys.add(rule.fieldKey);

    if (!allowedContextPathByFieldKey[rule.fieldKey].includes(rule.contextPath)) {
      return `Placement binding field ${rule.fieldKey} cannot bind from ${rule.contextPath}`;
    }
  }

  return null;
}

function readContextPath(
  context: PrPlacementRuleContextData,
  path: PlacementBindingContextPath,
): unknown {
  if (path === "activeParticipantCount") return context.activeParticipantCount;
  if (path === "time.startAt") return context.time.startAt;
  if (path === "time.endAt") return context.time.endAt;

  return null;
}

export function resolvePrRentalPlacementBindings(input: {
  context: PrPlacementRuleContextData;
  rules: readonly PlacementBindingRule[];
}): ResolvedPlacementBindingValues {
  const validationError = validatePlacementBindingRules(input.rules);
  if (validationError) {
    throw new Error(validationError);
  }

  const values: Partial<ResolvedPlacementBindingValues> = {};

  for (const rule of input.rules) {
    const value = readContextPath(input.context, rule.contextPath);

    if (rule.fieldKey === "participantCount") {
      if (typeof value !== "number") {
        throw new Error("Placement binding participantCount must resolve to a number");
      }
      values.participantCount = value;
    }

    if (rule.fieldKey === "serviceStartAt") {
      if (typeof value !== "string") {
        throw new Error("Placement binding serviceStartAt must resolve to a string");
      }
      values.serviceStartAt = new Date(value).toISOString();
    }

    if (rule.fieldKey === "serviceEndAt") {
      if (typeof value !== "string") {
        throw new Error("Placement binding serviceEndAt must resolve to a string");
      }
      values.serviceEndAt = new Date(value).toISOString();
    }
  }

  if (
    typeof values.participantCount !== "number" ||
    typeof values.serviceStartAt !== "string" ||
    typeof values.serviceEndAt !== "string"
  ) {
    throw new Error("Placement binding rules must bind participant count and service time");
  }

  return {
    participantCount: values.participantCount,
    serviceStartAt: values.serviceStartAt,
    serviceEndAt: values.serviceEndAt,
  };
}
