import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type {
  AnchorEventRoutePool,
  MeetingPointConfig,
  MeetingPointConfigMap,
  PRJoinGateConfig,
  PRRoute,
  AnchorEventFullPrExpansionPolicy,
  AnchorEventParticipationFrequencyLimit,
  AnchorEventPrCreationPolicy,
  FeedbackQuestionnaireTemplate,
  FeedbackQuestionnaireTemplateId,
} from "../../../entities";
import { normalizeAnchorEventRoutePool } from "../../../entities";
import type { AnchorEventPRContextRecord } from "../../../repositories/AnchorEventPRContextRepository";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import {
  countActivePartnersForPR,
  readAnchorEventPRContextRecordsByEventTimeWindow,
  resolvePRPlaceDisplayName,
} from "../../pr/services";
import { getEffectiveBookingDeadline } from "../../pr-booking-support";
import { listAnchorEventTimeWindowDetails } from "../../anchor-event/services/time-window-pool";

const anchorEventRepo = new AnchorEventRepository();
const feedbackRepo = new FeedbackQuestionnaireRepository();

type AdminPRSummary = {
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
  partnerCount: number;
  confirmationEnabled: boolean;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
  bookingTriggeredAt: string | null;
  effectiveBookingDeadlineAt: string | null;
  createdAt: string;
};

type AdminAnchorTimeWindowSummary = {
  key: string;
  timeWindow: [string | null, string | null];
  description: string | null;
  prs: AdminPRSummary[];
};

export type AdminAnchorEventSummary = {
  id: number;
  title: string;
  type: string;
  description: string | null;
  locationPool: string[];
  routePool: AnchorEventRoutePool;
  timePoolConfig: {
    durationMinutes: number | null;
    earliestLeadMinutes: number | null;
    startRules: Array<
      | {
          id: string;
          kind: "ABSOLUTE";
          startAt: string;
          description: string | null;
        }
      | {
          id: string;
          kind: "RECURRING";
          weekdays: number[];
          timeOfDay: string;
          description: string | null;
        }
    >;
  };
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultPrNotes: string | null;
  defaultConfirmationEnabled: boolean;
  defaultConfirmationStartOffsetMinutes: number | null;
  defaultConfirmationEndOffsetMinutes: number | null;
  defaultJoinLockOffsetMinutes: number | null;
  meetingPoint: MeetingPointConfig | null;
  locationMeetingPoints: MeetingPointConfigMap;
  joinGateConfig: PRJoinGateConfig;
  participationFrequencyLimit: AnchorEventParticipationFrequencyLimit;
  feedbackQuestionnaireTemplateId: FeedbackQuestionnaireTemplateId | null;
  timeWindowPool: [string | null, string | null][];
  coverImage: string | null;
  betaGroupQrCode: string | null;
  prCreationPolicy: AnchorEventPrCreationPolicy;
  fullPrExpansionPolicy: AnchorEventFullPrExpansionPolicy;
  status: string;
  createdAt: string;
  updatedAt: string;
  timeWindows: AdminAnchorTimeWindowSummary[];
};

export interface AdminAnchorEventWorkspace {
  events: AdminAnchorEventSummary[];
  feedbackQuestionnaireTemplates: Array<{
    id: FeedbackQuestionnaireTemplate["id"];
    key: string;
    version: string;
    title: string;
  }>;
}

const toAdminPRSummary = async (
  record: AnchorEventPRContextRecord,
): Promise<AdminPRSummary> => ({
  prId: record.root.id,
  title: record.root.title,
  type: record.root.type,
  location: record.root.location,
  route: record.root.route,
  placeDisplayName: resolvePRPlaceDisplayName(record.root),
  time: record.root.time,
  status: record.root.status,
  visibilityStatus: record.anchor.visibilityStatus,
  minPartners: record.root.minPartners,
  maxPartners: record.root.maxPartners,
  preferences: [...record.root.preferences],
  notes: record.root.notes,
  meetingPoint: record.root.meetingPoint,
  joinGateConfig: record.root.joinGateConfig,
  partnerCount: await countActivePartnersForPR(record.root.id),
  confirmationEnabled: record.anchor.confirmationEnabled,
  confirmationStartOffsetMinutes: record.anchor.confirmationStartOffsetMinutes,
  confirmationEndOffsetMinutes: record.anchor.confirmationEndOffsetMinutes,
  joinLockOffsetMinutes: record.anchor.joinLockOffsetMinutes,
  bookingTriggeredAt: record.anchor.bookingTriggeredAt?.toISOString() ?? null,
  effectiveBookingDeadlineAt:
    (await getEffectiveBookingDeadline(record.root.id))?.toISOString() ?? null,
  createdAt: record.root.createdAt.toISOString(),
});

export async function getAdminAnchorEventWorkspace(): Promise<AdminAnchorEventWorkspace> {
  const events = await anchorEventRepo.listAll();

  const eventSummaries = await Promise.all(
    events.map(async (event) => {
      const timeWindowDetails = listAnchorEventTimeWindowDetails(event);
      const timeWindowPool = timeWindowDetails.map(
        (detail) => detail.timeWindow,
      );
      const timeWindowSummaries = await Promise.all(
        timeWindowDetails.map(async (detail) => {
          const prs = await readAnchorEventPRContextRecordsByEventTimeWindow(
            event.id,
            detail.timeWindow,
            {
              consistency: "strong",
            },
          );
          const prSummaries = await Promise.all(
            prs.map((record) => toAdminPRSummary(record)),
          );

          return {
            key: detail.key,
            timeWindow: detail.timeWindow,
            description: detail.description,
            prs: prSummaries,
          };
        }),
      );

      return {
        id: event.id,
        title: event.title,
        type: event.type,
        description: event.description,
        locationPool: Array.isArray(event.locationPool)
          ? [...event.locationPool]
          : [],
        routePool: normalizeAnchorEventRoutePool(event.routePool),
        timePoolConfig: event.timePoolConfig,
        defaultMinPartners: event.defaultMinPartners ?? null,
        defaultMaxPartners: event.defaultMaxPartners ?? null,
        defaultPrNotes: event.defaultPrNotes ?? null,
        defaultConfirmationEnabled: event.defaultConfirmationEnabled,
        defaultConfirmationStartOffsetMinutes:
          event.defaultConfirmationStartOffsetMinutes ?? null,
        defaultConfirmationEndOffsetMinutes:
          event.defaultConfirmationEndOffsetMinutes ?? null,
        defaultJoinLockOffsetMinutes: event.defaultJoinLockOffsetMinutes ?? null,
        meetingPoint: event.meetingPoint,
        locationMeetingPoints: event.locationMeetingPoints,
        joinGateConfig: event.joinGateConfig,
        participationFrequencyLimit: event.participationFrequencyLimit,
        feedbackQuestionnaireTemplateId:
          event.feedbackQuestionnaireTemplateId ?? null,
        timeWindowPool,
        coverImage: event.coverImage,
        betaGroupQrCode: event.betaGroupQrCode,
        prCreationPolicy: event.prCreationPolicy,
        fullPrExpansionPolicy: event.fullPrExpansionPolicy,
        status: event.status,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        timeWindows: timeWindowSummaries,
      };
    }),
  );

  const templates = await feedbackRepo.listTemplates();

  return {
    events: eventSummaries,
    feedbackQuestionnaireTemplates: templates.map((template) => ({
      id: template.id,
      key: template.key,
      version: template.version,
      title: template.title,
    })),
  };
}
