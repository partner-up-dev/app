import { throwHttpProblem } from "../../../lib/problem-details";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";
import type { AdminPRTypeConfigDetail } from "../contracts";
import { toAdminPRTypeConfigDetail } from "../services/projection";

const configRepository = new PRTypeConfigRepository();

export const getAdminPRTypeConfigDetail = async (
  rawType: string,
): Promise<AdminPRTypeConfigDetail> => {
  const type = rawType.trim();
  const config = await configRepository.findByType(type);
  if (!config) {
    return throwHttpProblem({
      status: 404,
      detail: "PR type configuration not found",
      code: "PR_TYPE_CONFIG_NOT_FOUND",
    });
  }
  return toAdminPRTypeConfigDetail(config);
};
