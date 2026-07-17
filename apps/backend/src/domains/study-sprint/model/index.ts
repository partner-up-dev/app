import { z } from "zod";

export const STUDY_SPRINT_PR_TYPE = "STUDY_SPRINT";
export const STUDY_SPRINT_DEFAULT_DURATION_MINUTES = 30;

export const studySprintRoomStatusSchema = z.enum(["OPEN", "CLOSED"]);
export type StudySprintRoomStatus = z.infer<typeof studySprintRoomStatusSchema>;

export const studySprintSessionStatusSchema = z.enum(["FOCUSING", "COMPLETED", "LEFT"]);
export type StudySprintSessionStatus = z.infer<typeof studySprintSessionStatusSchema>;

export const studySprintSessionEventTypeSchema = z.enum([
  "STARTED",
  "HEARTBEAT",
  "COMPLETED",
  "LEFT",
]);
export type StudySprintSessionEventType = z.infer<typeof studySprintSessionEventTypeSchema>;

export const studySprintSessionEventPayloadSchema = z
  .object({
    creditedFocusSeconds: z.number().int().nonnegative().optional(),
    interruptionSeconds: z.number().int().nonnegative().optional(),
    note: z.string().trim().max(240).optional(),
  })
  .strict();
export type StudySprintSessionEventPayload = z.infer<typeof studySprintSessionEventPayloadSchema>;

export type StudySprintParticipantSnapshot = {
  partnerId: number;
  userId: string;
  nickname: string | null;
  avatar: string | null;
  sessionId: string | null;
  status: StudySprintSessionStatus | "NOT_STARTED";
  targetDurationMinutes: number;
  creditedFocusSeconds: number;
  interruptionSeconds: number;
  lastSeenAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  leftAt: string | null;
  isViewer: boolean;
};

export type StudySprintRoomSnapshot = {
  prId: number;
  prTitle: string | null;
  targetDurationMinutes: number;
  viewerSessionId: string | null;
  participants: StudySprintParticipantSnapshot[];
};
