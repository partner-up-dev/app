import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { updatePRMessageNotificationSubscription } from "../../src/domains/notification";
import { notificationTaskPayloadSchema } from "../../src/domains/notification/owner/task";
import { getPRMessageSummaryNotificationContext } from "../../src/domains/pr/queries/get-pr-message-summary-notification-context";
import { config } from "../../src/entities/config";
import { jobs, type JobRow } from "../../src/entities/job";
import { prMessages } from "../../src/entities/pr-message";
import { db } from "../../src/lib/db";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import {
  bindScenarioWeChatOpenId,
  configureEndedPR,
  configurePRStatus,
} from "./_kit/actions/system-state";
import { joinPartnerRequest } from "./_kit/actions/join";
import {
  givenPublishedPartnerRequest,
  type ScenarioPartnerRequest,
} from "./_kit/builders/partner-requests";
import { givenAdminUser, givenUser, type ScenarioUser } from "./_kit/builders/users";

const PR_MESSAGE_TEMPLATE_CONFIG_KEY = "wechat.submsg_pr_message_template_id";

type CreatedMessageResponse = { message: { id: number } };

const listPRMessageJobs = async (prId: number): Promise<JobRow[]> => {
  const rows = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.jobType, "notification.send.v1"), eq(jobs.jobVersion, 1)));
  return rows.filter((job) => {
    const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
    return (
      parsed.success &&
      parsed.data.template === "pr.message-summary" &&
      parsed.data.payload.prId === prId
    );
  });
};

const openHeldMessageWindow = async (input: {
  pr: ScenarioPartnerRequest;
  creator: ScenarioUser;
  recipient: ScenarioUser;
}): Promise<{ job: JobRow; messageId: number }> => {
  await Promise.all([
    joinPartnerRequest({ pr: input.pr, user: input.recipient }),
    bindScenarioWeChatOpenId({
      user: input.recipient,
      openId: `openid-terminal-fence-${input.recipient.user.id}`,
    }),
    updatePRMessageNotificationSubscription({
      recipientUserId: input.recipient.user.id,
      action: "ADD_ONE",
    }),
    db
      .insert(config)
      .values({ key: PR_MESSAGE_TEMPLATE_CONFIG_KEY, value: "scenario-pr-message-template" })
      .onConflictDoUpdate({
        target: config.key,
        set: { value: "scenario-pr-message-template" },
      }),
  ]);

  const created = await expectJsonResponse<CreatedMessageResponse>(
    await requestJson(`/api/pr/${input.pr.id}/messages`, {
      method: "POST",
      token: input.creator.token,
      body: { body: "Message that opens a held attention window" },
    }),
    200,
  );
  const jobsForPR = await listPRMessageJobs(input.pr.id);
  assert.equal(jobsForPR.length, 1);
  const job = jobsForPR[0];
  assert.ok(job);
  assert.equal(job.status, "PENDING");
  assert.equal(job.reservationState, "HELD");
  return { job, messageId: created.message.id };
};

const assertReleased = async (input: { prId: number; jobId: number }): Promise<void> => {
  const released = (await listPRMessageJobs(input.prId)).find((job) => job.id === input.jobId);
  assert.equal(released?.status, "CANCELED");
  assert.equal(released?.reservationState, "RELEASED");
};

scenario(
  "manual_close_releases_held_window_persists_terminal_message_and_fences_new_work",
  async (ctx) => {
    const creator = await givenUser("terminal-fence-manual-creator");
    const recipient = await givenUser("terminal-fence-manual-recipient");
    const admin = await givenAdminUser("terminal-fence-manual-admin");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 3,
      expectedCreatedStatus: "OPEN",
      title: "Manual terminal attention fence",
    });
    ctx.record("prId", pr.id);
    ctx.record("recipientUserId", recipient.user.id);
    const opened = await openHeldMessageWindow({ pr, creator, recipient });

    const closed = await expectJsonResponse<{ status: string }>(
      await requestJson(`/api/pr/${pr.id}/status`, {
        method: "PATCH",
        token: creator.token,
        body: { status: "CLOSED" },
      }),
      200,
    );
    assert.equal(closed.status, "CLOSED");
    await assertReleased({ prId: pr.id, jobId: opened.job.id });

    assert.deepEqual(
      await getPRMessageSummaryNotificationContext({
        prId: pr.id,
        recipientUserId: recipient.user.id,
        windowStartCursor: opened.messageId,
      }),
      { state: "SKIPPED", reason: "PR_TERMINAL" },
    );

    await expectJsonResponse(
      await requestJson(`/api/admin/prs/${pr.id}/messages`, {
        method: "POST",
        token: admin.token,
        body: { body: "Compatible terminal system message" },
      }),
      200,
    );
    const terminalMessages = await db
      .select({ id: prMessages.id })
      .from(prMessages)
      .where(eq(prMessages.prId, pr.id));
    assert.equal(terminalMessages.length, 2);
    const genericAfterTerminalSource = await listPRMessageJobs(pr.id);
    assert.equal(genericAfterTerminalSource.length, 1);
    assert.equal(genericAfterTerminalSource[0]?.reservationState, "RELEASED");
  },
);

scenario(
  "temporal_terminal_transitions_release_held_windows_for_closed_and_expired",
  async (ctx) => {
    const closeCreator = await givenUser("terminal-fence-temporal-close-creator");
    const closeRecipient = await givenUser("terminal-fence-temporal-close-recipient");
    const closePr = await givenPublishedPartnerRequest({
      creator: closeCreator,
      minPartners: 1,
      maxPartners: 3,
      expectedCreatedStatus: "OPEN",
      title: "Temporal CLOSED attention fence",
    });
    ctx.record("closedPrId", closePr.id);
    const closeWindow = await openHeldMessageWindow({
      pr: closePr,
      creator: closeCreator,
      recipient: closeRecipient,
    });
    await configurePRStatus({ pr: closePr, status: "ACTIVE" });
    await configureEndedPR(closePr);

    const closed = await expectJsonResponse<{ status: string }>(
      await requestJson(`/api/pr/${closePr.id}`, { token: closeCreator.token }),
      200,
    );
    assert.equal(closed.status, "CLOSED");
    await assertReleased({ prId: closePr.id, jobId: closeWindow.job.id });

    const expireCreator = await givenUser("terminal-fence-temporal-expire-creator");
    const expireRecipient = await givenUser("terminal-fence-temporal-expire-recipient");
    const expirePr = await givenPublishedPartnerRequest({
      creator: expireCreator,
      minPartners: 3,
      maxPartners: 4,
      expectedCreatedStatus: "OPEN",
      title: "Temporal EXPIRED attention fence",
    });
    ctx.record("expiredPrId", expirePr.id);
    const expireWindow = await openHeldMessageWindow({
      pr: expirePr,
      creator: expireCreator,
      recipient: expireRecipient,
    });
    await configurePRStatus({ pr: expirePr, status: "ACTIVE" });
    await configureEndedPR(expirePr);

    const expired = await expectJsonResponse<{ status: string }>(
      await requestJson(`/api/pr/${expirePr.id}`, { token: expireCreator.token }),
      200,
    );
    assert.equal(expired.status, "EXPIRED");
    await assertReleased({ prId: expirePr.id, jobId: expireWindow.job.id });
  },
);
