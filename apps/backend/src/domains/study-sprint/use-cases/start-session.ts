import { db } from "../../../lib/db";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { StudySprintRoomRepository } from "../../../repositories/StudySprintRoomRepository";
import { StudySprintParticipantSessionRepository } from "../../../repositories/StudySprintParticipantSessionRepository";
import { StudySprintSessionEventRepository } from "../../../repositories/StudySprintSessionEventRepository";
import { deriveStudySprintDurationMinutes } from "../services/duration";
import { requireStudySprintActiveParticipant } from "../services/eligibility";
import { getStudySprintRoomSnapshot } from "./snapshot";

export const startStudySprintSession = async (input: {
  prId: PRId;
  userId: UserId;
  clientSeq: number;
  occurredAt: Date;
}) => {
  const { pr, partner } = await requireStudySprintActiveParticipant(input);
  const targetDurationMinutes = deriveStudySprintDurationMinutes(pr);

  await db.transaction(async (tx) => {
    const roomRepo = new StudySprintRoomRepository(tx);
    const sessionRepo = new StudySprintParticipantSessionRepository(tx);
    const eventRepo = new StudySprintSessionEventRepository(tx);
    const room = await roomRepo.findOrCreateByPrId(input.prId);
    const existing = await sessionRepo.findByRoomAndUser({
      roomId: room.id,
      userId: input.userId,
    });
    const session =
      existing ??
      (await sessionRepo.create({
        roomId: room.id,
        prId: input.prId,
        userId: input.userId,
        partnerId: partner.id,
        targetDurationMinutes,
        startedAt: input.occurredAt,
        lastSeenAt: input.occurredAt,
      }));

    await eventRepo.create({
      sessionId: session.id,
      eventType: "STARTED",
      occurredAt: input.occurredAt,
      clientSeq: input.clientSeq,
      payload: {
        creditedFocusSeconds: session.creditedFocusSeconds,
        interruptionSeconds: session.interruptionSeconds,
      },
    });
  });

  return getStudySprintRoomSnapshot(input);
};
