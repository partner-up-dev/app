import assert from "node:assert/strict";
import { PRMessageRepository } from "../../src/repositories/PRMessageRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";

type PRMessageThreadResponse = {
  items: Array<{ id: number }>;
  thread: {
    acknowledgementCursor: number | null;
    latestVisibleMessageId: number | null;
  };
};

const messageRepo = new PRMessageRepository();

scenario(
  "pr_message_tombstone_hides_visible_high_water_without_lowering_ack_cursor",
  async (ctx) => {
    const creator = await givenUser("message-cursor-tombstone-creator");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "OPEN",
      title: "PR message cursor tombstone",
    });
    ctx.record("prId", pr.id);

    const first = await messageRepo.create({
      prId: pr.id,
      authorUserId: creator.user.id,
      body: "Visible lower message",
    });
    const highWater = await messageRepo.create({
      prId: pr.id,
      authorUserId: creator.user.id,
      body: "Tombstoned high-water message",
    });
    assert.ok(first);
    assert.ok(highWater);

    const tombstoned = await messageRepo.tombstoneById(highWater.id);
    assert.equal(tombstoned?.id, highWater.id);
    assert.ok(tombstoned?.deletedAt);

    const [visible, latestVisibleMessageId, acknowledgementCursor, hiddenLookup, cursorLookup] =
      await Promise.all([
        messageRepo.listByPrId(pr.id),
        messageRepo.findLatestIdByPrId(pr.id),
        messageRepo.findLatestAcknowledgementCursorByPrId(pr.id),
        messageRepo.findByPrIdAndId(pr.id, highWater.id),
        messageRepo.findByPrIdAndIdIncludingTombstone(pr.id, highWater.id),
      ]);
    assert.deepEqual(
      visible.map((message) => message.id),
      [first.id],
    );
    assert.equal(latestVisibleMessageId, first.id);
    assert.equal(acknowledgementCursor, highWater.id);
    assert.equal(hiddenLookup, null);
    assert.equal(cursorLookup?.id, highWater.id);
    assert.ok(cursorLookup?.deletedAt);

    const response = await expectJsonResponse<PRMessageThreadResponse>(
      await requestJson(`/api/pr/${pr.id}/messages`, { token: creator.token }),
      200,
    );
    assert.deepEqual(
      response.items.map((message) => message.id),
      [first.id],
    );
    assert.equal(response.thread.latestVisibleMessageId, first.id);
    assert.equal(response.thread.acknowledgementCursor, highWater.id);
  },
);
