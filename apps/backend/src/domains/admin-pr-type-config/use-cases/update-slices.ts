import {
  updatePRTypeConfigAuthoring as updateAuthoring,
  updatePRTypeConfigCompletion as updateCompletion,
  updatePRTypeConfigDiscovery as updateDiscovery,
  updatePRTypeConfigParticipation as updateParticipation,
} from "../../pr-type-config";
import type {
  AdminPRTypeConfigAuthoring,
  AdminPRTypeConfigCompletion,
  AdminPRTypeConfigCoordination,
  AdminPRTypeConfigDetail,
  AdminPRTypeConfigDiscovery,
  AdminPRTypeConfigParticipation,
} from "../contracts";
import { createPRTypeCoordinationMeetingPointTransactionPort } from "./pr-type-coordination-meeting-point-transaction";

export const updateAdminPRTypeConfigAuthoring = async (
  type: string,
  input: AdminPRTypeConfigAuthoring,
): Promise<AdminPRTypeConfigDetail> => {
  return await updateAuthoring(type, input);
};

export const updateAdminPRTypeConfigDiscovery = async (
  type: string,
  input: AdminPRTypeConfigDiscovery,
): Promise<AdminPRTypeConfigDetail> => {
  return await updateDiscovery(type, input);
};

export const updateAdminPRTypeConfigParticipation = async (
  type: string,
  input: AdminPRTypeConfigParticipation,
): Promise<AdminPRTypeConfigDetail> => {
  return await updateParticipation(type, input);
};

export const updateAdminPRTypeConfigCoordination = async (
  type: string,
  input: AdminPRTypeConfigCoordination,
): Promise<AdminPRTypeConfigDetail> => {
  return await createPRTypeCoordinationMeetingPointTransactionPort().update({
    type,
    input,
  });
};

export const updateAdminPRTypeConfigCompletion = async (
  type: string,
  input: AdminPRTypeConfigCompletion,
): Promise<AdminPRTypeConfigDetail> => {
  return await updateCompletion(type, input);
};
