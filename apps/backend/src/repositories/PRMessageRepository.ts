import { and, asc, desc, eq, gt, gte, isNull, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  prMessages,
  type NewPRMessage,
  type PRMessage,
  type PRMessageId,
} from "../entities/pr-message";
import type { PRId } from "../entities/partner-request";
import { resolvePrimaryUserRole, type UserId, type UserRole } from "../entities/user";
import { users } from "../entities/user";
import type { RepositoryExecutor } from "./_executor";

export type PRMessageWithAuthor = {
  id: PRMessageId;
  prId: PRId;
  authorUserId: UserId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  authorRole: UserRole | null;
  authorNickname: string | null;
  authorAvatar: string | null;
};

export class PRMessageRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async findById(id: PRMessageId): Promise<PRMessage | null> {
    const result = await this.executor
      .select()
      .from(prMessages)
      .where(and(eq(prMessages.id, id), isNull(prMessages.deletedAt)));
    return result[0] ?? null;
  }

  async findByPrIdAndId(prId: PRId, id: PRMessageId): Promise<PRMessage | null> {
    const result = await this.executor
      .select()
      .from(prMessages)
      .where(and(eq(prMessages.prId, prId), eq(prMessages.id, id), isNull(prMessages.deletedAt)));
    return result[0] ?? null;
  }

  /**
   * Cursor validation needs durable PR-local identity even after an ordinary
   * thread read hides the message. Callers must name this compatibility-aware
   * operation rather than accidentally treating visible lookup as a cursor.
   */
  async findByPrIdAndIdIncludingTombstone(prId: PRId, id: PRMessageId): Promise<PRMessage | null> {
    const result = await this.executor
      .select()
      .from(prMessages)
      .where(and(eq(prMessages.prId, prId), eq(prMessages.id, id)));
    return result[0] ?? null;
  }

  async findWithAuthorById(id: PRMessageId): Promise<PRMessageWithAuthor | null> {
    const rows = await this.executor
      .select({
        id: prMessages.id,
        prId: prMessages.prId,
        authorUserId: prMessages.authorUserId,
        body: prMessages.body,
        createdAt: prMessages.createdAt,
        updatedAt: prMessages.updatedAt,
        authorRole: users.role,
        authorNickname: users.nickname,
        authorAvatar: users.avatar,
      })
      .from(prMessages)
      .leftJoin(users, eq(users.id, prMessages.authorUserId))
      .where(and(eq(prMessages.id, id), isNull(prMessages.deletedAt)));

    const row = rows[0] ?? null;
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      prId: row.prId,
      authorUserId: row.authorUserId,
      body: row.body,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      authorRole: row.authorRole ? resolvePrimaryUserRole(row.authorRole) : null,
      authorNickname: row.authorNickname,
      authorAvatar: row.authorAvatar,
    };
  }

  async listByPrId(prId: PRId): Promise<PRMessageWithAuthor[]> {
    const rows = await this.executor
      .select({
        id: prMessages.id,
        prId: prMessages.prId,
        authorUserId: prMessages.authorUserId,
        body: prMessages.body,
        createdAt: prMessages.createdAt,
        updatedAt: prMessages.updatedAt,
        authorRole: users.role,
        authorNickname: users.nickname,
        authorAvatar: users.avatar,
      })
      .from(prMessages)
      .leftJoin(users, eq(users.id, prMessages.authorUserId))
      .where(and(eq(prMessages.prId, prId), isNull(prMessages.deletedAt)))
      .orderBy(asc(prMessages.createdAt), asc(prMessages.id));

    return rows.map((row) => ({
      id: row.id,
      prId: row.prId,
      authorUserId: row.authorUserId,
      body: row.body,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      authorRole: row.authorRole ? resolvePrimaryUserRole(row.authorRole) : null,
      authorNickname: row.authorNickname,
      authorAvatar: row.authorAvatar,
    }));
  }

  async findLatestWithAuthorAfterId(
    prId: PRId,
    afterMessageId: PRMessageId | null,
  ): Promise<PRMessageWithAuthor | null> {
    const predicate =
      afterMessageId === null
        ? and(eq(prMessages.prId, prId), isNull(prMessages.deletedAt))
        : and(
            eq(prMessages.prId, prId),
            gt(prMessages.id, afterMessageId),
            isNull(prMessages.deletedAt),
          );

    const rows = await this.executor
      .select({
        id: prMessages.id,
        prId: prMessages.prId,
        authorUserId: prMessages.authorUserId,
        body: prMessages.body,
        createdAt: prMessages.createdAt,
        updatedAt: prMessages.updatedAt,
        authorRole: users.role,
        authorNickname: users.nickname,
        authorAvatar: users.avatar,
      })
      .from(prMessages)
      .leftJoin(users, eq(users.id, prMessages.authorUserId))
      .where(predicate)
      .orderBy(desc(prMessages.id))
      .limit(1);

    const row = rows[0] ?? null;
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      prId: row.prId,
      authorUserId: row.authorUserId,
      body: row.body,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      authorRole: row.authorRole ? resolvePrimaryUserRole(row.authorRole) : null,
      authorNickname: row.authorNickname,
      authorAvatar: row.authorAvatar,
    };
  }

  /**
   * Windowed Notification begins at the first message in the reserved window,
   * unlike the legacy inbox query which deliberately starts strictly after a
   * per-user read marker.
   */
  async findLatestWithAuthorAtOrAfterId(
    prId: PRId,
    windowStartMessageId: PRMessageId,
  ): Promise<PRMessageWithAuthor | null> {
    const rows = await this.executor
      .select({
        id: prMessages.id,
        prId: prMessages.prId,
        authorUserId: prMessages.authorUserId,
        body: prMessages.body,
        createdAt: prMessages.createdAt,
        updatedAt: prMessages.updatedAt,
        authorRole: users.role,
        authorNickname: users.nickname,
        authorAvatar: users.avatar,
      })
      .from(prMessages)
      .leftJoin(users, eq(users.id, prMessages.authorUserId))
      .where(
        and(
          eq(prMessages.prId, prId),
          gte(prMessages.id, windowStartMessageId),
          isNull(prMessages.deletedAt),
        ),
      )
      .orderBy(desc(prMessages.id))
      .limit(1);

    const row = rows[0] ?? null;
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      prId: row.prId,
      authorUserId: row.authorUserId,
      body: row.body,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      authorRole: row.authorRole ? resolvePrimaryUserRole(row.authorRole) : null,
      authorNickname: row.authorNickname,
      authorAvatar: row.authorAvatar,
    };
  }

  async countByPrIdAfterId(prId: PRId, afterMessageId: PRMessageId | null): Promise<number> {
    const predicate =
      afterMessageId === null
        ? and(eq(prMessages.prId, prId), isNull(prMessages.deletedAt))
        : and(
            eq(prMessages.prId, prId),
            gt(prMessages.id, afterMessageId),
            isNull(prMessages.deletedAt),
          );

    const result = await this.executor
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(prMessages)
      .where(predicate);

    return result[0]?.count ?? 0;
  }

  async countByPrIdAtOrAfterId(prId: PRId, windowStartMessageId: PRMessageId): Promise<number> {
    const result = await this.executor
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(prMessages)
      .where(
        and(
          eq(prMessages.prId, prId),
          gte(prMessages.id, windowStartMessageId),
          isNull(prMessages.deletedAt),
        ),
      );

    return result[0]?.count ?? 0;
  }

  async create(data: NewPRMessage): Promise<PRMessage | null> {
    const result = await this.executor.insert(prMessages).values(data).returning();
    return result[0] ?? null;
  }

  async updateBody(id: PRMessageId, body: string): Promise<PRMessage | null> {
    const result = await this.executor
      .update(prMessages)
      .set({
        body,
        updatedAt: new Date(),
      })
      .where(and(eq(prMessages.id, id), isNull(prMessages.deletedAt)))
      .returning();
    return result[0] ?? null;
  }

  /**
   * Persistence-only primitive for the later named delete-plus-window-release
   * transaction. It deliberately does not start a transaction or invalidate a
   * Notification reservation by itself.
   */
  async tombstoneById(id: PRMessageId): Promise<PRMessage | null> {
    const now = new Date();
    const result = await this.executor
      .update(prMessages)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(and(eq(prMessages.id, id), isNull(prMessages.deletedAt)))
      .returning();
    return result[0] ?? null;
  }

  async deleteById(id: PRMessageId): Promise<PRMessage | null> {
    const result = await this.executor.delete(prMessages).where(eq(prMessages.id, id)).returning();
    return result[0] ?? null;
  }

  async findLatestIdByPrId(prId: PRId): Promise<PRMessageId | null> {
    const rows = await this.executor
      .select({
        id: prMessages.id,
      })
      .from(prMessages)
      .where(and(eq(prMessages.prId, prId), isNull(prMessages.deletedAt)))
      .orderBy(desc(prMessages.id))
      .limit(1);
    return rows[0]?.id ?? null;
  }

  /**
   * The acknowledgement cursor intentionally spans visible and tombstoned
   * messages. This is distinct from `findLatestIdByPrId`, which is a visible
   * thread projection.
   */
  async findLatestAcknowledgementCursorByPrId(prId: PRId): Promise<PRMessageId | null> {
    const rows = await this.executor
      .select({
        id: prMessages.id,
      })
      .from(prMessages)
      .where(eq(prMessages.prId, prId))
      .orderBy(desc(prMessages.id))
      .limit(1);
    return rows[0]?.id ?? null;
  }

  async countByAuthorSince(
    prId: PRId,
    authorUserId: UserId,
    createdAtOrAfter: Date,
  ): Promise<number> {
    const result = await this.executor
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(prMessages)
      .where(
        and(
          eq(prMessages.prId, prId),
          eq(prMessages.authorUserId, authorUserId),
          gte(prMessages.createdAt, createdAtOrAfter),
        ),
      );

    return result[0]?.count ?? 0;
  }
}
