import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  studySprintSessionEvents,
  type NewStudySprintSessionEvent,
  type StudySprintSessionEvent,
  type StudySprintSessionId,
} from "../entities/study-sprint";
import type { RepositoryExecutor } from "./_executor";

export class StudySprintSessionEventRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewStudySprintSessionEvent): Promise<StudySprintSessionEvent> {
    const result = await this.executor
      .insert(studySprintSessionEvents)
      .values(data)
      .onConflictDoNothing({
        target: [studySprintSessionEvents.sessionId, studySprintSessionEvents.clientSeq],
      })
      .returning();

    if (result[0]) return result[0];

    const existing = await this.findBySessionAndClientSeq({
      sessionId: data.sessionId,
      clientSeq: data.clientSeq,
    });
    return existing!;
  }

  async findBySessionAndClientSeq(input: {
    sessionId: StudySprintSessionId;
    clientSeq: number;
  }): Promise<StudySprintSessionEvent | null> {
    const result = await this.executor
      .select()
      .from(studySprintSessionEvents)
      .where(
        and(
          eq(studySprintSessionEvents.sessionId, input.sessionId),
          eq(studySprintSessionEvents.clientSeq, input.clientSeq),
        ),
      );
    return result[0] ?? null;
  }
}
