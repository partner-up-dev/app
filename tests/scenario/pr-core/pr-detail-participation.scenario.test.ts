import assert from "node:assert/strict";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { withScenarioPage } from "../_infra/browser/browser";
import {
  expectBackendJsonResponse,
  requestBackendJson,
} from "../_infra/http/backend";
import { scenario } from "../_infra/scenario/scenario";
import {
  configureJoinGate,
  configureOpenConfirmationWindow,
  configureStartedEvent,
  configureStartedEventWithDisabledConfirmation,
  configureStartedEventWithFeedback,
  bindScenarioWeChatOpenId,
} from "../../../apps/backend/tests/pr-core/_kit/actions/system-state";
import {
  probeLatestPartnerSlot,
  probeUserPhone,
} from "../../../apps/backend/tests/pr-core/_kit/probes/system-state";
import { givenPublishedPartnerRequest } from "../../../apps/backend/tests/pr-core/_kit/builders/partner-requests";
import { givenUser } from "../../../apps/backend/tests/pr-core/_kit/builders/users";
import {
  givenFeedbackQuestionnaireInstance,
  givenFeedbackQuestionnaireTemplate,
} from "../../../apps/backend/tests/feedback-questionnaire/_kit/builders/questionnaires";

type PRActionResponse = {
  status: string;
};

async function joinThroughBackend(input: {
  prId: number;
  token: string;
}): Promise<PRActionResponse> {
  return expectBackendJsonResponse<PRActionResponse>(
    await requestBackendJson(`/api/pr/${input.prId}/join`, {
      method: "POST",
      token: input.token,
      body: {},
    }),
    200,
  );
}

async function exitThroughBackend(input: {
  prId: number;
  token: string;
}): Promise<PRActionResponse> {
  return expectBackendJsonResponse<PRActionResponse>(
    await requestBackendJson(`/api/pr/${input.prId}/exit`, {
      method: "POST",
      token: input.token,
    }),
    200,
  );
}

scenario(
  "pr_detail_join_with_booking_contact_gate_reaches_participant_state",
  async (ctx) => {
    const creator = await givenUser("system-gated-join-creator");
    const joiner = await givenUser("system-gated-joiner");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 2,
      maxPartners: null,
      title: "System scenario gated partner request",
    });

    await configureJoinGate({
      pr,
      config: [
        {
          kind: "BOOKING_CONTACT",
          key: "system-booking-contact",
          version: "1",
          title: "预订联系人",
          source: "PR",
          prompt: "请留下用于预订沟通的手机号。",
        },
      ],
    });

    ctx.record("prId", pr.id);
    ctx.record("joinerUserId", joiner.user.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, joiner);
      await installDeterministicShareSidecarStubs(page);

      await page.goto(`/pr/${pr.id}`);
      await page.getByTestId("pr-detail.join.open").click();
      await page
        .getByTestId("pr-detail.join-gate.booking-contact.input")
        .fill("13800138000");
      await page.getByTestId("pr-detail.join-gate.booking-contact.submit").click();
      await page
        .getByTestId("pr-detail.join-success.confirmation-followup")
        .waitFor({
          state: "visible",
          timeout: 10_000,
        });
      await page
        .getByTestId("pr-detail.join-success.confirmation-followup.done")
        .click();
      await page.getByTestId("pr-detail.join-success.subscriptions").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await page.getByTestId("pr-detail.join-success.done").click();

      await page.getByTestId("pr-detail.participant.confirm-action").waitFor({
        state: "visible",
        timeout: 10_000,
      });
    });

    const slot = await probeLatestPartnerSlot({ pr, user: joiner });
    assert.equal(slot?.status, "JOINED");

    const phone = await probeUserPhone(joiner);
    assert.equal(phone?.phoneNumber, "+8613800138000");
  },
);

