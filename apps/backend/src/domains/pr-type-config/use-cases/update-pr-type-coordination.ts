import { randomUUID } from "node:crypto";
import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";
import type { TransactionExecutor } from "../../../repositories/_executor";
import { createTransactionBoundMeetingPointUpdatedNotificationPort } from "../../notification";
import {
  captureEffectiveMeetingPointsForRequests,
  collectMeetingPointNotificationChanges,
  createTransactionBoundEffectiveMeetingPointResolver,
} from "../../pr/ports";
import type { PRTypeConfigCoordination, PRTypeConfigOperatorDetail } from "../contracts";
import { toPRTypeConfigOperatorDetail } from "../services/projection";

const MAX_SERIALIZATION_ATTEMPTS = 8;

const serializationRetryDelay = (attempt: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.min(40, 5 * (attempt + 1)));
  });

const isSerializationFailure = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === "40001";

type PRTypeCoordinationMeetingPointTransaction = {
  update(input: {
    type: string;
    input: PRTypeConfigCoordination;
  }): Promise<PRTypeConfigOperatorDetail>;
};

type PRTypeCoordinationTransactionContext = {
  tx: TransactionExecutor;
  configRepo: PRTypeConfigRepository;
  requestRepo: PartnerRequestRepository;
  partnerRepo: PartnerRepository;
};

type CreateMeetingPointUpdatedNotificationPort = (
  input: Parameters<typeof createTransactionBoundMeetingPointUpdatedNotificationPort>[0],
) => ReturnType<typeof createTransactionBoundMeetingPointUpdatedNotificationPort>;

/**
 * This is deliberately a coordination-source protocol, not a reusable
 * transaction callback. It serializes one immutable type config with the
 * complete PR set whose effective point can depend on that config.
 */
const runPRTypeCoordinationTransaction = async <Result>(input: {
  execute: (context: PRTypeCoordinationTransactionContext) => Promise<Result>;
}): Promise<Result> => {
  let lastSerializationFailure: unknown = null;
  for (let attempt = 0; attempt < MAX_SERIALIZATION_ATTEMPTS; attempt += 1) {
    try {
      return await db.transaction(
        async (tx) =>
          input.execute({
            tx,
            configRepo: new PRTypeConfigRepository(tx),
            requestRepo: new PartnerRequestRepository(tx),
            partnerRepo: new PartnerRepository(tx),
          }),
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
 * PR Type Config's atomic meeting-point transaction. The factory remains
 * owner-internal; the public domain surface exposes only the update command.
 */
export const createPRTypeCoordinationMeetingPointTransaction = (
  dependencies: {
    createNotificationPort?: CreateMeetingPointUpdatedNotificationPort;
  } = {},
): PRTypeCoordinationMeetingPointTransaction => {
  const createNotificationPort =
    dependencies.createNotificationPort ??
    createTransactionBoundMeetingPointUpdatedNotificationPort;

  return {
    async update(input): Promise<PRTypeConfigOperatorDetail> {
      const type = input.type.trim();
      return runPRTypeCoordinationTransaction({
        execute: async (context) => {
          const config = await context.configRepo.findByTypeForUpdate(type);
          if (!config) {
            return throwHttpProblem({
              status: 404,
              detail: "PR type configuration not found",
              code: "PR_TYPE_CONFIG_NOT_FOUND",
            });
          }

          const lockedRequests = await context.requestRepo.findByTypeForUpdate(type);
          const resolveEffectiveMeetingPoint = createTransactionBoundEffectiveMeetingPointResolver(
            context.tx,
          );
          const previous = await captureEffectiveMeetingPointsForRequests(
            lockedRequests,
            resolveEffectiveMeetingPoint,
          );

          const saved = await context.configRepo.updateByType(type, {
            meetingPoint: input.input.meetingPoint,
            locationMeetingPoints: input.input.locationMeetingPoints,
          });
          if (!saved) {
            throw new Error("PR_TYPE_COORDINATION_WRITE_FAILED");
          }

          const changes = await collectMeetingPointNotificationChanges({
            previous,
            requests: lockedRequests,
            resolve: resolveEffectiveMeetingPoint,
          });
          if (changes.length === 0) {
            return toPRTypeConfigOperatorDetail(saved);
          }

          const meetingPointUpdateId = randomUUID();
          const updatedAtIso = new Date().toISOString();
          const notificationPort = createNotificationPort({
            executor: context.tx,
          });

          for (const change of changes) {
            const activeRecipients = await context.partnerRepo.listActiveParticipantSummariesByPrId(
              change.request.id,
            );
            await notificationPort.requestForSourceRecipients({
              prId: change.request.id,
              meetingPointUpdateId,
              meetingPointDescription: change.meetingPointDescription,
              updatedAtIso,
              correlationId: `meeting-point:pr-type:${meetingPointUpdateId}`,
              activeRecipientCandidateUserIds: activeRecipients.map(
                (recipient) => recipient.userId,
              ),
            });
          }

          return toPRTypeConfigOperatorDetail(saved);
        },
      });
    },
  };
};
