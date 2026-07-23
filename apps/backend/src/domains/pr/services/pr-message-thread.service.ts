import type { PRMessageId } from "../../../entities/pr-message";
import type { UserId, UserRole } from "../../../entities/user";
import type { PRMessageWithAuthor } from "../../../repositories/PRMessageRepository";

export const PR_MESSAGE_RATE_LIMIT_MAX_MESSAGES = 3;
export const PR_MESSAGE_RATE_LIMIT_WINDOW_MS = 60_000;

export type PRMessageThreadItem = {
  id: PRMessageId;
  messageType: "USER" | "SYSTEM";
  body: string;
  createdAt: string;
  author: {
    userId: UserId;
    role: UserRole | null;
    nickname: string | null;
    avatarUrl: string | null;
    label: string;
  };
};

export type PRMessageThreadState = {
  canPost: boolean;
  latestVisibleMessageId: PRMessageId | null;
  /**
   * Greatest PRMessage identity, including tombstones. It is the semantic
   * acknowledgement cursor, not a read/unread projection.
   */
  acknowledgementCursor: PRMessageId | null;
};

export type PRMessageThreadResponse = {
  items: PRMessageThreadItem[];
  thread: PRMessageThreadState;
};

export type CreatePRMessageResponse = {
  message: PRMessageThreadItem;
  thread: PRMessageThreadState;
};

export const toPRMessageThreadItem = (message: PRMessageWithAuthor): PRMessageThreadItem => ({
  id: message.id,
  messageType: message.authorRole === "service" ? "SYSTEM" : "USER",
  body: message.body,
  createdAt: message.createdAt.toISOString(),
  author: {
    userId: message.authorUserId,
    role: message.authorRole,
    nickname: message.authorNickname?.trim() || null,
    avatarUrl: message.authorAvatar,
    label: message.authorRole === "service" ? "系统消息" : message.authorNickname?.trim() || "搭子",
  },
});

export const buildPRMessageThreadState = (
  latestVisibleMessageId: PRMessageId | null,
  acknowledgementCursor: PRMessageId | null = latestVisibleMessageId,
): PRMessageThreadState => ({
  canPost: true,
  latestVisibleMessageId,
  acknowledgementCursor,
});

export const buildPRMessageThreadResponse = (input: {
  messages: PRMessageWithAuthor[];
  acknowledgementCursor?: PRMessageId | null;
}): PRMessageThreadResponse => {
  const latestVisibleMessageId = input.messages[input.messages.length - 1]?.id ?? null;

  return {
    items: input.messages.map(toPRMessageThreadItem),
    thread: buildPRMessageThreadState(latestVisibleMessageId, input.acknowledgementCursor),
  };
};
