import type { NewPRTypeConfig, PRTypeConfig } from "../../../entities/pr-type-config";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";

const repository = new PRTypeConfigRepository();

export const findPRTypeConfigRecord = async (type: string): Promise<PRTypeConfig | null> =>
  await repository.findByType(type);

export const findPRTypeConfigRecordByNormalizedType = async (
  type: string,
): Promise<PRTypeConfig | null> => await repository.findByNormalizedType(type);

export const listPRTypeConfigRecords = async (): Promise<PRTypeConfig[]> =>
  await repository.listAll();

export const createPRTypeConfigRecord = async (input: NewPRTypeConfig): Promise<PRTypeConfig> =>
  await repository.create(input);

export const updatePRTypeConfigRecord = async (
  type: string,
  input: Partial<Omit<NewPRTypeConfig, "type" | "createdAt" | "updatedAt">>,
): Promise<PRTypeConfig | null> => await repository.updateByType(type, input);
