import type {
  PRTypeConfigAuthoringPolicy,
  PRTypeConfigCreationDefaults,
  PRTypeConfigCreationPolicy,
  PRTypeConfigDiscoveryCatalogPolicy,
  PRTypeConfigDiscoveryPolicy,
  PRTypeConfigExpansionPolicy,
  PRTypeConfigMeetingPointPolicy,
  PRTypeConfigOperatorCatalogItem,
  PRTypeConfigOperatorDetail,
  PRTypeConfigParticipationFrequencyPolicy,
} from "./contracts";
import { findPRTypeConfigRecord, listPRTypeConfigRecords } from "./services/persistence";
import {
  toPRTypeConfigAuthoringPolicy,
  toPRTypeConfigCreationDefaults,
  toPRTypeConfigCreationPolicy,
  toPRTypeConfigDiscoveryCatalogPolicy,
  toPRTypeConfigDiscoveryPolicy,
  toPRTypeConfigExpansionPolicy,
  toPRTypeConfigMeetingPointPolicy,
  toPRTypeConfigOperatorCatalogItem,
  toPRTypeConfigOperatorDetail,
  toPRTypeConfigParticipationFrequencyPolicy,
} from "./services/projection";

export const listPRTypeConfigDiscoveryCatalogPolicies = async (): Promise<
  PRTypeConfigDiscoveryCatalogPolicy[]
> => (await listPRTypeConfigRecords()).map(toPRTypeConfigDiscoveryCatalogPolicy);

export const getPRTypeConfigDiscoveryPolicy = async (
  type: string,
): Promise<PRTypeConfigDiscoveryPolicy | null> => {
  const config = await findPRTypeConfigRecord(type);
  return config ? toPRTypeConfigDiscoveryPolicy(config) : null;
};

export const getPRTypeConfigAuthoringPolicy = async (
  type: string,
): Promise<PRTypeConfigAuthoringPolicy | null> => {
  const config = await findPRTypeConfigRecord(type);
  return config ? toPRTypeConfigAuthoringPolicy(config) : null;
};

export const getPRTypeConfigCreationPolicy = async (
  type: string,
): Promise<PRTypeConfigCreationPolicy | null> => {
  const config = await findPRTypeConfigRecord(type);
  return config ? toPRTypeConfigCreationPolicy(config) : null;
};

export const getPRTypeConfigCreationDefaults = async (
  type: string,
): Promise<PRTypeConfigCreationDefaults | null> => {
  const config = await findPRTypeConfigRecord(type);
  return config ? toPRTypeConfigCreationDefaults(config) : null;
};

export const getPRTypeConfigParticipationFrequencyPolicy = async (
  type: string,
): Promise<PRTypeConfigParticipationFrequencyPolicy | null> => {
  const config = await findPRTypeConfigRecord(type);
  return config ? toPRTypeConfigParticipationFrequencyPolicy(config) : null;
};

export const getPRTypeConfigExpansionPolicy = async (
  type: string,
): Promise<PRTypeConfigExpansionPolicy | null> => {
  const config = await findPRTypeConfigRecord(type);
  return config ? toPRTypeConfigExpansionPolicy(config) : null;
};

export const getPRTypeConfigMeetingPointPolicy = async (
  type: string,
): Promise<PRTypeConfigMeetingPointPolicy | null> => {
  const config = await findPRTypeConfigRecord(type);
  return config ? toPRTypeConfigMeetingPointPolicy(config) : null;
};

export const listPRTypeConfigTypeNames = async (): Promise<string[]> =>
  (await listPRTypeConfigRecords()).map((config) => config.type);

export const hasPRTypeConfig = async (type: string): Promise<boolean> =>
  (await findPRTypeConfigRecord(type)) !== null;

export const listPRTypeConfigOperatorCatalog = async (): Promise<
  PRTypeConfigOperatorCatalogItem[]
> => (await listPRTypeConfigRecords()).map(toPRTypeConfigOperatorCatalogItem);

export const getPRTypeConfigOperatorDetail = async (
  type: string,
): Promise<PRTypeConfigOperatorDetail | null> => {
  const config = await findPRTypeConfigRecord(type);
  return config ? toPRTypeConfigOperatorDetail(config) : null;
};

export const listPRTypeConfigOperatorDetails = async (): Promise<PRTypeConfigOperatorDetail[]> =>
  (await listPRTypeConfigRecords()).map(toPRTypeConfigOperatorDetail);
