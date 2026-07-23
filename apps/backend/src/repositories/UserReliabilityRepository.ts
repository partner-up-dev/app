import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { userReliability, type UserReliability } from "../entities/user-reliability";
import type { UserId } from "../entities/user";
import type { RepositoryExecutor } from "./_executor";

export class UserReliabilityRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async findByUserId(userId: UserId): Promise<UserReliability | null> {
    const result = await this.executor
      .select()
      .from(userReliability)
      .where(eq(userReliability.userId, userId));
    return result[0] ?? null;
  }

  async ensureExists(userId: UserId): Promise<void> {
    await this.executor
      .insert(userReliability)
      .values({ userId })
      .onConflictDoNothing({ target: userReliability.userId });
  }

  async applyDelta(
    userId: UserId,
    delta: {
      joined?: number;
      confirmed?: number;
      attended?: number;
      released?: number;
    },
  ): Promise<void> {
    await this.ensureExists(userId);

    // Keep each ratio based on the exact same post-delta expressions as its
    // corresponding counters. PostgreSQL evaluates this as one row-level
    // update, so concurrent deltas cannot overwrite one another via a stale
    // read-compute-write cycle.
    const nextJoinCount = sql<number>`GREATEST(0, ${userReliability.reliabilityJoinCount} + ${
      delta.joined ?? 0
    })`;
    const nextConfirmCount = sql<number>`GREATEST(0, ${
      userReliability.reliabilityConfirmCount
    } + ${delta.confirmed ?? 0})`;
    const nextAttendCount = sql<number>`GREATEST(0, ${
      userReliability.reliabilityAttendCount
    } + ${delta.attended ?? 0})`;
    const nextReleaseCount = sql<number>`GREATEST(0, ${
      userReliability.reliabilityReleaseCount
    } + ${delta.released ?? 0})`;

    const nextJoinToConfirmRatio = sql<number>`CASE WHEN ${nextJoinCount} > 0 THEN ${nextConfirmCount}::double precision / ${nextJoinCount} ELSE 0 END`;
    const nextConfirmToAttendRatio = sql<number>`CASE WHEN ${nextConfirmCount} > 0 THEN ${nextAttendCount}::double precision / ${nextConfirmCount} ELSE 0 END`;
    const nextReleaseFrequency = sql<number>`CASE WHEN ${nextJoinCount} > 0 THEN ${nextReleaseCount}::double precision / ${nextJoinCount} ELSE 0 END`;

    await this.executor
      .update(userReliability)
      .set({
        reliabilityJoinCount: nextJoinCount,
        reliabilityConfirmCount: nextConfirmCount,
        reliabilityAttendCount: nextAttendCount,
        reliabilityReleaseCount: nextReleaseCount,
        joinToConfirmRatio: nextJoinToConfirmRatio,
        confirmToAttendRatio: nextConfirmToAttendRatio,
        releaseFrequency: nextReleaseFrequency,
        updatedAt: new Date(),
      })
      .where(eq(userReliability.userId, userId));
  }
}
