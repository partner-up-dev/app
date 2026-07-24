import type { InferRequestType, InferResponseType } from "hono";
import type {
  AdminPRTypeConfigAuthoring,
  AdminPRTypeConfigCompletion,
  AdminPRTypeConfigCoordination,
  AdminPRTypeConfigDiscovery,
  AdminPRTypeConfigDraft,
  AdminPRTypeConfigParticipation,
} from "@/domains/admin/model/pr-type-config-editor";
import { adminClient } from "@/lib/admin-rpc";

type ConfigApi = (typeof adminClient.api.admin)["pr-type-configs"];
type DetailRoute = ConfigApi[":type"];
type AuthoringRoute = DetailRoute["authoring"];
type DiscoveryRoute = DetailRoute["discovery"];
type ParticipationRoute = DetailRoute["participation"];
type CoordinationRoute = DetailRoute["coordination"];
type CompletionRoute = DetailRoute["completion"];

export type AdminPRTypeConfigDetailResponse = InferResponseType<DetailRoute["$get"]>;
export type AdminPRTypeConfigCreateResponse = InferResponseType<DetailRoute["$put"]>;
export type AdminPRTypeConfigSliceResponse = InferResponseType<AuthoringRoute["$put"]>;

type AdminPRTypeConfigCreateRequest = InferRequestType<DetailRoute["$put"]>["json"];
type AdminPRTypeConfigAuthoringRequest = InferRequestType<AuthoringRoute["$put"]>["json"];
type AdminPRTypeConfigDiscoveryRequest = InferRequestType<DiscoveryRoute["$put"]>["json"];
type AdminPRTypeConfigParticipationRequest = InferRequestType<ParticipationRoute["$put"]>["json"];
type AdminPRTypeConfigCoordinationRequest = InferRequestType<CoordinationRoute["$put"]>["json"];
type AdminPRTypeConfigCompletionRequest = InferRequestType<CompletionRoute["$put"]>["json"];

type AdminPRTypeConfigResponse =
  | AdminPRTypeConfigDetailResponse
  | AdminPRTypeConfigCreateResponse
  | AdminPRTypeConfigSliceResponse;

export const toAdminPRTypeConfigDraft = (
  response: AdminPRTypeConfigResponse,
): AdminPRTypeConfigDraft => ({
  authoring: {
    locationPool: [...response.authoring.locationPool],
    routePool: structuredClone(response.authoring.routePool),
    timePoolConfig: structuredClone(response.authoring.timePoolConfig),
    timeWindowEditorDefaultMode: response.authoring.timeWindowEditorDefaultMode,
    defaultMinPartners: response.authoring.defaultMinPartners,
    defaultMaxPartners: response.authoring.defaultMaxPartners,
    defaultNotes: response.authoring.defaultNotes,
    authoringCreationPolicy: response.authoring.authoringCreationPolicy,
  },
  discovery: {
    title: response.discovery.title,
    description: response.discovery.description,
    coverImage: response.discovery.coverImage,
    communityQrCode: response.discovery.communityQrCode,
    viewRatios: {
      FORM: response.discovery.viewRatios.FORM,
      CARD: response.discovery.viewRatios.CARD,
      LIST: response.discovery.viewRatios.LIST,
    },
  },
  participation: {
    defaultConfirmationEnabled: response.participation.defaultConfirmationEnabled,
    defaultConfirmationStartOffsetMinutes:
      response.participation.defaultConfirmationStartOffsetMinutes,
    defaultConfirmationEndOffsetMinutes: response.participation.defaultConfirmationEndOffsetMinutes,
    defaultJoinLockOffsetMinutes: response.participation.defaultJoinLockOffsetMinutes,
    joinGateConfig: structuredClone(response.participation.joinGateConfig),
    participationFrequencyLimit: response.participation.participationFrequencyLimit
      ? { intervalPrCount: response.participation.participationFrequencyLimit.intervalPrCount }
      : null,
    fullCapacityExpansionPolicy: response.participation.fullCapacityExpansionPolicy,
  },
  coordination: {
    meetingPoint: response.coordination.meetingPoint
      ? {
          description: response.coordination.meetingPoint.description,
          imageUrl: response.coordination.meetingPoint.imageUrl,
        }
      : null,
    locationMeetingPoints: Object.fromEntries(
      Object.entries(response.coordination.locationMeetingPoints).map(
        ([location, meetingPoint]) => [
          location,
          {
            description: meetingPoint.description,
            imageUrl: meetingPoint.imageUrl,
          },
        ],
      ),
    ),
  },
  completion: {
    feedbackQuestionnaireTemplateId: response.completion.feedbackQuestionnaireTemplateId,
  },
});

