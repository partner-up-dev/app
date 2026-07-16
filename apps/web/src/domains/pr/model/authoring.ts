import { clonePRFields } from "@/domains/pr/model/form";
import type { PRFormFields } from "@/domains/pr/model/types";
import type { PRAuthoringOptions } from "@/domains/pr/queries/usePRAuthoringOptions";

export type PRAuthoringCreateDefaultEligibility = Readonly<{
  minPartners: boolean;
  maxPartners: boolean;
  notes: boolean;
  time: boolean;
}>;

const sameTime = (left: PRFormFields["time"], right: PRFormFields["time"]): boolean =>
  left[0] === right[0] && left[1] === right[1];

/** Compares current values with the untouched create baseline, not sentinel values. */
export const resolvePRAuthoringCreateDefaultEligibility = (
  current: PRFormFields,
  base: PRFormFields,
): PRAuthoringCreateDefaultEligibility => ({
  minPartners: current.minPartners === base.minPartners,
  maxPartners: current.maxPartners === base.maxPartners,
  notes: current.notes === base.notes,
  time: sameTime(current.time, base.time),
});

export const applyPRAuthoringCreateDefaults = (
  fields: PRFormFields,
  options: PRAuthoringOptions | null | undefined,
  eligibility: PRAuthoringCreateDefaultEligibility,
): PRFormFields => {
  if (!options) return clonePRFields(fields);

  const next = clonePRFields(fields);
  const defaults = options.authoringDefaults;
  if (eligibility.minPartners && defaults.minPartners !== null) {
    next.minPartners = defaults.minPartners;
  }
  if (eligibility.maxPartners && defaults.maxPartners !== null) {
    next.maxPartners = defaults.maxPartners;
  }
  if (eligibility.notes && defaults.notes !== null) {
    next.notes = defaults.notes;
  }
  if (eligibility.time) {
    const firstStart = options.startOptions[0];
    if (firstStart) next.time = [firstStart.startAt, firstStart.endAt];
  }
  return next;
};

/** Returns user-entered labels that are not already published for this PR type. */
export const resolvePRAuthoringCustomPreferenceLabels = (
  selectedLabels: readonly string[],
  publishedLabels: readonly string[],
): string[] => {
  const publishedKeys = new Set(
    publishedLabels.map((label) => label.trim().toLocaleLowerCase("zh-CN")).filter(Boolean),
  );
  const customLabels = new Map<string, string>();

  for (const rawLabel of selectedLabels) {
    const label = rawLabel.trim().replace(/\s+/g, " ");
    if (!label) continue;
    const key = label.toLocaleLowerCase("zh-CN");
    if (!publishedKeys.has(key) && !customLabels.has(key)) customLabels.set(key, label);
  }

  return [...customLabels.values()];
};
