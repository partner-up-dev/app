import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";
import type { AdminPRTypeConfigCatalogItem } from "../contracts";
import { toAdminPRTypeConfigCatalogItem } from "../services/projection";

const configRepository = new PRTypeConfigRepository();

export const listAdminPRTypeConfigCatalog = async (): Promise<AdminPRTypeConfigCatalogItem[]> => {
  const configs = await configRepository.listAll();
  return configs.map(toAdminPRTypeConfigCatalogItem);
};
