import { listPRTypeConfigOperatorCatalog } from "../../pr-type-config";
import type { AdminPRTypeConfigCatalogItem } from "../contracts";

export const listAdminPRTypeConfigCatalog = async (): Promise<AdminPRTypeConfigCatalogItem[]> => {
  return await listPRTypeConfigOperatorCatalog();
};
