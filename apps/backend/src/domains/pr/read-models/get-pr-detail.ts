import { throwHttpProblem } from "../../../lib/problem-details";
import type { PRRoute, PRStatus } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import type { FeedbackQuestionnaireDefinition } from "../../../entities/feedback-questionnaire";
import { resolveUserByOpenId } from "../../user";
import { PRSupportResourceRepository } from "../../../repositories/PRSupportResourceRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventPRContextRepository } from "../../../repositories/AnchorEventPRContextRepository";
import {
  buildBookingSupportPreview,
  getEffectiveBookingDeadline,
  resolveBookingContactState,
} from "../../pr-booking-support";
import {
  buildPRPartnerSection,
  type PartnerSectionView,
} from "../../pr-core/services/partner-section-view.service";
import {
  evaluateAnchorEventParticipationFrequencyLimit,
} from "../../pr-core/services/anchor-participation-frequency-limit.service";
import {
  hasAnchorParticipationPolicy,
  resolveEffectiveMeetingPoint,
  resolveAnchorParticipationPolicy,
  type EffectiveMeetingPoint,
} from "../../pr/services";
import { readPartnerRequestById } from "../../pr/services";
import {
  buildPRCanonicalShareMetadata,
  type PRCanonicalShareMetadata,
} from "../sharing/pr-share-metadata.service";
import { toPublicPR } from "./public-pr-view.service";
import { resolvePRPlaceDisplayName } from "../../pr-core/services/pr-place-mode.service";

const prSupportRepo = new PRSupportResourceRepository();
const partnerRepo = new PartnerRepository();
const feedbackRepo = new FeedbackQuestionnaireRepository();
const anchorEventRepo = new AnchorEventRepository();
const anchorEventContextRepo = new AnchorEventPRContextRepository();

export type PRMeetingPointVisibility =
  | "VISIBLE"
  | "ACTIVE_PARTICIPANTS_ONLY";

export type PRDetail = {
  id: number;
  title?: string;
  status: PRStatus;
  createdAt: string;
  createdBy?: string | null;
  core: {
    type: string;
    time: [string | null, string | null];
    location: string | null;
    route: PRRoute | null;
    placeDisplayName: string | null;
    minPartners: number | null;
    maxPartners: number | null;
    partners: number[];
    myPartnerId: number | null;
    budget: string | null;
    preferences: string[];
    notes: string | null;
    meetingPoint: EffectiveMeetingPoint | null;
    meetingPointVisibility: PRMeetingPointVisibility;
  };
  anchorEventContext: {
    id: number;
    title: string;
    betaGroupQrCode: string | null;
  } | null;
  share: {
    canonical: PRCanonicalShareMetadata;
    xiaohongshuPoster?: {
      caption: string;
      posterStylePrompt: string;
      posterUrl: string;
      createdAt: string;
    } | null;
    wechatThumbnail?: {
      style: number;
      posterUrl: string;
      createdAt: string;
    } | null;
  };
  bookingSupport: {
    available: boolean;
    overview: {
      headline: string | null;
      highlights: string[];
      effectiveBookingDeadlineAt: string | null;
    };
  };
  feedbackQuestionnaire: {
    instanceId: number;
    title: string;
    definition: FeedbackQuestionnaireDefinition;
    responseState:
      | {
          status: "NOT_SUBMITTED";
        }
      | {
          status: "SUBMITTED";
          responseId: number;
          submittedAt: string;
          updatedAt: string;
        };
  } | null;
  partnerSection: PartnerSectionView;
};

const resolveMeetingPointProjection = (
  publicPR: Awaited<ReturnType<typeof toPublicPR>>,
  meetingPoint: EffectiveMeetingPoint | null,
): {
  meetingPoint: EffectiveMeetingPoint | null;
  meetingPointVisibility: PRMeetingPointVisibility;
} => {
  if (
    publicPR.status === "ACTIVE" &&
    publicPR.myPartnerId === null &&
    meetingPoint !== null
  ) {
    return {
      meetingPoint: null,
      meetingPointVisibility: "ACTIVE_PARTICIPANTS_ONLY",
    };
  }

  return {
    meetingPoint,
    meetingPointVisibility: "VISIBLE",
  };
};

const resolveAnchorEventContextProjection = async (
  prId: number,
): Promise<PRDetail["anchorEventContext"]> => {
  const context = await anchorEventContextRepo.findByPrId(prId);
  if (!context) {
    return null;
  }

  const event = await anchorEventRepo.findById(context.anchorEventId);
  if (!event) {
    return null;
  }

  return {
    id: event.id,
    title: event.title,
    betaGroupQrCode: event.betaGroupQrCode,
  };
};

