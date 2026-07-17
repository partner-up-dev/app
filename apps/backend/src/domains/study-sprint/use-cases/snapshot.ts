import type { UserId } from "../../../entities/user";
import type { PRId } from "../../../entities/partner-request";
import { StudySprintRoomRepository } from "../../../repositories/StudySprintRoomRepository";
import { StudySprintParticipantSessionRepository } from "../../../repositories/StudySprintParticipantSessionRepository";
import { type StudySprintParticipantSnapshot, type StudySprintRoomSnapshot } from "../model";
import { deriveStudySprintDurationMinutes } from "../services/duration";
import {
  listStudySprintActiveParticipants,
  requireStudySprintActiveParticipant,
} from "../services/eligibility";

const roomRepo = new StudySprintRoomRepository();
const sessionRepo = new StudySprintParticipantSessionRepository();

const toIso = (value: Date | null): string | null => (value ? value.toISOString() : null);

export const getStudySprintRoomSnapshot = async (input: {
  prId: PRId;
  userId: UserId;
}): Promise<StudySprintRoomSnapshot> => {
  const { pr } = await requireStudySprintActiveParticipant(input);
  const targetDurationMinutes = deriveStudySprintDurationMinutes(pr);
  const participants = await listStudySprintActiveParticipants(input.prId);
  const room = await roomRepo.findByPrId(input.prId);
  const sessions = room ? await sessionRepo.listByRoomId(room.id) : [];
  const sessionByUserId = new Map(sessions.map((session) => [session.userId, session]));
  const viewerSession = sessionByUserId.get(input.userId) ?? null;

  const participantSnapshots: StudySprintParticipantSnapshot[] = participants.map((participant) => {
    const session = sessionByUserId.get(participant.userId) ?? null;
    return {
      partnerId: participant.partnerId,
      userId: participant.userId,
      nickname: participant.nickname,
      avatar: participant.avatar,
      sessionId: session?.id ?? null,
      status: session?.status ?? "NOT_STARTED",
      targetDurationMinutes: session?.targetDurationMinutes ?? targetDurationMinutes,
      creditedFocusSeconds: session?.creditedFocusSeconds ?? 0,
      interruptionSeconds: session?.interruptionSeconds ?? 0,
      lastSeenAt: toIso(session?.lastSeenAt ?? null),
      startedAt: toIso(session?.startedAt ?? null),
      completedAt: toIso(session?.completedAt ?? null),
      leftAt: toIso(session?.leftAt ?? null),
      isViewer: participant.userId === input.userId,
    };
  });

  return {
    prId: pr.id,
    prTitle: pr.title,
    targetDurationMinutes,
    viewerSessionId: viewerSession?.id ?? null,
    participants: participantSnapshots,
  };
};
