import type { PRMessageId } from "../../../entities/pr-message";
import type { PRMessageInboxState } from "../../../entities/pr-message-inbox-state";

const coalesceMessageId = (value: PRMessageId | null | undefined): number => value ?? 0;

export const hasUnreadWaveNotification = (
  inboxState: Pick<PRMessageInboxState, "lastReadMessageId" | "lastNotifiedMessageId"> | null,
): boolean => {
  const lastNotifiedMessageId = inboxState?.lastNotifiedMessageId ?? null;
  if (lastNotifiedMessageId === null) {
    return false;
  }

  return (
    coalesceMessageId(lastNotifiedMessageId) >
    coalesceMessageId(inboxState?.lastReadMessageId ?? null)
  );
};

export const canNotifyForUnreadWave = (
  inboxState: Pick<PRMessageInboxState, "lastReadMessageId" | "lastNotifiedMessageId"> | null,
): boolean => !hasUnreadWaveNotification(inboxState);