scenario("pr_detail_participant_confirms_slot", async (ctx) => {
  const creator = await givenUser("system-confirm-creator");
  const participant = await givenUser("system-confirm-participant");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 2,
    maxPartners: null,
    title: "System scenario confirmable partner request",
  });

  await bindScenarioWeChatOpenId({
    user: participant,
    openId: "system-confirm-participant-openid",
  });
  await joinThroughBackend({ prId: pr.id, token: participant.token });
  await configureOpenConfirmationWindow(pr);

  ctx.record("prId", pr.id);
  ctx.record("participantUserId", participant.user.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, participant);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.participant.confirm-action").click();
    await page.getByTestId("pr-detail.participant.check-in-action").waitFor({
      state: "visible",
      timeout: 10_000,
    });
  });

  const slot = await probeLatestPartnerSlot({ pr, user: participant });
  assert.equal(slot?.status, "CONFIRMED");
});

scenario(
  "pr_detail_check_in_opens_pending_feedback_questionnaire",
  async (ctx) => {
    const creator = await givenUser("system-checkin-feedback-creator");
    const participant = await givenUser("system-checkin-feedback-participant");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 2,
      maxPartners: null,
      title: "System scenario feedback check-in partner request",
    });
    const template = await givenFeedbackQuestionnaireTemplate({
      label: "system-checkin-feedback",
    });
    const questionnaire = await givenFeedbackQuestionnaireInstance({ template });

    await bindScenarioWeChatOpenId({
      user: participant,
      openId: "system-checkin-feedback-participant-openid",
    });
    await joinThroughBackend({ prId: pr.id, token: participant.token });
    await configureOpenConfirmationWindow(pr);

    ctx.record("prId", pr.id);
    ctx.record("participantUserId", participant.user.id);
    ctx.record("feedbackQuestionnaireInstanceId", questionnaire.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, participant);
      await installDeterministicShareSidecarStubs(page);

      await page.goto(`/pr/${pr.id}`);
      await page.getByTestId("pr-detail.participant.confirm-action").click();
      await page.getByTestId("pr-detail.participant.check-in-action").waitFor({
        state: "visible",
        timeout: 10_000,
      });

      await configureStartedEventWithFeedback({
        prId: pr.id,
        feedbackQuestionnaireInstanceId: questionnaire.id,
      });

      await page.reload();
      const checkInResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/pr/${pr.id}/check-in`) &&
          response.request().method() === "POST",
      );
      await page.getByTestId("pr-detail.participant.check-in-action").click();
      const checkInResponse = await checkInResponsePromise;
      assert.equal(checkInResponse.status(), 200);
      await page.getByTestId("pr-detail.feedback.submit").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await page.getByText("Taste rating").waitFor({
        state: "visible",
        timeout: 10_000,
      });
    });

    const slot = await probeLatestPartnerSlot({ pr, user: participant });
    assert.equal(slot?.status, "ATTENDED");
    assert.equal(slot?.didAttend, true);
  },
);

scenario(
  "pr_detail_check_in_submits_directly_when_feedback_questionnaire_absent",
  async (ctx) => {
    const creator = await givenUser("system-checkin-direct-creator");
    const participant = await givenUser("system-checkin-direct-participant");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 2,
      maxPartners: null,
      title: "System scenario direct check-in partner request",
    });

    await bindScenarioWeChatOpenId({
      user: participant,
      openId: "system-checkin-direct-participant-openid",
    });
    await joinThroughBackend({ prId: pr.id, token: participant.token });
    await configureOpenConfirmationWindow(pr);

    ctx.record("prId", pr.id);
    ctx.record("participantUserId", participant.user.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, participant);
      await installDeterministicShareSidecarStubs(page);

      await page.goto(`/pr/${pr.id}`);
      await page.getByTestId("pr-detail.participant.confirm-action").click();
      await page.getByTestId("pr-detail.participant.check-in-action").waitFor({
        state: "visible",
        timeout: 10_000,
      });

      await configureStartedEvent(pr);
      await page.reload();

      const checkInResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/pr/${pr.id}/check-in`) &&
          response.request().method() === "POST",
      );
      await page.getByTestId("pr-detail.participant.check-in-action").click();
      const checkInResponse = await checkInResponsePromise;
      assert.equal(checkInResponse.status(), 200);

      await page.getByText("愿意再参加").waitFor({
        state: "hidden",
        timeout: 1_000,
      });
      await page.getByText("暂时不考虑").waitFor({
        state: "hidden",
        timeout: 1_000,
      });
      await page.getByTestId("pr-detail.feedback.submit").waitFor({
        state: "hidden",
        timeout: 1_000,
      });
    });

    const slot = await probeLatestPartnerSlot({ pr, user: participant });
    assert.equal(slot?.status, "ATTENDED");
    assert.equal(slot?.didAttend, true);
  },
);