export async function getPRDetailView(
  id: number,
  viewerIdentity?: {
    userId?: UserId | null;
    openId?: string | null;
  },
): Promise<PRDetail> {
  const request = await readPartnerRequestById(id, {
    consistency: "strong",
  });
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  const viewerOpenId = viewerIdentity?.openId?.trim() ?? null;
  const viewerUserId =
    viewerOpenId && viewerOpenId.length > 0
      ? (await resolveUserByOpenId(viewerOpenId)).id
      : viewerIdentity?.userId ?? null;

  const publicPR = await toPublicPR(request, viewerUserId);
  const effectiveMeetingPoint = await resolveEffectiveMeetingPoint(publicPR);
  const meetingPointProjection = resolveMeetingPointProjection(
    publicPR,
    effectiveMeetingPoint,
  );
  const canonicalShare = buildPRCanonicalShareMetadata(publicPR);
  const anchorEventContext =
    await resolveAnchorEventContextProjection(publicPR.id);
  const supportResources = await prSupportRepo.findByPrId(id);
  const bookingSupportPreview = buildBookingSupportPreview(supportResources);
  const bookingDeadlineAt = await getEffectiveBookingDeadline(id);
  const bookingContact = await resolveBookingContactState({
    prId: id,
    viewerUserId,
    supportResources,
    effectiveBookingDeadlineAt: bookingDeadlineAt,
  });
  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(
    id,
  );
  const pendingParticipants = await partnerRepo.listPendingParticipantSummariesByPrId(
    id,
  );
  const rosterParticipants = await partnerRepo.listRosterParticipantSummariesByPrId(
    id,
  );
  const policy = hasAnchorParticipationPolicy(request)
    ? resolveAnchorParticipationPolicy(request, request.time)
    : null;
  const feedbackInstance = request.feedbackQuestionnaireInstanceId
    ? await feedbackRepo.findInstanceById(request.feedbackQuestionnaireInstanceId)
    : null;
  const feedbackResponse =
    feedbackInstance && viewerUserId
      ? await feedbackRepo.findResponseByInstanceAndUser({
          instanceId: feedbackInstance.id,
          respondentUserId: viewerUserId,
        })
      : null;
  const participationFrequencyEvaluation =
    await evaluateAnchorEventParticipationFrequencyLimit({
      request,
      userId: viewerUserId,
    });

  return {
    id: publicPR.id,
    title: publicPR.title,
    status: publicPR.status,
    createdAt: publicPR.createdAt.toISOString(),
    createdBy: publicPR.createdBy ?? undefined,
    core: {
      type: publicPR.type,
      time: publicPR.time,
      location: publicPR.location,
      route: publicPR.route,
      placeDisplayName: resolvePRPlaceDisplayName(publicPR),
      minPartners: publicPR.minPartners,
      maxPartners: publicPR.maxPartners,
      partners: publicPR.partners,
      myPartnerId: publicPR.myPartnerId,
      budget: publicPR.budget,
      preferences: publicPR.preferences,
      notes: publicPR.notes,
      meetingPoint: meetingPointProjection.meetingPoint,
      meetingPointVisibility: meetingPointProjection.meetingPointVisibility,
    },
    anchorEventContext,
    share: {
      canonical: canonicalShare,
      xiaohongshuPoster: publicPR.xiaohongshuPoster
        ? {
            ...publicPR.xiaohongshuPoster,
            createdAt: publicPR.xiaohongshuPoster.createdAt,
          }
        : null,
      wechatThumbnail: publicPR.wechatThumbnail
        ? {
            ...publicPR.wechatThumbnail,
            createdAt: publicPR.wechatThumbnail.createdAt,
          }
        : null,
    },
    bookingSupport: {
      available: supportResources.length > 0,
      overview: {
        headline: bookingSupportPreview.headline,
        highlights: bookingSupportPreview.highlights,
        effectiveBookingDeadlineAt:
          bookingSupportPreview.effectiveBookingDeadlineAt,
      },
    },
    feedbackQuestionnaire: feedbackInstance
      ? {
          instanceId: feedbackInstance.id,
          title: feedbackInstance.title,
          definition: feedbackInstance.definition,
          responseState: feedbackResponse
            ? {
                status: "SUBMITTED",
                responseId: feedbackResponse.id,
                submittedAt: feedbackResponse.submittedAt.toISOString(),
                updatedAt: feedbackResponse.updatedAt.toISOString(),
              }
            : {
                status: "NOT_SUBMITTED",
              },
        }
      : null,
    partnerSection: buildPRPartnerSection({
      publicPR,
      activeParticipants,
      pendingParticipants,
      rosterParticipants,
      viewerUserId,
      policy,
      bookingDeadlineAt,
      bookingContact,
      participationFrequencyLimited:
        participationFrequencyEvaluation.allowed === false,
    }),
  };
}
