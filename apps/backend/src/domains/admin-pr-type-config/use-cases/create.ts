import { createPRTypeConfig } from "../../pr-type-config";
import type { AdminPRTypeConfigCreateInput, AdminPRTypeConfigDetail } from "../contracts";

export const createAdminPRTypeConfig = async (
  rawInput: AdminPRTypeConfigCreateInput,
): Promise<AdminPRTypeConfigDetail> => await createPRTypeConfig(rawInput);
