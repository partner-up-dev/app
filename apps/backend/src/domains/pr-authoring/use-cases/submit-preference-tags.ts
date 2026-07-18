import type { PRTypePreferenceTag } from "../../../entities/pr-type-preference-tag";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PRTypePreferenceTagRepository } from "../../../repositories/PRTypePreferenceTagRepository";
import { normalizePRPreferenceLabel } from "../../pr/contracts";
import { hasPRTypeConfig } from "../../pr-type-config";
import type { PRTypePreferenceTagSubmissionResponse } from "../contracts";

const tagRepo = new PRTypePreferenceTagRepository();

export const normalizePRAuthoringPreferenceLabels = (labels: readonly string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const label of labels) {
    const value = normalizePRPreferenceLabel(label);
    if (!value) continue;
    const key = value.toLocaleLowerCase("zh-CN");
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(value);
  }
  return normalized;
};

const toSubmission = (tag: PRTypePreferenceTag) => ({
  id: tag.id,
  label: tag.label,
  description: tag.description,
  moderationStatus: tag.moderationStatus,
});

export const submitPRAuthoringPreferenceTags = async (input: {
  type: string;
  labels: readonly string[];
}): Promise<PRTypePreferenceTagSubmissionResponse> => {
  const type = input.type.trim();
  if (!(await hasPRTypeConfig(type))) {
    return throwHttpProblem({
      status: 404,
      detail: "PR type not found",
      code: "PR_AUTHORING_TYPE_NOT_FOUND",
    });
  }
  const labels = normalizePRAuthoringPreferenceLabels(input.labels);
  const existing = await tagRepo.findByType(type);
  const byKey = new Map<string, PRTypePreferenceTag>();
  for (const tag of existing) {
    const key = tag.label.toLocaleLowerCase("zh-CN");
    const current = byKey.get(key);
    if (!current || tag.moderationStatus === "PUBLISHED") byKey.set(key, tag);
  }
  const submitted: PRTypePreferenceTag[] = [];
  for (const label of labels) {
    const key = label.toLocaleLowerCase("zh-CN");
    const current = byKey.get(key);
    if (!current) {
      const created = await tagRepo.create({
        type,
        label,
        description: "",
        moderationStatus: "PENDING",
      });
      submitted.push(created);
      continue;
    }
    if (current.moderationStatus === "REJECTED") {
      const reopened = await tagRepo.update(current.id, { label, moderationStatus: "PENDING" });
      submitted.push(reopened ?? current);
      continue;
    }
    submitted.push(current);
  }
  return { type, submittedTags: submitted.map(toSubmission) };
};
