import { throwHttpProblem } from "../../../lib/problem-details";
import { getPRTypeConfigOperatorDetail } from "../../pr-type-config";
import type { AdminPRTypeConfigDetail } from "../contracts";

export const getAdminPRTypeConfigDetail = async (
  rawType: string,
): Promise<AdminPRTypeConfigDetail> => {
  const type = rawType.trim();
  const config = await getPRTypeConfigOperatorDetail(type);
  if (!config) {
    return throwHttpProblem({
      status: 404,
      detail: "PR type configuration not found",
      code: "PR_TYPE_CONFIG_NOT_FOUND",
    });
  }
  return config;
};
