import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import {
  studySprintParticipantSessions,
  type NewStudySprintParticipantSession,
  type StudySprintParticipantSession,
  type StudySprintRoomId,
  type StudySprintSessionId,
} from "../entities/study-sprint";
import type { PRId } from "../entities/partner-request";
import type { UserId } from "../entities/user";
import type { StudySprintSessionStatus } from "../domains/study-sprint/model";
import type { RepositoryExecutor } from "./_executor";

export class StudySprintParticipantSessionRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(
    data: NewStudySprintParticipantSession,
  ): Promise<StudySprintParticipantSession> {
    const result = await this.executor
      .insert(studySprintParticipantSessions)
      .values(data)
      .returning();
    return result[0]!;
  }

  async findById(
    id: StudySprintSessionId,
  ): Promise<StudySprintParticipantSession | null> {
    const result = await this.executor
      .select()
      .from(studySprintParticipantSessions)
      .where(eq(studySprintParticipantSessions.id, id));
    return result[0] ?? null;
  }

  async findByRoomAndUser(input: {
    roomId: StudySprintRoomId;
    userId: UserId;
  }): Promise<StudySprintParticipantSession | null> {
    const result = await this.executor
      .select()
      .from(studySprintParticipantSessions)
      .where(
        and(
          eq(studySprintParticipantSessions.roomId, input.roomId),
          eq(studySprintParticipantSessions.userId, input.userId),
        ),
      );
    return result[0] ?? null;
  }

  async listByRoomId(
    roomId: StudySprintRoomId,
  ): Promise<StudySprintParticipantSession[]> {
    return this.executor
      .select()
      .from(studySprintParticipantSessions)
      .where(eq(studySprintParticipantSessions.roomId, roomId))
      .orderBy(asc(studySprintParticipantSessions.startedAt));
  }

  async listByPrIdAndUserIds(input: {
    prId: PRId;
    userIds: UserId[];
  }): Promise<StudySprintParticipantSession[]> {
    if (input.userIds.length === 0) return [];
    return this.executor
      .select()
      .from(studySprintParticipantSessions)
      .where(
        and(
          eq(studySprintParticipantSessions.prId, input.prId),
          inArray(studySprintParticipantSessions.userId, input.userIds),
        ),
      )
      .orderBy(asc(studySprintParticipantSessions.startedAt));
  }

  async updateAggregate(input: {
    id: StudySprintSessionId;
    status: StudySprintSessionStatus;
    creditedFocusSeconds: number;
    interruptionSeconds: number;
    lastSeenAt: Date;
    completedAt?: Date | null;
    leftAt?: Date | null;
  }): Promise<StudySprintParticipantSession | null> {
    const result = await this.executor
      .update(studySprintParticipantSessions)
      .set({
        status: input.status,
        creditedFocusSeconds: input.creditedFocusSeconds,
        interruptionSeconds: input.interruptionSeconds,
        lastSeenAt: input.lastSeenAt,
        completedAt: input.completedAt ?? null,
        leftAt: input.leftAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(studySprintParticipantSessions.id, input.id))
      .returning();
    return result[0] ?? null;
  }
}
