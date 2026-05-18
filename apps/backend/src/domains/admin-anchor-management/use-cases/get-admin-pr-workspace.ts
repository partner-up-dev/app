import type {
  AnchorEventPrCreationPolicy,
  AnchorEventRoutePool,
  PartnerRequest,
  PRJoinGateConfig,
  PRRoute,
} from "../../../entities";
import type { MeetingPointConfig } from "../../../entities";
import type {
  FeedbackQuestionnaireInstance,
  FeedbackQuestionnaireInstanceId,
  FeedbackQuestionnaireTemplate,
} from "../../../entities";
import { normalizeAnchorEventRoutePool, normalizeLocationPool } from "../../../entities";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import {
  countActivePartnersForPR,
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  resolvePRPlaceDisplayName,
} from "../../pr/services";

const anchorEventRepo = new AnchorEventRepository();
const feedbackRepo = new FeedbackQuestionnaireRepository();
const prRepo = new PartnerRequestRepository();

export type AdminPRWorkspaceSummary = {
  prId: number;
  title: string | null;
  type: string;
  location: string | null;
  route: PRRoute | null;
  placeDisplayName: string | null;
  time: [string | null, string | null];
  status: string;
  visibilityStatus: string;
  minPartners: number | null;
  maxPartners: number | null;
  preferences: string[];
  notes: string | null;
  meetingPoint: MeetingPointConfig | null;
  joinGateConfig: PRJoinGateConfig;
  feedbackQuestionnaireInstanceId: FeedbackQuestionnaireInstanceId | null;
  partnerCount: number;
  confirmationEnabled: boolean;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
  createdAt: string;
};

export type AdminPRTypeOption = {
  type: string;
  eventTitle: string;
  locationOptions: string[];
  routeOptions: AnchorEventRoutePool;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultConfirmationEnabled: boolean;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
  joinGateConfig: PRJoinGateConfig;
  feedbackQuestionnaireTemplateId: FeedbackQuestionnaireTemplate["id"] | null;
  prCreationPolicy: AnchorEventPrCreationPolicy;
};

export interface AdminPRWorkspace {
  prs: AdminPRWorkspaceSummary[];
  typeOptions: AdminPRTypeOption[];
  feedbackQuestionnaireTemplates: Array<{
    id: FeedbackQuestionnaireTemplate["id"];
    key: string;
    version: string;
    title: string;
  }>;
  feedbackQuestionnaireInstances: Array<{
    id: FeedbackQuestionnaireInstance["id"];
    templateId: FeedbackQuestionnaireInstance["templateId"];
    title: string;
  }>;
}

const toAdminPRWorkspaceSummary = async (
  root: PartnerRequest,
): Promise<AdminPRWorkspaceSummary> => ({
  prId: root.id,
  title: root.title,
  type: root.type,
  location: root.location,
  route: root.route,
  placeDisplayName: resolvePRPlaceDisplayName(root),
  time: root.time,
  status: root.status,
  visibilityStatus: root.visibilityStatus,
  minPartners: root.minPartners,
  maxPartners: root.maxPartners,
  preferences: [...root.preferences],
  notes: root.notes,
  meetingPoint: root.meetingPoint,
  joinGateConfig: root.joinGateConfig,
  feedbackQuestionnaireInstanceId:
    root.feedbackQuestionnaireInstanceId ?? null,
  partnerCount: await countActivePartnersForPR(root.id),
  confirmationEnabled: root.confirmationEnabled,
  confirmationStartOffsetMinutes:
    root.confirmationStartOffsetMinutes ??
    DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  confirmationEndOffsetMinutes:
    root.confirmationEndOffsetMinutes ?? DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  joinLockOffsetMinutes:
    root.joinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  createdAt: root.createdAt.toISOString(),
});

export async function getAdminPRWorkspace(): Promise<AdminPRWorkspace> {
  const [roots, events] = await Promise.all([
    prRepo.listAll(),
    anchorEventRepo.listAll(),
  ]);

  const prs = await Promise.all(
    roots.map((root) => toAdminPRWorkspaceSummary(root)),
  );

  const typeOptionsByType = new Map<string, AdminPRTypeOption>();
  for (const event of events) {
    if (typeOptionsByType.has(event.type)) {
      continue;
    }

    typeOptionsByType.set(event.type, {
      type: event.type,
      eventTitle: event.title,
      locationOptions: normalizeLocationPool(event.locationPool),
      routeOptions: normalizeAnchorEventRoutePool(event.routePool),
      defaultMinPartners: event.defaultMinPartners ?? null,
      defaultMaxPartners: event.defaultMaxPartners ?? null,
      defaultConfirmationEnabled: event.defaultConfirmationEnabled,
      defaultConfirmationStartOffsetMinutes:
        event.defaultConfirmationStartOffsetMinutes ??
        DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
      defaultConfirmationEndOffsetMinutes:
        event.defaultConfirmationEndOffsetMinutes ??
        DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
      defaultJoinLockOffsetMinutes:
        event.defaultJoinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
      joinGateConfig: event.joinGateConfig,
      feedbackQuestionnaireTemplateId:
        event.feedbackQuestionnaireTemplateId ?? null,
      prCreationPolicy: event.prCreationPolicy,
    });
  }

  const [templates, instances] = await Promise.all([
    feedbackRepo.listTemplates(),
    feedbackRepo.listInstances(),
  ]);

  return {
    prs,
    typeOptions: Array.from(typeOptionsByType.values()),
    feedbackQuestionnaireTemplates: templates.map((template) => ({
      id: template.id,
      key: template.key,
      version: template.version,
      title: template.title,
    })),
    feedbackQuestionnaireInstances: instances.map((instance) => ({
      id: instance.id,
      templateId: instance.templateId,
      title: instance.title,
    })),
  };
}
