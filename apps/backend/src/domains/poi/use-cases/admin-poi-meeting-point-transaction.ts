import { randomUUID } from "node:crypto";
import type { MeetingPointConfig } from "../../../entities/meeting-point";
import type { Poi, PoiAvailabilityRule, PoiCoordinate } from "../../../entities/poi";
import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PoiRepository } from "../../../repositories/PoiRepository";
import type { TransactionExecutor } from "../../../repositories/_executor";
import { createTransactionBoundMeetingPointUpdatedNotificationPort } from "../../notification";
import {
  captureEffectiveMeetingPointsForRequests,
  collectMeetingPointNotificationChanges,
  createTransactionBoundEffectiveMeetingPointResolver,
} from "../../pr/ports";

const MAX_SERIALIZATION_ATTEMPTS = 8;

const serializationRetryDelay = (attempt: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.min(40, 5 * (attempt + 1)));
  });

const isSerializationFailure = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === "40001";

export type AdminPoiUpdateInput = {
  name: string;
  fullAddress: string | null;
  gallery: string[];
  gcj02: PoiCoordinate | null;
  wgs84: PoiCoordinate | null;
  bd09: PoiCoordinate | null;
  perTimeWindowCap: number | null;
  availabilityRules?: PoiAvailabilityRule[];
  meetingPoint?: MeetingPointConfig | null;
};

export type AdminPoiMeetingPointTransactionPort = {
  update(input: { poiId: number; input: AdminPoiUpdateInput }): Promise<Poi>;
};

type AdminPoiTransactionContext = {
  tx: TransactionExecutor;
  poiRepo: PoiRepository;
  requestRepo: PartnerRequestRepository;
  partnerRepo: PartnerRepository;
};

type CreateMeetingPointUpdatedNotificationPort = (
  input: Parameters<typeof createTransactionBoundMeetingPointUpdatedNotificationPort>[0],
) => ReturnType<typeof createTransactionBoundMeetingPointUpdatedNotificationPort>;

/**
 * A POI-specific transaction protocol. It protects one POI's name/point
 * mutation and the PRs whose current text location can resolve through it;
 * it is not a generic cross-domain callback.
 */
const runAdminPoiTransaction = async <Result>(input: {
  execute: (context: AdminPoiTransactionContext) => Promise<Result>;
}): Promise<Result> => {
  let lastSerializationFailure: unknown = null;
  for (let attempt = 0; attempt < MAX_SERIALIZATION_ATTEMPTS; attempt += 1) {
    try {
      return await db.transaction(
        async (tx) =>
          input.execute({
            tx,
            poiRepo: new PoiRepository(tx),
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
 * Atomic source bridge for the admin POI update route. POI owns its row lock,
 * old/new location impact set and immutable operation facts; Notification owns
 * recipient policy and generic Job mechanics.
 */
export const createAdminPoiMeetingPointTransactionPort = (
  dependencies: {
    createNotificationPort?: CreateMeetingPointUpdatedNotificationPort;
  } = {},
): AdminPoiMeetingPointTransactionPort => {
  const createNotificationPort =
    dependencies.createNotificationPort ??
    createTransactionBoundMeetingPointUpdatedNotificationPort;

  return {
    async update(input): Promise<Poi> {
      const nextName = input.input.name.trim();
      return runAdminPoiTransaction({
        execute: async (context) => {
          const existing = await context.poiRepo.findByIdForUpdate(input.poiId);
          if (!existing) {
            return throwHttpProblem({ status: 404, detail: "POI not found" });
          }

          const lockedRequests = await context.requestRepo.findByLocationsForUpdate([
            existing.name,
            nextName,
          ]);
          const resolveEffectiveMeetingPoint = createTransactionBoundEffectiveMeetingPointResolver(
            context.tx,
          );
          const previous = await captureEffectiveMeetingPointsForRequests(
            lockedRequests,
            resolveEffectiveMeetingPoint,
          );

          // Preserve the pre-existing admin route's special fallback contract:
          // omitted availability rules and omitted/null meeting point retain
          // the locked value; the other normalized fields still clear to null.
          const poi = await context.poiRepo.updateById(input.poiId, {
            name: nextName,
            fullAddress: input.input.fullAddress ?? null,
            gallery: input.input.gallery,
            gcj02: input.input.gcj02 ?? null,
            wgs84: input.input.wgs84 ?? null,
            bd09: input.input.bd09 ?? null,
            perTimeWindowCap: input.input.perTimeWindowCap ?? null,
            availabilityRules: input.input.availabilityRules ?? existing.availabilityRules,
            meetingPoint: input.input.meetingPoint ?? existing.meetingPoint ?? null,
          });
          if (!poi) {
            throw new Error("ADMIN_POI_WRITE_FAILED");
          }

          const changes = await collectMeetingPointNotificationChanges({
            previous,
            requests: lockedRequests,
            resolve: resolveEffectiveMeetingPoint,
          });
          if (changes.length === 0) {
            return poi;
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
              correlationId: `meeting-point:poi:${meetingPointUpdateId}`,
              activeRecipientCandidateUserIds: activeRecipients.map(
                (recipient) => recipient.userId,
              ),
            });
          }

          return poi;
        },
      });
    },
  };
};
