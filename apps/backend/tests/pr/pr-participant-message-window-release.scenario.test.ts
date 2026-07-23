import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { updatePRMessageNotificationSubscription } from "../../src/domains/notification";
import { config } from "../../src/entities/config";
import { jobs, type JobRow } from "../../src/entities/job";
import { notificationTaskPayloadSchema } from "../../src/domains/notification/owner/task";
import { createPRParticipantReleaseTransactionPort } from "../../src/domains/pr/adapters/pr-participant-release-transaction";
import { db } from "../../src/lib/db";
import { PartnerRepository } from "../../src/repositories/PartnerRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { exitPR } from "./_kit/actions/exit";
import { joinPartnerRequest } from "./_kit/actions/join";
import { bindScenarioWeChatOpenId } from "./_kit/actions/system-state";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenAdminUser, givenUser } from "./_kit/builders/users";

const PR_MESSAGE_TEMPLATE_CONFIG_KEY = "wechat.submsg_pr_message_template_id";
const partnerRepo = new PartnerRepository();

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

const messageJobForRecipient = (rows: JobRow[], recipientUserId: string): JobRow | undefined =>
  rows.find((job) => {
    const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
    return (
      parsed.success &&
      parsed.data.template === "pr.message-summary" &&
      parsed.data.recipientUserId === recipientUserId
    );
  });

scenario(
  "participant_removal_releases_only_departing_windows_and_rejoin_does_not_replay_history",
  async (ctx) => {
    const creator = await givenUser("participant-window-release-creator");
    const selfExiting = await givenUser("participant-window-release-self-exit");
    const adminReleased = await givenUser("participant-window-release-admin-target");
    const admin = await givenAdminUser("participant-window-release-admin");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 4,
      expectedCreatedStatus: "OPEN",
      title: "Participant message-window release",
    });
    ctx.record("prId", pr.id);
    ctx.record("selfExitingUserId", selfExiting.user.id);
    ctx.record("adminReleasedUserId", adminReleased.user.id);

    await Promise.all([
      joinPartnerRequest({ pr, user: selfExiting }),
      joinPartnerRequest({ pr, user: adminReleased }),
      bindScenarioWeChatOpenId({
        user: selfExiting,
        openId: "openid-participant-window-release-self-exit",
      }),
      bindScenarioWeChatOpenId({
        user: adminReleased,
        openId: "openid-participant-window-release-admin-target",
      }),
      db
        .insert(config)
        .values({ key: PR_MESSAGE_TEMPLATE_CONFIG_KEY, value: "scenario-pr-message-template" })
        .onConflictDoUpdate({
          target: config.key,
          set: { value: "scenario-pr-message-template" },
        }),
    ]);
    await Promise.all([
      updatePRMessageNotificationSubscription({
        recipientUserId: selfExiting.user.id,
        action: "ADD_ONE",
      }),
      updatePRMessageNotificationSubscription({
        recipientUserId: adminReleased.user.id,
        action: "ADD_ONE",
      }),
    ]);

    await expectJsonResponse(
      await requestJson(`/api/pr/${pr.id}/messages`, {
        method: "POST",
        token: creator.token,
        body: { body: "Historical message before participant removal" },
      }),
      200,
    );

    const initialJobs = await listPRMessageJobs(pr.id);
    assert.equal(initialJobs.length, 2);
    const selfExitWindow = messageJobForRecipient(initialJobs, selfExiting.user.id);
    const adminReleaseWindow = messageJobForRecipient(initialJobs, adminReleased.user.id);
    assert.ok(selfExitWindow);
    assert.ok(adminReleaseWindow);
    assert.equal(selfExitWindow.status, "PENDING");
    assert.equal(selfExitWindow.reservationState, "HELD");
    assert.equal(adminReleaseWindow.status, "PENDING");
    assert.equal(adminReleaseWindow.reservationState, "HELD");

    await exitPR({ pr, user: selfExiting });

    const afterSelfExit = await listPRMessageJobs(pr.id);
    const releasedSelfExitWindow = afterSelfExit.find((job) => job.id === selfExitWindow.id);
    const unaffectedAdminWindow = afterSelfExit.find((job) => job.id === adminReleaseWindow.id);
    assert.equal(releasedSelfExitWindow?.status, "CANCELED");
    assert.equal(releasedSelfExitWindow?.reservationState, "RELEASED");
    assert.equal(unaffectedAdminWindow?.status, "PENDING");
    assert.equal(unaffectedAdminWindow?.reservationState, "HELD");

    await joinPartnerRequest({ pr, user: selfExiting });
    assert.equal((await listPRMessageJobs(pr.id)).length, 2);

    const adminTargetSlot = await partnerRepo.findActiveByPrIdAndUserId(
      pr.id,
      adminReleased.user.id,
    );
    assert.ok(adminTargetSlot);
    await expectJsonResponse(
      await requestJson(`/api/admin/prs/${pr.id}/partners/${adminTargetSlot.id}/release`, {
        method: "POST",
        token: admin.token,
        body: { reason: "Scenario administrator release" },
      }),
      200,
    );

    const afterAdminRelease = await listPRMessageJobs(pr.id);
    const releasedAdminWindow = afterAdminRelease.find((job) => job.id === adminReleaseWindow.id);
    assert.equal(releasedAdminWindow?.status, "CANCELED");
    assert.equal(releasedAdminWindow?.reservationState, "RELEASED");
    assert.equal(afterAdminRelease.length, 2);

    await expectJsonResponse(
      await requestJson(`/api/pr/${pr.id}/messages`, {
        method: "POST",
        token: creator.token,
        body: { body: "New message after rejoin opens only future attention" },
      }),
      200,
    );

    const afterLaterMessage = await listPRMessageJobs(pr.id);
    assert.equal(afterLaterMessage.length, 3);
    const selfExitRecipientJobs = afterLaterMessage.filter((job) => {
      const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
      return (
        parsed.success &&
        parsed.data.template === "pr.message-summary" &&
        parsed.data.recipientUserId === selfExiting.user.id
      );
    });
    assert.equal(selfExitRecipientJobs.length, 2);
    assert.equal(
      selfExitRecipientJobs.filter(
        (job) => job.status === "PENDING" && job.reservationState === "HELD",
      ).length,
      1,
    );
    assert.equal(
      afterLaterMessage.filter((job) => {
        const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
        return (
          parsed.success &&
          parsed.data.template === "pr.message-summary" &&
          parsed.data.recipientUserId === adminReleased.user.id
        );
      }).length,
      1,
    );
  },
);

scenario("participant_removal_rolls_back_when_window_release_fails", async (ctx) => {
  const creator = await givenUser("participant-window-rollback-creator");
  const participant = await givenUser("participant-window-rollback-target");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 3,
    expectedCreatedStatus: "OPEN",
    title: "Participant message-window rollback",
  });
  ctx.record("prId", pr.id);
  ctx.record("participantUserId", participant.user.id);
  await joinPartnerRequest({ pr, user: participant });

  const failingReleaseTransaction = createPRParticipantReleaseTransactionPort({
    releaseMessageWindow: async () => {
      throw new Error("SCENARIO_NOTIFICATION_RELEASE_FAILED");
    },
  });

  await assert.rejects(
    failingReleaseTransaction.exitActive({
      prId: pr.id,
      userId: participant.user.id,
    }),
    /SCENARIO_NOTIFICATION_RELEASE_FAILED/,
  );

  const activeSlot = await partnerRepo.findActiveByPrIdAndUserId(pr.id, participant.user.id);
  assert.ok(activeSlot);
  assert.equal(activeSlot.status, "JOINED");
});
