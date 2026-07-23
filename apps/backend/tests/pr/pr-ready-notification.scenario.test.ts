import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { notificationTaskPayloadSchema } from "../../src/domains/notification/owner/task";
import { createPRReadyTransitionTransactionPort } from "../../src/domains/pr/adapters/pr-ready-transition-transaction";
import { refreshTemporalStatus } from "../../src/domains/pr/temporal-refresh";
import { jobs } from "../../src/entities/job";
import { partnerRequests } from "../../src/entities/partner-request";
import { db } from "../../src/lib/db";
import { createNotificationOwnerRuntime } from "../../src/infra/notifications/notification-owner-runtime";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { UserNotificationOptRepository } from "../../src/repositories/UserNotificationOptRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { scenario } from "../_infra/scenario/scenario";
import { bindScenarioWeChatOpenId } from "./_kit/actions/system-state";
import { joinPartnerRequest } from "./_kit/actions/join";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";

const prRepo = new PartnerRequestRepository();
const notificationOptRepo = new UserNotificationOptRepository();

const getPRReadyJobs = async (prId: number) => {
  const rows = await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"));
  return rows.flatMap((job) => {
    const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
    if (
      !parsed.success ||
      parsed.data.template !== "pr.ready" ||
      parsed.data.payload.prId !== prId
    ) {
      return [];
    }
    return [{ job, task: parsed.data }];
  });
};

scenario("pr_ready_manual_transition_commits_exact_generic_fanout", async (ctx) => {
  const creator = await givenUser("pr-ready-manual-creator");
  const eligibleParticipant = await givenUser("pr-ready-manual-eligible");
  const noCreditParticipant = await givenUser("pr-ready-manual-no-credit");
  const missingOpenIdParticipant = await givenUser("pr-ready-manual-no-openid");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 5,
    expectedCreatedStatus: "OPEN",
    title: "PR ready manual atomic fanout",
  });
  ctx.record("prId", pr.id);

  await Promise.all([
    bindScenarioWeChatOpenId({ user: creator, openId: "openid-pr-ready-manual-creator" }),
    bindScenarioWeChatOpenId({
      user: eligibleParticipant,
      openId: "openid-pr-ready-manual-eligible",
    }),
    bindScenarioWeChatOpenId({
      user: noCreditParticipant,
      openId: "openid-pr-ready-manual-no-credit",
    }),
    notificationOptRepo.addOneWechatNotificationCredit(creator.user.id, "PR_READY"),
    notificationOptRepo.addOneWechatNotificationCredit(eligibleParticipant.user.id, "PR_READY"),
    notificationOptRepo.addOneWechatNotificationCredit(
      missingOpenIdParticipant.user.id,
      "PR_READY",
    ),
  ]);
  await joinPartnerRequest({ pr, user: eligibleParticipant });
  await joinPartnerRequest({ pr, user: noCreditParticipant });
  await joinPartnerRequest({ pr, user: missingOpenIdParticipant });

  const updated = await expectJsonResponse<{ status: string }>(
    await requestJson(`/api/pr/${pr.id}/status`, {
      method: "PATCH",
      token: creator.token,
      body: { status: "READY" },
    }),
    200,
  );
  assert.equal(updated.status, "READY");

  const readyRequest = await prRepo.findById(pr.id);
  assert.ok(readyRequest);
  assert.equal(readyRequest.status, "READY");
  assert.ok(readyRequest.readyCycleId);

  const prReadyJobs = await getPRReadyJobs(pr.id);
  assert.equal(prReadyJobs.length, 2);
  assert.deepEqual(
    new Set(prReadyJobs.map(({ task }) => task.recipientUserId)),
    new Set([creator.user.id, eligibleParticipant.user.id]),
  );
  for (const { job, task } of prReadyJobs) {
    assert.equal(job.creationMode, "ONCE_PER_CAUSE");
    assert.equal(task.payload.readyCycleId, readyRequest.readyCycleId);
    assert.equal(task.causationId, `partner_request:${pr.id}:ready:${readyRequest.readyCycleId}`);
    assert.equal(
      job.creationKey,
      `notification:pr.ready:WECHAT_SUBSCRIPTION:${task.recipientUserId}:${pr.id}:${readyRequest.readyCycleId}`,
    );
  }
  await expectJsonResponse<{ status: string }>(
    await requestJson(`/api/pr/${pr.id}/status`, {
      method: "PATCH",
      token: creator.token,
      body: { status: "READY" },
    }),
    200,
  );
  const unchangedRequest = await prRepo.findById(pr.id);
  assert.ok(unchangedRequest);
  assert.equal(unchangedRequest.readyCycleId, readyRequest.readyCycleId);
  assert.equal((await getPRReadyJobs(pr.id)).length, 2);

  const creatorTask = prReadyJobs.find(({ task }) => task.recipientUserId === creator.user.id);
  assert.ok(creatorTask);
  let channelCalls = 0;
  let dispatchedContent: Record<string, unknown> | null = null;
  const owner = createNotificationOwnerRuntime({
    channel: {
      async send(message) {
        channelCalls += 1;
        assert.equal(message.template, "pr.ready");
        dispatchedContent = message.content;
        return { outcome: "ACCEPTED", providerReference: "pr-ready-manual-provider-id" };
      },
    },
  });
  assert.deepEqual(await owner.dispatch(creatorTask.task), {
    disposition: "SUCCEEDED",
    reason: "CHANNEL_ACCEPTED",
    providerReference: "pr-ready-manual-provider-id",
  });
  assert.equal(dispatchedContent?.title, "PR ready manual atomic fanout");
  assert.equal(dispatchedContent?.type, "badminton");
  assert.equal(dispatchedContent?.status, "已就绪");
  assert.equal(dispatchedContent?.remark, "已成团，可下单；不可直接加入退出");
  assert.equal(channelCalls, 1);
  const creatorOptionAfterDispatch = await notificationOptRepo.findByUserId(creator.user.id);
  assert.ok(creatorOptionAfterDispatch);
  assert.equal(creatorOptionAfterDispatch.wechatPrReadyRemainingCount, 0);
  assert.equal(creatorOptionAfterDispatch.wechatPrReadyOptIn, true);
});