scenario(
  "pr_detail_disabled_confirmation_hides_confirm_and_allows_check_in",
  async (ctx) => {
    const creator = await givenUser("system-disabled-confirmation-creator");
    const participant = await givenUser(
      "system-disabled-confirmation-participant",
    );
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 2,
      maxPartners: null,
      title: "System scenario disabled confirmation partner request",
    });

    await bindScenarioWeChatOpenId({
      user: participant,
      openId: "system-disabled-confirmation-participant-openid",
    });
    await joinThroughBackend({ prId: pr.id, token: participant.token });
    await configureStartedEventWithDisabledConfirmation(pr);

    ctx.record("prId", pr.id);
    ctx.record("participantUserId", participant.user.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, participant);
      await installDeterministicShareSidecarStubs(page);

      await page.goto(`/pr/${pr.id}`);
      await page.getByTestId("pr-detail.participant.confirm-action").waitFor({
        state: "hidden",
        timeout: 10_000,
      });
      await page.getByTestId("pr-detail.participant.check-in-action").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      const checkInResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/pr/${pr.id}/check-in`) &&
          response.request().method() === "POST",
      );
      await page.getByTestId("pr-detail.participant.check-in-action").click();
      const checkInResponse = await checkInResponsePromise;
      assert.equal(checkInResponse.status(), 200);
    });

    const slot = await probeLatestPartnerSlot({ pr, user: participant });
    assert.equal(slot?.status, "ATTENDED");
  },
);

scenario(
  "pr_detail_waitlist_promotes_after_active_participant_exit",
  async (ctx) => {
    const creator = await givenUser("system-waitlist-creator");
    const activeJoiner = await givenUser("system-waitlist-active");
    const waitlister = await givenUser("system-waitlist-candidate");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "READY",
      title: "System scenario waitlist partner request",
    });

    const full = await joinThroughBackend({
      prId: pr.id,
      token: activeJoiner.token,
    });
    assert.equal(full.status, "FULL");

    ctx.record("prId", pr.id);
    ctx.record("activeJoinerUserId", activeJoiner.user.id);
    ctx.record("waitlisterUserId", waitlister.user.id);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, waitlister);
      await installDeterministicShareSidecarStubs(page);

      await page.goto(`/pr/${pr.id}`);
      await page.getByTestId("pr-detail.waitlist.open").click();
      await page.getByTestId("pr-detail.waitlist.confirm").click();
      await page.getByTestId("pr-detail.waitlist-success.subscriptions").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await page.getByTestId("pr-detail.waitlist-success.done").click();
      await page.getByTestId("pr-detail.waitlist.notice").waitFor({
        state: "visible",
        timeout: 10_000,
      });

      const pendingSlot = await probeLatestPartnerSlot({ pr, user: waitlister });
      assert.equal(pendingSlot?.status, "PENDING");

      await exitThroughBackend({
        prId: pr.id,
        token: activeJoiner.token,
      });

      await page.reload();
      await page.getByTestId("pr-detail.participant.confirm-action").waitFor({
        state: "visible",
        timeout: 10_000,
      });
    });

    const promotedSlot = await probeLatestPartnerSlot({ pr, user: waitlister });
    assert.equal(promotedSlot?.status, "JOINED");
  },
);