export const toAdminPRTypeConfigAuthoringRequest = (
  value: AdminPRTypeConfigAuthoring,
): AdminPRTypeConfigAuthoringRequest => ({
  locationPool: [...value.locationPool],
  routePool: structuredClone(value.routePool),
  timePoolConfig: structuredClone(value.timePoolConfig),
  timeWindowEditorDefaultMode: value.timeWindowEditorDefaultMode,
  defaultMinPartners: value.defaultMinPartners,
  defaultMaxPartners: value.defaultMaxPartners,
  defaultNotes: value.defaultNotes,
  authoringCreationPolicy: value.authoringCreationPolicy,
});

export const toAdminPRTypeConfigDiscoveryRequest = (
  value: AdminPRTypeConfigDiscovery,
): AdminPRTypeConfigDiscoveryRequest => ({
  title: value.title,
  description: value.description,
  coverImage: value.coverImage,
  communityQrCode: value.communityQrCode,
  viewRatios: {
    FORM: value.viewRatios.FORM,
    CARD: value.viewRatios.CARD,
    LIST: value.viewRatios.LIST,
  },
});

export const toAdminPRTypeConfigParticipationRequest = (
  value: AdminPRTypeConfigParticipation,
): AdminPRTypeConfigParticipationRequest => ({
  defaultConfirmationEnabled: value.defaultConfirmationEnabled,
  defaultConfirmationStartOffsetMinutes: value.defaultConfirmationStartOffsetMinutes,
  defaultConfirmationEndOffsetMinutes: value.defaultConfirmationEndOffsetMinutes,
  defaultJoinLockOffsetMinutes: value.defaultJoinLockOffsetMinutes,
  joinGateConfig: structuredClone(value.joinGateConfig),
  participationFrequencyLimit: value.participationFrequencyLimit
    ? { intervalPrCount: value.participationFrequencyLimit.intervalPrCount }
    : null,
  fullCapacityExpansionPolicy: value.fullCapacityExpansionPolicy,
});

export const toAdminPRTypeConfigCoordinationRequest = (
  value: AdminPRTypeConfigCoordination,
): AdminPRTypeConfigCoordinationRequest => ({
  meetingPoint: value.meetingPoint
    ? {
        description: value.meetingPoint.description,
        imageUrl: value.meetingPoint.imageUrl,
      }
    : null,
  locationMeetingPoints: Object.fromEntries(
    Object.entries(value.locationMeetingPoints).map(([location, meetingPoint]) => [
      location,
      {
        description: meetingPoint.description,
        imageUrl: meetingPoint.imageUrl,
      },
    ]),
  ),
});

export const toAdminPRTypeConfigCompletionRequest = (
  value: AdminPRTypeConfigCompletion,
): AdminPRTypeConfigCompletionRequest => ({
  feedbackQuestionnaireTemplateId: value.feedbackQuestionnaireTemplateId,
});

export const toAdminPRTypeConfigCreateRequest = (
  draft: AdminPRTypeConfigDraft,
): AdminPRTypeConfigCreateRequest => ({
  authoring: toAdminPRTypeConfigAuthoringRequest(draft.authoring),
  discovery: toAdminPRTypeConfigDiscoveryRequest(draft.discovery),
  participation: toAdminPRTypeConfigParticipationRequest(draft.participation),
  coordination: toAdminPRTypeConfigCoordinationRequest(draft.coordination),
  completion: toAdminPRTypeConfigCompletionRequest(draft.completion),
});