scenario("pr_ready_temporal_join_lock_uses_the_same_atomic_generic_handoff", async (ctx) => {
  const creator = await givenUser("pr-ready-temporal-creator");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "PR ready temporal atomic handoff",
  });
  ctx.record("prId", pr.id);
  await Promise.all([
    bindScenarioWeChatOpenId({ user: creator, openId: "openid-pr-ready-temporal-creator" }),
    notificationOptRepo.addOneWechatNotificationCredit(creator.user.id, "PR_READY"),
  ]);

  const startAt = new Date(Date.now() + 20 * 60 * 1000);
  const endAt = new Date(Date.now() + 80 * 60 * 1000);
  await getTestDb()
    .update(partnerRequests)
    .set({
      time: [startAt.toISOString(), endAt.toISOString()],
      confirmationStartOffsetMinutes: 120,
      confirmationEndOffsetMinutes: 5,
      joinLockOffsetMinutes: 30,
    })
    .where(eq(partnerRequests.id, pr.id));

  const beforeRefresh = await prRepo.findById(pr.id);
  assert.ok(beforeRefresh);
  const refreshed = await refreshTemporalStatus(beforeRefresh);
  assert.equal(refreshed.status, "READY");
  assert.ok(refreshed.readyCycleId);

  const prReadyJobs = await getPRReadyJobs(pr.id);
  assert.equal(prReadyJobs.length, 1);
  assert.equal(prReadyJobs[0]?.task.recipientUserId, creator.user.id);
  assert.equal(prReadyJobs[0]?.task.payload.readyCycleId, refreshed.readyCycleId);
  assert.equal(
    prReadyJobs[0]?.task.causationId,
    `partner_request:${pr.id}:ready:${refreshed.readyCycleId}`,
  );
});

