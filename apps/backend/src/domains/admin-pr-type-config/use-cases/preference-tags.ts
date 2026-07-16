import type { PRTypePreferenceTagModerationStatus } from "../../../entities/pr-type-preference-tag";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";
import { PRTypePreferenceTagRepository } from "../../../repositories/PRTypePreferenceTagRepository";
import type { AdminPRTypePreferenceTagView } from "../contracts";

const configRepository = new PRTypeConfigRepository();
const tagRepository = new PRTypePreferenceTagRepository();

const toView = (
  tag: Awaited<ReturnType<PRTypePreferenceTagRepository["findByType"]>>[number],
): AdminPRTypePreferenceTagView => ({
  id: tag.id,
  type: tag.type,
  label: tag.label,
  description: tag.description,
  moderationStatus: tag.moderationStatus,
  createdAt: tag.createdAt.toISOString(),
  updatedAt: tag.updatedAt.toISOString(),
});

const assertTypeExists = async (type: string): Promise<string> => {
  const normalizedType = type.trim();
  if (!normalizedType) {
    return throwHttpProblem({ status: 422, detail: "PR type is required" });
  }
  if (!(await configRepository.findByType(normalizedType))) {
    return throwHttpProblem({
      status: 404,
      detail: "PR type configuration not found",
      code: "PR_TYPE_CONFIG_NOT_FOUND",
    });
  }
  return normalizedType;
};

export const listAdminPRTypePreferenceTags = async (input: {
  type: string;
  moderationStatus?: PRTypePreferenceTagModerationStatus;
}): Promise<AdminPRTypePreferenceTagView[]> => {
  const type = await assertTypeExists(input.type);
  const tags = input.moderationStatus
    ? await tagRepository.findByTypeAndStatuses(type, [input.moderationStatus])
    : await tagRepository.findByType(type);
  return tags.map(toView);
};

export const moderateAdminPRTypePreferenceTag = async (input: {
  type: string;
  tagId: number;
  moderationStatus: PRTypePreferenceTagModerationStatus;
}): Promise<AdminPRTypePreferenceTagView> => {
  const type = await assertTypeExists(input.type);
  const tag = await tagRepository.findById(input.tagId);
  if (!tag || tag.type !== type) {
    return throwHttpProblem({
      status: 404,
      detail: "PR type preference tag not found",
      code: "PR_TYPE_PREFERENCE_TAG_NOT_FOUND",
    });
  }
  const updated = await tagRepository.update(input.tagId, {
    moderationStatus: input.moderationStatus,
  });
  if (!updated) {
    return throwHttpProblem({
      status: 404,
      detail: "PR type preference tag not found",
      code: "PR_TYPE_PREFERENCE_TAG_NOT_FOUND",
    });
  }
  return toView(updated);
};
