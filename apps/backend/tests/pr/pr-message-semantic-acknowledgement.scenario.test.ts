import assert from "node:assert/strict";
import { desc, eq } from "drizzle-orm";
import { config } from "../../src/entities/config";
import { jobs, type JobRow } from "../../src/entities/job";
import { prMessages } from "../../src/entities/pr-message";
import {
  notificationTaskPayloadSchema,
  type PRMessageSummaryNotificationTask,
} from "../../src/domains/notification/owner/task";
import { db } from "../../src/lib/db";
import { PRMessageRepository } from "../../src/repositories/PRMessageRepository";
import { UserNotificationOptRepository } from "../../src/repositories/UserNotificationOptRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { bindScenarioWeChatOpenId } from "./_kit/actions/system-state";
import { joinPartnerRequest } from "./_kit/actions/join";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";

type GenericMessageWindow = { job: JobRow; task: PRMessageSummaryNotificationTask };

const PR_MESSAGE_TEMPLATE_CONFIG_KEY = "wechat.submsg_pr_message_template_id";
const messageRepo = new PRMessageRepository();
const notificationOptRepo = new UserNotificationOptRepository();

const listGenericMessageWindows = async (prId: number): Promise<GenericMessageWindow[]> => {
  const rows = await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"));
  return rows.flatMap((job) => {
    const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
    if (!parsed.success || parsed.data.template !== "pr.message-summary") return [];
    return parsed.data.payload.prId === prId ? [{ job, task: parsed.data }] : [];
  });
};

const latestMessageId = async (prId: number): Promise<number> => {
  const rows = await db
    .select({ id: prMessages.id })
    .from(prMessages)
    .where(eq(prMessages.prId, prId))
    .orderBy(desc(prMessages.id))
    .limit(1);
  assert.ok(rows[0]);
  return rows[0].id;
};

const getWindow = async (prId: number, jobId: number): Promise<JobRow> => {
  const windows = await listGenericMessageWindows(prId);
  const window = windows.find(({ job }) => job.id === jobId)?.job;
  assert.ok(window);
  return window;
};

scenario("pr_message_semantic_acknowledgement_validates_all_row_cursor", async (ctx) => {
  const author = await givenUser("semantic-ack-author");
  const recipient = await givenUser("semantic-ack-recipient");
  const outsider = await givenUser("semantic-ack-outsider");
  const pr = await givenPublishedPartnerRequest({
    creator: author,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Semantic PR-message acknowledgement",
  });
  ctx.record("prId", pr.id);

  await Promise.all([
    joinPartnerRequest({ pr, user: recipient }),
    bindScenarioWeChatOpenId({
      user: recipient,
      openId: "openid-semantic-ack-recipient",
    }),
    notificationOptRepo.addOneWechatNotificationCredit(recipient.user.id, "PR_MESSAGE"),
    db
      .insert(config)
      .values({
        key: PR_MESSAGE_TEMPLATE_CONFIG_KEY,
        value: "scenario-semantic-ack-template",
      })
      .onConflictDoUpdate({
        target: config.key,
        set: { value: "scenario-semantic-ack-template" },
      }),
  ]);

  await expectJsonResponse(
    await requestJson(`/api/pr/${pr.id}/messages`, {
      method: "POST",
      token: author.token,
      body: { body: "First visible message" },
    }),
    200,
  );
  const firstCursor = await latestMessageId(pr.id);
  const firstWindow = (await listGenericMessageWindows(pr.id))[0]?.job;
  assert.ok(firstWindow);
  assert.equal(firstWindow.reservationState, "HELD");
  assert.equal(firstWindow.highWaterCursor, firstCursor);

  await expectJsonResponse(
    await requestJson(`/api/pr/${pr.id}/messages`, {
      method: "POST",
      token: author.token,
      body: { body: "Second coalesced message" },
    }),
    200,
  );
  const secondCursor = await latestMessageId(pr.id);
  assert.ok(secondCursor > firstCursor);
  const coalescedWindow = await getWindow(pr.id, firstWindow.id);
  assert.equal(coalescedWindow.reservationState, "HELD");
  assert.equal(coalescedWindow.highWaterCursor, secondCursor);

  assert.deepEqual(
    await expectJsonResponse(
      await requestJson(`/api/pr/${pr.id}/messages/acknowledgement`, {
        method: "POST",
        token: recipient.token,
        body: { acknowledgementCursor: firstCursor },
      }),
      200,
    ),
    { ok: true },
  );
  const afterStaleAcknowledgement = await getWindow(pr.id, firstWindow.id);
  assert.equal(afterStaleAcknowledgement.reservationState, "HELD");
  assert.equal(afterStaleAcknowledgement.highWaterCursor, secondCursor);

  assert.deepEqual(
    await expectJsonResponse(
      await requestJson(`/api/pr/${pr.id}/messages/acknowledgement`, {
        method: "POST",
        token: recipient.token,
        body: { acknowledgementCursor: secondCursor },
      }),
      200,
    ),
    { ok: true },
  );
  const releasedWindow = await getWindow(pr.id, firstWindow.id);
  assert.equal(releasedWindow.reservationState, "RELEASED");
  assert.equal(releasedWindow.status, "CANCELED");

  await expectJsonResponse(
    await requestJson(`/api/pr/${pr.id}/messages`, {
      method: "POST",
      token: author.token,
      body: { body: "Tombstoned acknowledgement cursor" },
    }),
    200,
  );
  const tombstonedCursor = await latestMessageId(pr.id);
  const reopenedWindow = (await listGenericMessageWindows(pr.id)).find(
    ({ job }) => job.id !== firstWindow.id,
  )?.job;
  assert.ok(reopenedWindow);
  assert.equal(reopenedWindow.reservationState, "HELD");
  assert.equal(reopenedWindow.highWaterCursor, tombstonedCursor);

  assert.ok(await messageRepo.tombstoneById(tombstonedCursor));
  assert.deepEqual(
    await expectJsonResponse(
      await requestJson(`/api/pr/${pr.id}/messages/acknowledgement`, {
        method: "POST",
        token: recipient.token,
        body: { acknowledgementCursor: tombstonedCursor },
      }),
      200,
    ),
    { ok: true },
  );
  const releasedTombstonedWindow = await getWindow(pr.id, reopenedWindow.id);
  assert.equal(releasedTombstonedWindow.reservationState, "RELEASED");

  await expectJsonResponse(
    await requestJson(`/api/pr/${pr.id}/messages/acknowledgement`, {
      method: "POST",
      token: recipient.token,
      body: { acknowledgementCursor: tombstonedCursor + 1_000_000 },
    }),
    400,
  );
  await expectJsonResponse(
    await requestJson(`/api/pr/${pr.id}/messages/acknowledgement`, {
      method: "POST",
      token: outsider.token,
      body: { acknowledgementCursor: firstCursor },
    }),
    403,
  );
});
