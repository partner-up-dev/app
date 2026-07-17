import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { userReliability, type UserReliability } from "../entities/user-reliability";
import type { UserId } from "../entities/user";

export class UserReliabilityRepository {
  async findByUserId(userId: UserId): Promise<UserReliability | null> {
    const result = await db
      .select()
      .from(userReliability)
      .where(eq(userReliability.userId, userId));
    return result[0] ?? null;
  }

  async ensureExists(userId: UserId): Promise<void> {
    await db
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
    const current = await this.findByUserId(userId);
    if (!current) return;

    const nextJoinCount = Math.max(0, current.reliabilityJoinCount + (delta.joined ?? 0));
    const nextConfirmCount = Math.max(0, current.reliabilityConfirmCount + (delta.confirmed ?? 0));
    const nextAttendCount = Math.max(0, current.reliabilityAttendCount + (delta.attended ?? 0));
    const nextReleaseCount = Math.max(0, current.reliabilityReleaseCount + (delta.released ?? 0));

    const nextJoinToConfirmRatio = nextJoinCount > 0 ? nextConfirmCount / nextJoinCount : 0;
    const nextConfirmToAttendRatio = nextConfirmCount > 0 ? nextAttendCount / nextConfirmCount : 0;
    const nextReleaseFrequency = nextJoinCount > 0 ? nextReleaseCount / nextJoinCount : 0;

    await db
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
