import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  studySprintRooms,
  type NewStudySprintRoom,
  type StudySprintRoom,
  type StudySprintRoomId,
} from "../entities/study-sprint";
import type { PRId } from "../entities/partner-request";
import type { RepositoryExecutor } from "./_executor";

export class StudySprintRoomRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewStudySprintRoom): Promise<StudySprintRoom> {
    const result = await this.executor
      .insert(studySprintRooms)
      .values(data)
      .returning();
    return result[0]!;
  }

  async findById(id: StudySprintRoomId): Promise<StudySprintRoom | null> {
    const result = await this.executor
      .select()
      .from(studySprintRooms)
      .where(eq(studySprintRooms.id, id));
    return result[0] ?? null;
  }

  async findByPrId(prId: PRId): Promise<StudySprintRoom | null> {
    const result = await this.executor
      .select()
      .from(studySprintRooms)
      .where(eq(studySprintRooms.prId, prId));
    return result[0] ?? null;
  }

  async findOrCreateByPrId(prId: PRId): Promise<StudySprintRoom> {
    const existing = await this.findByPrId(prId);
    if (existing) return existing;

    const created = await this.executor
      .insert(studySprintRooms)
      .values({ prId })
      .onConflictDoNothing({
        target: studySprintRooms.prId,
      })
      .returning();
    return created[0] ?? (await this.findByPrId(prId))!;
  }
}
