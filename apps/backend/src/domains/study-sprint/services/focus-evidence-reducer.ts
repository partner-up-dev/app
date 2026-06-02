import type { StudySprintParticipantSession } from "../../../entities/study-sprint";
import type {
  StudySprintSessionEventPayload,
  StudySprintSessionEventType,
  StudySprintSessionStatus,
} from "../model";

export type FocusEvidenceReductionInput = {
  session: StudySprintParticipantSession;
  eventType: StudySprintSessionEventType;
  occurredAt: Date;
  payload: StudySprintSessionEventPayload;
};

export type FocusEvidenceReductionResult = {
  status: StudySprintSessionStatus;
  creditedFocusSeconds: number;
  interruptionSeconds: number;
  lastSeenAt: Date;
  completedAt: Date | null;
  leftAt: Date | null;
};

const clampNonnegative = (value: number | undefined): number | null => {
  if (value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
};

export const reduceFocusEvidence = (
  input: FocusEvidenceReductionInput,
): FocusEvidenceReductionResult => {
  const targetSeconds = input.session.targetDurationMinutes * 60;
  const nextCredited = clampNonnegative(input.payload.creditedFocusSeconds);
  const nextInterruption = clampNonnegative(input.payload.interruptionSeconds);
  const creditedFocusSeconds = Math.min(
    targetSeconds,
    Math.max(input.session.creditedFocusSeconds, nextCredited ?? 0),
  );
  const interruptionSeconds = Math.max(
    input.session.interruptionSeconds,
    nextInterruption ?? 0,
  );
  const completedByDuration = creditedFocusSeconds >= targetSeconds;

  if (input.eventType === "LEFT") {
    return {
      status: "LEFT",
      creditedFocusSeconds,
      interruptionSeconds,
      lastSeenAt: input.occurredAt,
      completedAt: input.session.completedAt,
      leftAt: input.occurredAt,
    };
  }

  if (input.eventType === "COMPLETED" || completedByDuration) {
    return {
      status: "COMPLETED",
      creditedFocusSeconds: targetSeconds,
      interruptionSeconds,
      lastSeenAt: input.occurredAt,
      completedAt: input.session.completedAt ?? input.occurredAt,
      leftAt: input.session.leftAt,
    };
  }

  return {
    status: "FOCUSING",
    creditedFocusSeconds,
    interruptionSeconds,
    lastSeenAt: input.occurredAt,
    completedAt: null,
    leftAt: null,
  };
};
