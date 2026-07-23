/**
 * Private Notification identity for one recipient's PR-message attention
 * windows. PR callers pass semantic aggregate/recipient facts; only
 * Notification turns them into Job creation keys.
 */
export const prMessageSummaryCreationKeyPrefix = (recipientUserId: string): string =>
  ["notification", "pr.message-summary", "WECHAT_SUBSCRIPTION", recipientUserId, ""].join(":");

export const prMessageSummaryCreationKey = (input: {
  recipientUserId: string;
  prId: number;
}): string => `${prMessageSummaryCreationKeyPrefix(input.recipientUserId)}${input.prId}`;
