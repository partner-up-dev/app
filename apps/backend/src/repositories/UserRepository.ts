import { and, eq, inArray, isNull } from "drizzle-orm";
import { type NewUser, type UserId, type UserSex, users } from "../entities/user";
import { userNotificationOpts } from "../entities/user-notification-opt";
import { userReliability } from "../entities/user-reliability";
import { db } from "../lib/db";
import type { RepositoryExecutor } from "./_executor";

const OFFICIAL_ACCOUNT_FOLLOW_UPDATE_CHUNK_SIZE = 500;

const uniqueNonEmptyStrings = (values: string[]): string[] => {
  const unique = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      unique.add(trimmed);
    }
  }
  return Array.from(unique);
};

export class UserRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewUser) {
    return db.transaction(async (tx) => {
      const result = await tx.insert(users).values(data).returning();
      const created = result[0] ?? null;
      if (!created) return null;

      await tx
        .insert(userReliability)
        .values({ userId: created.id })
        .onConflictDoNothing({ target: userReliability.userId });
      await tx
        .insert(userNotificationOpts)
        .values({ userId: created.id })
        .onConflictDoNothing({ target: userNotificationOpts.userId });

      return created;
    });
  }

  async findById(id: UserId) {
    const result = await this.executor.select().from(users).where(eq(users.id, id));
    return result[0] ?? null;
  }

  async findByIdForUpdate(id: UserId) {
    const result = await this.executor.select().from(users).where(eq(users.id, id)).for("update");
    return result[0] ?? null;
  }

  async findByIds(userIds: UserId[]) {
    const uniqueIds = Array.from(new Set(userIds));
    if (uniqueIds.length === 0) {
      return [];
    }

    return this.executor.select().from(users).where(inArray(users.id, uniqueIds));
  }

  async findByOpenId(openId: string) {
    const result = await this.executor.select().from(users).where(eq(users.openId, openId));
    return result[0] ?? null;
  }

  async createIfNotExists(data: NewUser) {
    return db.transaction(async (tx) => {
      const result = await tx
        .insert(users)
        .values(data)
        .onConflictDoNothing({ target: users.openId })
        .returning();
      const created = result[0] ?? null;
      if (!created) return null;

      await tx
        .insert(userReliability)
        .values({ userId: created.id })
        .onConflictDoNothing({ target: userReliability.userId });
      await tx
        .insert(userNotificationOpts)
        .values({ userId: created.id })
        .onConflictDoNothing({ target: userNotificationOpts.userId });

      return created;
    });
  }

  async updatePinHash(userId: UserId, pinHash: string) {
    const result = await db
      .update(users)
      .set({
        pinHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0] ?? null;
  }

  async updateNickname(userId: UserId, nickname: string | null) {
    const result = await db
      .update(users)
      .set({
        nickname,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0] ?? null;
  }

  async updateAvatar(userId: UserId, avatar: string | null) {
    const result = await db
      .update(users)
      .set({
        avatar,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0] ?? null;
  }

  async updatePhoneNumber(userId: UserId, phoneNumber: string | null) {
    const result = await db
      .update(users)
      .set({
        phoneNumber,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0] ?? null;
  }

  async updateWeChatProfileFieldsIfMissing(input: {
    userId: UserId;
    nickname: string | null;
    sex: UserSex | null;
    avatar: string | null;
  }) {
    const currentUser = await this.findById(input.userId);
    if (!currentUser) {
      return null;
    }

    const updateValues: {
      nickname?: string;
      sex?: UserSex;
      avatar?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };
    let hasChanges = false;

    if (!currentUser.nickname && input.nickname) {
      updateValues.nickname = input.nickname;
      hasChanges = true;
    }
    if (currentUser.sex === null && input.sex !== null) {
      updateValues.sex = input.sex;
      hasChanges = true;
    }
    if (!currentUser.avatar && input.avatar) {
      updateValues.avatar = input.avatar;
      hasChanges = true;
    }

    if (!hasChanges) {
      return currentUser;
    }

    const result = await db
      .update(users)
      .set(updateValues)
      .where(eq(users.id, input.userId))
      .returning();
    return result[0] ?? null;
  }

  async upgradeAnonymousUserWithWeChat(input: {
    userId: UserId;
    openId: string;
    nickname: string | null;
    sex: UserSex | null;
    avatar: string | null;
  }) {
    const result = await db
      .update(users)
      .set({
        openId: input.openId,
        nickname: input.nickname,
        sex: input.sex,
        avatar: input.avatar,
        role: ["authenticated"],
        updatedAt: new Date(),
      })
      .where(eq(users.id, input.userId))
      .returning();
    return result[0] ?? null;
  }

  async bindOpenId(userId: UserId, openId: string) {
    const result = await db
      .update(users)
      .set({
        openId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0] ?? null;
  }

  async markOfficialAccountFollowersByOpenIds(
    openIds: string[],
    followedAt = new Date(),
  ): Promise<number> {
    const uniqueOpenIds = uniqueNonEmptyStrings(openIds);
    if (uniqueOpenIds.length === 0) {
      return 0;
    }

    let updatedCount = 0;
    const updatedAt = new Date();
    for (
      let index = 0;
      index < uniqueOpenIds.length;
      index += OFFICIAL_ACCOUNT_FOLLOW_UPDATE_CHUNK_SIZE
    ) {
      const chunk = uniqueOpenIds.slice(index, index + OFFICIAL_ACCOUNT_FOLLOW_UPDATE_CHUNK_SIZE);
      const updatedRows = await db
        .update(users)
        .set({
          wechatOfficialAccountFollowedAt: followedAt,
          updatedAt,
        })
        .where(and(inArray(users.openId, chunk), isNull(users.wechatOfficialAccountFollowedAt)))
        .returning({ id: users.id });
      updatedCount += updatedRows.length;
    }

    return updatedCount;
  }
}