scenario(
  "pr_ready_cycle_fences_old_jobs_and_allows_the_current_cycle_through_active",
  async (ctx) => {
    const creator = await givenUser("pr-ready-cycle-creator");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "OPEN",
      title: "PR ready cycle fence",
    });
    ctx.record("prId", pr.id);
    await Promise.all([
      bindScenarioWeChatOpenId({ user: creator, openId: "openid-pr-ready-cycle-creator" }),
      notificationOptRepo.addOneWechatNotificationCredit(creator.user.id, "PR_READY"),
    ]);

    const transitions = createPRReadyTransitionTransactionPort();
    const first = await transitions.transitionManual({ prId: pr.id });
    assert.equal(first.outcome, "TRANSITIONED");
    if (first.outcome !== "TRANSITIONED") return;

    const firstTask = (await getPRReadyJobs(pr.id)).find(
      ({ task }) => task.payload.readyCycleId === first.readyCycleId,
    );
    assert.ok(firstTask);
    await prRepo.updateStatus(pr.id, "OPEN");

    let channelCalls = 0;
    const owner = createNotificationOwnerRuntime({
      channel: {
        async send() {
          channelCalls += 1;
          return { outcome: "ACCEPTED", providerReference: "unexpected" };
        },
      },
    });
    assert.deepEqual(await owner.dispatch(firstTask.task), {
      disposition: "SKIPPED",
      reason: "PR_NOT_READY",
    });
    assert.equal(channelCalls, 0);

    const second = await transitions.transitionManual({ prId: pr.id });
    assert.equal(second.outcome, "TRANSITIONED");
    if (second.outcome !== "TRANSITIONED") return;
    assert.notEqual(second.readyCycleId, first.readyCycleId);
    assert.deepEqual(await owner.dispatch(firstTask.task), {
      disposition: "SKIPPED",
      reason: "PR_READY_CYCLE_SUPERSEDED",
    });
    assert.equal(channelCalls, 0);

    const secondTask = (await getPRReadyJobs(pr.id)).find(
      ({ task }) => task.payload.readyCycleId === second.readyCycleId,
    );
    assert.ok(secondTask);
    await prRepo.updateStatus(pr.id, "ACTIVE");
    assert.deepEqual(await owner.dispatch(secondTask.task), {
      disposition: "SUCCEEDED",
      reason: "CHANNEL_ACCEPTED",
      providerReference: "unexpected",
    });
    assert.equal(channelCalls, 1);
  },
);

scenario(
  "pr_ready_atomic_handoff_failure_rolls_back_manual_and_temporal_transitions",
  async (ctx) => {
    const manualCreator = await givenUser("pr-ready-rollback-manual-creator");
    const temporalCreator = await givenUser("pr-ready-rollback-temporal-creator");
    const manualPr = await givenPublishedPartnerRequest({
      creator: manualCreator,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "OPEN",
    });
    const temporalPr = await givenPublishedPartnerRequest({
      creator: temporalCreator,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "OPEN",
    });
    ctx.record("manualPrId", manualPr.id);
    ctx.record("temporalPrId", temporalPr.id);

    const startAt = new Date(Date.now() + 20 * 60 * 1000);
    const endAt = new Date(Date.now() + 80 * 60 * 1000);
    await getTestDb()
      .update(partnerRequests)
      .set({
        time: [startAt.toISOString(), endAt.toISOString()],
        confirmationStartOffsetMinutes: 120,
        confirmationEndOffsetMinutes: 5,
        joinLockOffsetMinutes: 30,
      })
      .where(eq(partnerRequests.id, temporalPr.id));

    const failingTransitions = createPRReadyTransitionTransactionPort({
      createNotificationPort: () => ({
        requestForSourceRecipients: async () => {
          throw new Error("INJECTED_PR_READY_HANDOFF_FAILURE");
        },
      }),
    });
    await assert.rejects(
      failingTransitions.transitionManual({ prId: manualPr.id }),
      /INJECTED_PR_READY_HANDOFF_FAILURE/,
    );
    await assert.rejects(
      failingTransitions.transitionIfJoinLocked({ prId: temporalPr.id }),
      /INJECTED_PR_READY_HANDOFF_FAILURE/,
    );

    for (const prId of [manualPr.id, temporalPr.id]) {
      const request = await prRepo.findById(prId);
      assert.ok(request);
      assert.equal(request.status, "OPEN");
      assert.equal(request.readyCycleId, null);
      assert.equal((await getPRReadyJobs(prId)).length, 0);
    }
  },
);
