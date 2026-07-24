import type { FeedbackQuestionnaireDefinition } from "../../../entities/feedback-questionnaire";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type { PRRoute, PRStatus } from "../contracts/partner-request";
import {
  type EffectiveMeetingPoint,
  resolveEffectiveMeetingPoint,
} from "../services/meeting-point.service";
import {
  hasParticipationPolicy,
  resolveParticipationPolicy,
} from "../services/participation-policy.service";
import {
  buildPRPartnerSection,
  type PartnerSectionView,
} from "../services/partner-section-view.service";
import {
  buildPREditCapability,
  buildPREditPostReadyCapability,
  type PREditCapability,
  type PREditPostReadyCapability,
} from "../services/pr-edit-capability.service";
import { resolvePRPlaceDisplayName } from "../services/pr-place-mode.service";
import { readPartnerRequestById } from "../services/pr-read.service";
import { evaluatePRTypeParticipationFrequencyLimit } from "../services/pr-type-participation-frequency-limit.service";
import { resolveUserByOpenId } from "../../user";
import {
  buildPRCanonicalShareMetadata,
  type PRCanonicalShareMetadata,
} from "../sharing/pr-share-metadata.service";
import { toPublicPR } from "./public-pr-view.service";
import { assertPRDraftAccess, type PRDraftActor } from "../services/draft-access-policy.service";

const partnerRepo = new PartnerRepository();
const feedbackRepo = new FeedbackQuestionnaireRepository();

export type PRMeetingPointVisibility = "VISIBLE" | "ACTIVE_PARTICIPANTS_ONLY";

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
  editCapability: PREditCapability;
  editPostReadyCapability: PREditPostReadyCapability;
};

const resolveMeetingPointProjection = (
  publicPR: Awaited<ReturnType<typeof toPublicPR>>,
  meetingPoint: EffectiveMeetingPoint | null,
): {
  meetingPoint: EffectiveMeetingPoint | null;
  meetingPointVisibility: PRMeetingPointVisibility;
} => {
  if (publicPR.status === "ACTIVE" && publicPR.myPartnerId === null && meetingPoint !== null) {
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

export async function getPRDetailView(
  id: number,
  viewerIdentity?: {
    userId?: UserId | null;
    openId?: string | null;
    roles?: PRDraftActor["roles"];
  },
): Promise<PRDetail> {
  const request = await readPartnerRequestById(id, {
    consistency: "strong",
  });
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  assertPRDraftAccess({
    request,
    actor: {
      userId: viewerIdentity?.userId ?? null,
      roles: viewerIdentity?.roles ?? ["anonymous"],
    },
    operation: "read",
  });

  const viewerOpenId = viewerIdentity?.openId?.trim() ?? null;
  const viewerUserId =
    viewerOpenId && viewerOpenId.length > 0
      ? (await resolveUserByOpenId(viewerOpenId)).id
      : (viewerIdentity?.userId ?? null);

  const publicPR = await toPublicPR(request, viewerUserId);
  const effectiveMeetingPoint = await resolveEffectiveMeetingPoint(publicPR);
  const meetingPointProjection = resolveMeetingPointProjection(publicPR, effectiveMeetingPoint);
  const canonicalShare = buildPRCanonicalShareMetadata(publicPR);
  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(id);
  const pendingParticipants = await partnerRepo.listPendingParticipantSummariesByPrId(id);
  const rosterParticipants = await partnerRepo.listRosterParticipantSummariesByPrId(id);
  const policy = hasParticipationPolicy(request)
    ? resolveParticipationPolicy(request, request.time)
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
  const participationFrequencyEvaluation = await evaluatePRTypeParticipationFrequencyLimit({
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
      participationFrequencyLimited: participationFrequencyEvaluation.allowed === false,
    }),
    editCapability: buildPREditCapability(request, viewerUserId),
    editPostReadyCapability: buildPREditPostReadyCapability(request.allowEditAfterReady),
  };
}
