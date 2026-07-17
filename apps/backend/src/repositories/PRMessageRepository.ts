import { and, asc, desc, eq, gt, gte, sql } from "drizzle-orm";
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
  async findById(id: PRMessageId): Promise<PRMessage | null> {
    const result = await db.select().from(prMessages).where(eq(prMessages.id, id));
    return result[0] ?? null;
  }

  async findByPrIdAndId(prId: PRId, id: PRMessageId): Promise<PRMessage | null> {
    const result = await db
      .select()
      .from(prMessages)
      .where(and(eq(prMessages.prId, prId), eq(prMessages.id, id)));
    return result[0] ?? null;
  }

  async findWithAuthorById(id: PRMessageId): Promise<PRMessageWithAuthor | null> {
    const rows = await db
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
      .where(eq(prMessages.id, id));

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
    const rows = await db
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
      .where(eq(prMessages.prId, prId))
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
        ? eq(prMessages.prId, prId)
        : and(eq(prMessages.prId, prId), gt(prMessages.id, afterMessageId));

    const rows = await db
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

  async countByPrIdAfterId(prId: PRId, afterMessageId: PRMessageId | null): Promise<number> {
    const predicate =
      afterMessageId === null
        ? eq(prMessages.prId, prId)
        : and(eq(prMessages.prId, prId), gt(prMessages.id, afterMessageId));

    const result = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(prMessages)
      .where(predicate);

    return result[0]?.count ?? 0;
  }

  async create(data: NewPRMessage): Promise<PRMessage | null> {
    const result = await db.insert(prMessages).values(data).returning();
    return result[0] ?? null;
  }

  async updateBody(id: PRMessageId, body: string): Promise<PRMessage | null> {
    const result = await db
      .update(prMessages)
      .set({
        body,
        updatedAt: new Date(),
      })
      .where(eq(prMessages.id, id))
      .returning();
    return result[0] ?? null;
  }

  async deleteById(id: PRMessageId): Promise<PRMessage | null> {
    const result = await db.delete(prMessages).where(eq(prMessages.id, id)).returning();
    return result[0] ?? null;
  }

  async findLatestIdByPrId(prId: PRId): Promise<PRMessageId | null> {
    const rows = await db
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
    const result = await db
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
