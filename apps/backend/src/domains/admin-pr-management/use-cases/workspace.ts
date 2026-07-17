import type { PartnerRequest } from "../../../entities/partner-request";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import {
  countActivePartnersForPR,
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  resolvePRPlaceDisplayName,
} from "../../pr/services";
import { listPRTypeConfigOperatorDetails } from "../../pr-type-config";
import type { AdminPRSummary, AdminPRTypeOption, AdminPRWorkspace } from "../contracts";

const prRepository = new PartnerRequestRepository();
const feedbackRepository = new FeedbackQuestionnaireRepository();

export const toAdminPRSummary = async (request: PartnerRequest): Promise<AdminPRSummary> => ({
  prId: request.id,
  title: request.title,
  type: request.type,
  location: request.location,
  route: request.route,
  placeDisplayName: resolvePRPlaceDisplayName(request),
  time: request.time,
  status: request.status,
  visibilityStatus: request.visibilityStatus,
  minPartners: request.minPartners,
  maxPartners: request.maxPartners,
  preferences: [...request.preferences],
  notes: request.notes,
  meetingPoint: request.meetingPoint,
  joinGateConfig: request.joinGateConfig,
  feedbackQuestionnaireInstanceId: request.feedbackQuestionnaireInstanceId ?? null,
  partnerCount: await countActivePartnersForPR(request.id),
  confirmationEnabled: request.confirmationEnabled,
  confirmationStartOffsetMinutes:
    request.confirmationStartOffsetMinutes ?? DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  confirmationEndOffsetMinutes:
    request.confirmationEndOffsetMinutes ?? DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  joinLockOffsetMinutes: request.joinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  createdAt: request.createdAt.toISOString(),
});

const toTypeOption = (
  config: Awaited<ReturnType<typeof listPRTypeConfigOperatorDetails>>[number],
): AdminPRTypeOption => ({
  type: config.type,
  title: config.discovery.title,
  description: config.discovery.description,
  locationOptions: [...config.authoring.locationPool],
  routeOptions: config.authoring.routePool,
  defaultMinPartners: config.authoring.defaultMinPartners,
  defaultMaxPartners: config.authoring.defaultMaxPartners,
  defaultNotes: config.authoring.defaultNotes,
  defaultConfirmationEnabled: config.participation.defaultConfirmationEnabled,
  defaultConfirmationStartOffsetMinutes: config.participation.defaultConfirmationStartOffsetMinutes,
  defaultConfirmationEndOffsetMinutes: config.participation.defaultConfirmationEndOffsetMinutes,
  defaultJoinLockOffsetMinutes: config.participation.defaultJoinLockOffsetMinutes,
  joinGateConfig: config.participation.joinGateConfig,
  feedbackQuestionnaireTemplateId: config.completion.feedbackQuestionnaireTemplateId,
  authoringCreationPolicy: config.authoring.authoringCreationPolicy,
});

export const getAdminPRWorkspace = async (): Promise<AdminPRWorkspace> => {
  const [requests, configs, templates, instances] = await Promise.all([
    prRepository.listAll(),
    listPRTypeConfigOperatorDetails(),
    feedbackRepository.listTemplates(),
    feedbackRepository.listInstances(),
  ]);
  return {
    prs: await Promise.all(requests.map(toAdminPRSummary)),
    typeOptions: configs.map(toTypeOption),
    feedbackQuestionnaireTemplates: templates.map(({ id, key, version, title }) => ({
      id,
      key,
      version,
      title,
    })),
    feedbackQuestionnaireInstances: instances.map(({ id, templateId, title }) => ({
      id,
      templateId,
      title,
    })),
  };
};

export const listAdminPRs = async (): Promise<AdminPRSummary[]> =>
  Promise.all((await prRepository.listAll()).map(toAdminPRSummary));

export const getAdminPRDetail = async (prId: number): Promise<AdminPRSummary> => {
  const request = await prRepository.findById(prId);
  if (!request) {
    const { throwHttpProblem } = await import("../../../lib/problem-details");
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  }
  return toAdminPRSummary(request);
};
