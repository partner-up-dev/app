import assert from "node:assert/strict";
import { test } from "vitest";
import { buildPRMessageThreadState, toPRMessageThreadItem } from "./pr-message-thread.service";

test("thread state keeps acknowledgement cursor when the visible high-water is lower", () => {
  const state = buildPRMessageThreadState(8, 9);

  assert.equal(state.latestVisibleMessageId, 8);
  assert.equal(state.acknowledgementCursor, 9);
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
