import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  prJoinNoticeAcceptances,
  type PRId,
  type UserId,
  type PRJoinNoticeAcceptance,
} from "../entities";
import type { RepositoryExecutor } from "./_executor";

export class PRJoinNoticeAcceptanceRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async find(input: {
    prId: PRId;
    userId: UserId;
    gateKey: string;
    gateVersion: string;
  }): Promise<PRJoinNoticeAcceptance | null> {
    const result = await this.executor
      .select()
      .from(prJoinNoticeAcceptances)
      .where(
        and(
          eq(prJoinNoticeAcceptances.prId, input.prId),
          eq(prJoinNoticeAcceptances.userId, input.userId),
          eq(prJoinNoticeAcceptances.gateKey, input.gateKey),
          eq(prJoinNoticeAcceptances.gateVersion, input.gateVersion),
        ),
      );
    return result[0] ?? null;
  }

  async upsert(input: {
    prId: PRId;
    userId: UserId;
    gateKey: string;
    gateVersion: string;
  }): Promise<PRJoinNoticeAcceptance | null> {
    const acceptedAt = new Date();
    const result = await this.executor
      .insert(prJoinNoticeAcceptances)
      .values({
        prId: input.prId,
        userId: input.userId,
        gateKey: input.gateKey,
        gateVersion: input.gateVersion,
        acceptedAt,
      })
      .onConflictDoUpdate({
        target: [
          prJoinNoticeAcceptances.prId,
          prJoinNoticeAcceptances.userId,
          prJoinNoticeAcceptances.gateKey,
          prJoinNoticeAcceptances.gateVersion,
        ],
        set: {
          acceptedAt,
        },
      })
      .returning();
    return result[0] ?? null;
  }

  async deleteByPrIdAndUserId(input: { prId: PRId; userId: UserId }): Promise<void> {
    await this.executor
      .delete(prJoinNoticeAcceptances)
      .where(
        and(
          eq(prJoinNoticeAcceptances.prId, input.prId),
          eq(prJoinNoticeAcceptances.userId, input.userId),
        ),
      );
  }
}
