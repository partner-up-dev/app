import assert from "node:assert/strict";
import { test } from "vitest";
import { hasUnreadPRMessages, toPRMessageThreadItem } from "./pr-message-thread.service";
import { canNotifyForUnreadWave } from "../../notification/model/unread-wave";

test("canNotifyForUnreadWave allows first notification when inbox state is missing", () => {
  assert.equal(canNotifyForUnreadWave(null), true);
});

test("canNotifyForUnreadWave blocks duplicate notifications inside one unread wave", () => {
  assert.equal(
    canNotifyForUnreadWave({
      lastReadMessageId: 5,
      lastNotifiedMessageId: 6,
    }),
    false,
  );
});

test("canNotifyForUnreadWave re-enables notifications after read marker catches up", () => {
  assert.equal(
    canNotifyForUnreadWave({
      lastReadMessageId: 6,
      lastNotifiedMessageId: 6,
    }),
    true,
  );
});

test("hasUnreadPRMessages compares latest visible marker against read marker", () => {
  assert.equal(
    hasUnreadPRMessages({
      latestVisibleMessageId: 9,
      lastReadMessageId: 8,
    }),
    true,
  );
  assert.equal(
    hasUnreadPRMessages({
      latestVisibleMessageId: 9,
      lastReadMessageId: 9,
    }),
    false,
  );
});

test("toPRMessageThreadItem marks service-authored messages as system messages", () => {
  const item = toPRMessageThreadItem({
    id: 10,
    prId: 99,
    authorUserId: "00000000-0000-0000-0000-000000000001",
    body: "预订已完成，请提前到场。",
    createdAt: new Date("2026-04-15T04:00:00.000Z"),
    updatedAt: new Date("2026-04-15T04:00:00.000Z"),
    authorRole: "service",
    authorNickname: "运营后台",
    authorAvatar: null,
  });

  assert.equal(item.messageType, "SYSTEM");
  assert.equal(item.author.label, "系统消息");
});
