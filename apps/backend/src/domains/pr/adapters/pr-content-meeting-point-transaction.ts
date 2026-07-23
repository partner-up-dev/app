import { randomUUID } from "node:crypto";
import type { PartnerId } from "../../../entities/partner";
import type { PartnerRequest, PartnerRequestFields, PRId } from "../../../entities/partner-request";
import {
  createTransactionBoundMeetingPointUpdatedNotificationPort,
  type MeetingPointUpdatedNotificationPort,
} from "../../notification";
import { db } from "../../../lib/db";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { TransactionExecutor } from "../../../repositories/_executor";
import { createTransactionBoundEffectiveMeetingPointResolver } from "./transactional-meeting-point-resolver";
import { releasePRParticipantMessageWindow } from "./pr-participant-message-window-release";
import {
  captureEffectiveMeetingPointsForRequests,
  collectMeetingPointNotificationChanges,
} from "../services/meeting-point-change-notifier.service";
import { recalculatePRStatus, syncSlotCapacity } from "../services/slot-management.service";

const MAX_SERIALIZATION_ATTEMPTS = 8;

const serializationRetryDelay = (attempt: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.min(40, 5 * (attempt + 1)));
  });

const isSerializationFailure = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === "40001";

export type PRContentReleaseParticipant = {
  partnerId: PartnerId;
  releaseReason: string;
};

export type PRContentMeetingPointTransactionResult =
  | { outcome: "UPDATED"; request: PartnerRequest; releasedPartnerIds: PartnerId[] }
  | { outcome: "PR_MISSING" };

export type PRContentMeetingPointTransactionPort = {
  update(input: {
    prId: PRId;
    fields: PartnerRequestFields;
    releaseParticipants: readonly PRContentReleaseParticipant[];
    validateSlotCapacity: boolean;
    recalculateStatus: boolean;
  }): Promise<PRContentMeetingPointTransactionResult>;
};

type PRContentMeetingPointTransactionContext = {
  tx: TransactionExecutor;
  request: PartnerRequest | null;
  requestRepo: PartnerRequestRepository;
  partnerRepo: PartnerRepository;
};

type CreateMeetingPointUpdatedNotificationPort = (
  input: Parameters<typeof createTransactionBoundMeetingPointUpdatedNotificationPort>[0],
) => MeetingPointUpdatedNotificationPort;

/**
 * A deliberately content-specific transaction protocol. It protects the
 * source row/cache mutation and its generic meeting-point fan-out, while
 * joining only the slot releases that determine the same frozen recipient
 * roster. It is not a generic callback for arbitrary PR side effects.
 */
const runPRContentMeetingPointTransaction = async <Result>(input: {
  prId: PRId;
  execute: (context: PRContentMeetingPointTransactionContext) => Promise<Result>;
}): Promise<Result> => {
  let lastSerializationFailure: unknown = null;
  for (let attempt = 0; attempt < MAX_SERIALIZATION_ATTEMPTS; attempt += 1) {
    try {
      return await db.transaction(
        async (tx) => {
          const requestRepo = new PartnerRequestRepository(tx);
          const request = await requestRepo.findByIdForUpdate(input.prId);
          return input.execute({
            tx,
            request,
            requestRepo,
            partnerRepo: new PartnerRepository(tx),
          });
        },
        { isolationLevel: "serializable" },
      );
    } catch (error) {
      if (!isSerializationFailure(error) || attempt === MAX_SERIALIZATION_ATTEMPTS - 1) {
        throw error;
      }
      lastSerializationFailure = error;
      await serializationRetryDelay(attempt);
    }
  }
  throw lastSerializationFailure;
};

/**
 * PR's named atomic bridge for a content mutation that may change its
 * effective meeting point. Notification receives immutable source facts and a
 * frozen roster only; its private Job policy stays on the Notification side.
 */
export const createPRContentMeetingPointTransactionPort = (
  dependencies: {
    createNotificationPort?: CreateMeetingPointUpdatedNotificationPort;
  } = {},
): PRContentMeetingPointTransactionPort => {
  const createNotificationPort =
    dependencies.createNotificationPort ??
    createTransactionBoundMeetingPointUpdatedNotificationPort;

  return {
    async update(input): Promise<PRContentMeetingPointTransactionResult> {
      return runPRContentMeetingPointTransaction({
        prId: input.prId,
        execute: async (context) => {
          const previousRequest = context.request;
          if (!previousRequest) {
            return { outcome: "PR_MISSING" };
          }

          const resolveEffectiveMeetingPoint = createTransactionBoundEffectiveMeetingPointResolver(
            context.tx,
          );
          const previous = await captureEffectiveMeetingPointsForRequests(
            [previousRequest],
            resolveEffectiveMeetingPoint,
          );

          const releasedPartnerIds: PartnerId[] = [];
          for (const participant of input.releaseParticipants) {
            const released = await context.partnerRepo.markActiveReleased(participant.partnerId, {
              releaseReason: participant.releaseReason,
            });
            if (released) {
              await releasePRParticipantMessageWindow({
                executor: context.tx,
                prId: input.prId,
                recipientUserId: released.userId,
              });
              releasedPartnerIds.push(participant.partnerId);
            }
          }

          if (input.validateSlotCapacity) {
            await syncSlotCapacity(input.prId, input.fields.maxPartners, context.tx);
          }

          const updated = await context.requestRepo.updateFields(input.prId, input.fields);
          if (!updated) {
            throw new Error("PR_CONTENT_WRITE_FAILED");
          }
          await context.requestRepo.clearPosterCache(input.prId);

          if (input.recalculateStatus) {
            await recalculatePRStatus(input.prId, context.tx);
          }

          const currentRequest = await context.requestRepo.findById(input.prId);
          if (!currentRequest) {
            throw new Error("PR_CONTENT_RELOAD_FAILED");
          }

          const changes = await collectMeetingPointNotificationChanges({
            previous,
            requests: [currentRequest],
            resolve: resolveEffectiveMeetingPoint,
          });
          if (changes.length === 0) {
            return {
              outcome: "UPDATED",
              request: currentRequest,
              releasedPartnerIds,
            };
          }

          const activeRecipients = await context.partnerRepo.listActiveParticipantSummariesByPrId(
            input.prId,
          );
          const notificationPort = createNotificationPort({
            executor: context.tx,
          });

          for (const change of changes) {
            const meetingPointUpdateId = randomUUID();
            await notificationPort.requestForSourceRecipients({
              prId: change.request.id,
              meetingPointUpdateId,
              meetingPointDescription: change.meetingPointDescription,
              updatedAtIso: new Date().toISOString(),
              correlationId: `meeting-point:pr-content:${meetingPointUpdateId}`,
              activeRecipientCandidateUserIds: activeRecipients.map(
                (recipient) => recipient.userId,
              ),
            });
          }

          return {
            outcome: "UPDATED",
            request: currentRequest,
            releasedPartnerIds,
          };
        },
      });
    },
  };
};
