import { throwHttpProblem } from "../../../lib/problem-details";
import type { UserId } from "../../../entities/user";
import type { StudySprintSessionId } from "../../../entities/study-sprint";
import { StudySprintParticipantSessionRepository } from "../../../repositories/StudySprintParticipantSessionRepository";
import { StudySprintSessionEventRepository } from "../../../repositories/StudySprintSessionEventRepository";
import type {
  StudySprintSessionEventPayload,
  StudySprintSessionEventType,
} from "../model";
import { requireStudySprintActiveParticipant } from "../services/eligibility";
import { reduceFocusEvidence } from "../services/focus-evidence-reducer";
import { getStudySprintRoomSnapshot } from "./snapshot";

const sessionRepo = new StudySprintParticipantSessionRepository();
const eventRepo = new StudySprintSessionEventRepository();

export const recordStudySprintSessionEvent = async (input: {
  sessionId: StudySprintSessionId;
  userId: UserId;
  eventType: StudySprintSessionEventType;
  occurredAt: Date;
  clientSeq: number;
  payload: StudySprintSessionEventPayload;
}) => {
  const session = await sessionRepo.findById(input.sessionId);
  if (!session) {
    return throwHttpProblem({
      status: 404,
      detail: "Study sprint session not found",
    });
  }

  if (session.userId !== input.userId) {
    return throwHttpProblem({
      status: 403,
      detail: "Cannot update another participant's study sprint session",
    });
  }

  await requireStudySprintActiveParticipant({
    prId: session.prId,
    userId: input.userId,
  });

  await eventRepo.create({
    sessionId: input.sessionId,
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    clientSeq: input.clientSeq,
    payload: input.payload,
  });

  const reduced = reduceFocusEvidence({
    session,
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    payload: input.payload,
  });
  await sessionRepo.updateAggregate({
    id: input.sessionId,
    ...reduced,
  });

  return getStudySprintRoomSnapshot({
    prId: session.prId,
    userId: input.userId,
  });
};
