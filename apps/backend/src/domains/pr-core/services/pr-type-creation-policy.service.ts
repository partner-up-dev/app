import { throwHttpProblem } from "../../../lib/problem-details";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";

const prTypeConfigRepo = new PRTypeConfigRepository();

export const PR_TYPE_USER_CREATION_DISABLED_CODE = "PR_TYPE_USER_CREATION_DISABLED";

const throwUserCreationDisabled = (): never =>
  throwHttpProblem({
    status: 403,
    detail: "User PR creation is disabled for this PR type",
    code: PR_TYPE_USER_CREATION_DISABLED_CODE,
  });

export const canCreatePRForType = (input: {
  authoringCreationPolicy: "USER_AND_ADMIN" | "ADMIN_ONLY";
}): boolean => input.authoringCreationPolicy === "USER_AND_ADMIN";

export async function assertPRTypeCreationAllowed(input: { type: string }): Promise<void> {
  const normalizedType = input.type.trim();
  if (normalizedType.length === 0) return;

  const config = await prTypeConfigRepo.findByType(normalizedType);
  if (config && !canCreatePRForType(config)) {
    throwUserCreationDisabled();
  }
}
