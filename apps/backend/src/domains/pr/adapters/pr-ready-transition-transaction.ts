import { randomUUID } from "node:crypto";
import type { PartnerRequest, PRId, PRReadyCycleId } from "../../../entities/partner-request";
import {
  createTransactionBoundPRReadyNotificationPort,
  type PRReadyNotificationPort,
} from "../../notification";
import { db } from "../../../lib/db";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { TransactionExecutor } from "../../../repositories/_executor";
import {
  hasParticipationPolicy,
  isJoinLockedByPolicy,
  resolveParticipationPolicy,
} from "../services/participation-policy.service";

const MAX_SERIALIZATION_ATTEMPTS = 8;
const serializationRetryDelay = (attempt: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.min(40, 5 * (attempt + 1)));
  });

const isSerializationFailure = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === "40001";

type PRReadyTransitionContext = {
  tx: TransactionExecutor;
  request: PartnerRequest | null;
  requestRepo: PartnerRequestRepository;
  partnerRepo: PartnerRepository;
};

export type PRReadyTransitionResult =
  | {
      outcome: "TRANSITIONED";
      request: PartnerRequest;
      readyCycleId: PRReadyCycleId;
    }
  | { outcome: "ALREADY_READY"; request: PartnerRequest }
  | { outcome: "NOT_JOIN_LOCKED"; request: PartnerRequest }
  | { outcome: "PR_MISSING" };

export type PRReadyTransitionTransactionPort = {
  transitionManual(input: { prId: PRId }): Promise<PRReadyTransitionResult>;
  transitionIfJoinLocked(input: { prId: PRId }): Promise<PRReadyTransitionResult>;
};

type CreatePRReadyNotificationPort = (
  input: Parameters<typeof createTransactionBoundPRReadyNotificationPort>[0],
) => PRReadyNotificationPort;

/**
 * This is deliberately a READY-specific transaction protocol, rather than a
 * generic PR transaction helper. Its locked observation defines the business
 * transition, durable ready cycle and exact source-time task fan-out together.
 */
const runPRReadyTransitionTransaction = async <Result>(input: {
  prId: PRId;
  execute: (context: PRReadyTransitionContext) => Promise<Result>;
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

const transitionLockedRequest = async (input: {
  context: PRReadyTransitionContext;
  createNotificationPort: CreatePRReadyNotificationPort;
}): Promise<Extract<PRReadyTransitionResult, { outcome: "TRANSITIONED" }> | null> => {
  const request = input.context.request;
  if (!request) return null;

  const readyCycleId = randomUUID();
  const updated = await input.context.requestRepo.enterReadyWithCycle(request.id, readyCycleId);
  if (!updated || updated.readyCycleId !== readyCycleId) {
    throw new Error("PR_READY_CYCLE_WRITE_FAILED");
  }

  const activeRecipients = await input.context.partnerRepo.listActiveParticipantSummariesByPrId(
    request.id,
  );
  const notificationPort = input.createNotificationPort({
    executor: input.context.tx,
  });
  await notificationPort.requestForSourceRecipients({
    prId: request.id,
    readyCycleId,
    activeRecipientCandidateUserIds: activeRecipients.map((recipient) => recipient.userId),
  });

  return { outcome: "TRANSITIONED", request: updated, readyCycleId };
};

/**
 * PR's narrow atomic bridge for manual and join-lock READY entry. Notification
 * gets semantic facts only; it owns source eligibility and private Job policy.
 */
export const createPRReadyTransitionTransactionPort = (
  dependencies: {
    createNotificationPort?: CreatePRReadyNotificationPort;
  } = {},
): PRReadyTransitionTransactionPort => {
  const createNotificationPort =
    dependencies.createNotificationPort ?? createTransactionBoundPRReadyNotificationPort;

  return {
    async transitionManual(input): Promise<PRReadyTransitionResult> {
      return runPRReadyTransitionTransaction({
        prId: input.prId,
        execute: async (context) => {
          const request = context.request;
          if (!request) return { outcome: "PR_MISSING" };
          if (request.status === "READY") {
            return { outcome: "ALREADY_READY", request };
          }

          const transitioned = await transitionLockedRequest({ context, createNotificationPort });
          if (!transitioned) return { outcome: "PR_MISSING" };
          return transitioned;
        },
      });
    },

    async transitionIfJoinLocked(input): Promise<PRReadyTransitionResult> {
      return runPRReadyTransitionTransaction({
        prId: input.prId,
        execute: async (context) => {
          const request = context.request;
          if (!request) return { outcome: "PR_MISSING" };
          if (request.status === "READY") {
            return { outcome: "ALREADY_READY", request };
          }
          if (request.status !== "OPEN" || !hasParticipationPolicy(request)) {
            return { outcome: "NOT_JOIN_LOCKED", request };
          }

          const policy = resolveParticipationPolicy(request, request.time);
          if (!isJoinLockedByPolicy(policy)) {
            return { outcome: "NOT_JOIN_LOCKED", request };
          }

          const transitioned = await transitionLockedRequest({ context, createNotificationPort });
          if (!transitioned) return { outcome: "PR_MISSING" };
          return transitioned;
        },
      });
    },
  };
};
