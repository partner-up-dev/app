import assert from "node:assert/strict";
import type { Page } from "playwright";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { withScenarioPage } from "../_infra/browser/browser";
import {
  expectBackendJsonResponse,
  requestBackendJson,
} from "../_infra/http/backend";
import { scenario } from "../_infra/scenario/scenario";
import {
  givenAnchorEvent,
  givenAnchorEventVisiblePR,
  setAnchorEventLandingRollout,
  type ScenarioAnchorEvent,
} from "../../../apps/backend/tests/anchor-event/_kit/builders/anchor-events";
import {
  givenAdminUser,
  givenUser,
} from "../../../apps/backend/tests/pr-core/_kit/builders/users";

const LIST_ONLY = {
  FORM: 0,
  CARD_RICH: 0,
  LIST: 100,
};

type AnchorEventFunnelResponse = {
  summary: {
    journeys: number;
    prEntryJourneys: number;
    prCommitmentJourneys: number;
    joinSuccess: number;
  };
  modes: Array<{
    renderedMode: "FORM" | "CARD_RICH" | "LIST";
    journeys: number;
    prEntryJourneys: number;
    prCommitmentJourneys: number;
    joinSuccess: number;
  }>;
  funnels: Array<{
    renderedMode: "FORM" | "CARD_RICH" | "LIST";
    steps: Array<{
      stepKey: string;
      journeyCount: number;
    }>;
  }>;
  outcomes: Array<{
    renderedMode: "FORM" | "CARD_RICH" | "LIST";
    commitmentType: "create" | "join" | "waitlist";
    actionResult: "success" | "blocked" | "failure";
    journeyCount: number;
  }>;
};

const forceListMode = async (event: ScenarioAnchorEvent): Promise<void> => {
  await setAnchorEventLandingRollout({
    eventId: event.id,
    ratios: LIST_ONLY,
    assignmentRevision: 1,
  });
};

const expectListMode = async (page: Page, prTitle: string): Promise<void> => {
  await page.getByTestId("anchor-event-list-mode.surface").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  const prList = page.getByTestId("anchor-event-list-mode.pr-list");
  await prList.waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await prList.getByText(prTitle).waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

const closeJoinSuccessPrompt = async (page: Page): Promise<void> => {
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
};

const waitForJoinResultDetail = async (
  page: Page,
  prId: number,
): Promise<void> => {
  await page.waitForURL(
    (url) =>
      url.pathname === `/pr/${prId}` &&
      url.searchParams.get("entry") === "join",
    { timeout: 20_000 },
  );
  await page.getByTestId("pr-detail.participant.confirm-action").waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const readAnchorEventFunnel = async (input: {
  adminToken: string;
  endAt: string;
  eventId: number;
  startAt: string;
}): Promise<AnchorEventFunnelResponse> => {
  const query = new URLSearchParams({
    startAt: input.startAt,
    endAt: input.endAt,
    eventId: String(input.eventId),
    renderedMode: "LIST",
  });
  return await expectBackendJsonResponse<AnchorEventFunnelResponse>(
    await requestBackendJson(`/api/analytics/anchor-event-funnel?${query}`, {
      token: input.adminToken,
    }),
    200,
  );
};

const waitForAnchorEventFunnel = async (input: {
  adminToken: string;
  eventId: number;
  startAt: string;
}): Promise<AnchorEventFunnelResponse> => {
  const deadline = Date.now() + 20_000;
  let latest: AnchorEventFunnelResponse | null = null;

  while (Date.now() < deadline) {
    latest = await readAnchorEventFunnel({
      ...input,
      endAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const listMode = latest.modes.find((row) => row.renderedMode === "LIST");
    if (
      latest.summary.journeys === 1 &&
      latest.summary.prEntryJourneys === 1 &&
      latest.summary.prCommitmentJourneys === 1 &&
      latest.summary.joinSuccess === 1 &&
      listMode?.prCommitmentJourneys === 1
    ) {
      return latest;
    }
    await sleep(500);
  }

  throw new Error(
    `Timed out waiting for analytics funnel aggregation: ${JSON.stringify(
      latest,
    )}`,
  );
};

scenario("anchor_event_list_mode_join_appears_in_analytics_funnel", async (ctx) => {
  const creator = await givenUser("system-analytics-funnel-creator");
  const visitor = await givenUser("system-analytics-funnel-visitor");
  const admin = await givenAdminUser("system-analytics-funnel-reader");
  const event = await givenAnchorEvent({ label: "analytics-funnel-list-join" });
  const prTitle = "System Analytics Funnel matched PR";
  const pr = await givenAnchorEventVisiblePR({
    creator,
    event,
    title: prTitle,
  });
  await forceListMode(event);

  const sourceSpm = "scenario.analytics.list_join";
  const startedAt = new Date(Date.now() - 60_000).toISOString();

  ctx.record("eventId", event.id);
  ctx.record("prId", pr.id);
  ctx.record("visitorUserId", visitor.user.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, visitor);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/?spm=${sourceSpm}`);
    await page.goto(`/e/${event.id}`);
    await expectListMode(page, prTitle);
    await page.getByTestId("anchor-event-list-mode.pr-list").getByText(prTitle).click();
    await page.waitForURL((url) => url.pathname === `/pr/${pr.id}`, {
      timeout: 20_000,
    });
    await page.getByTestId("pr-detail.join.open").click();
    await page.getByTestId("pr-detail.join.confirm").click();
    await closeJoinSuccessPrompt(page);
    await waitForJoinResultDetail(page, pr.id);
    await sleep(2_500);
  });

  const funnel = await waitForAnchorEventFunnel({
    adminToken: admin.token,
    eventId: event.id,
    startAt: startedAt,
  });
  const listMode = funnel.modes.find((row) => row.renderedMode === "LIST");
  const listFunnel = funnel.funnels.find((row) => row.renderedMode === "LIST");
  const commitmentStep = listFunnel?.steps.find(
    (step) => step.stepKey === "pr_commitment_result",
  );
  const joinOutcome = funnel.outcomes.find(
    (row) =>
      row.renderedMode === "LIST" &&
      row.commitmentType === "join" &&
      row.actionResult === "success",
  );
  assert.equal(listMode?.journeys, 1);
  assert.equal(listMode?.prEntryJourneys, 1);
  assert.equal(listMode?.prCommitmentJourneys, 1);
  assert.equal(listMode?.joinSuccess, 1);
  assert.equal(commitmentStep?.journeyCount, 1);
  assert.equal(joinOutcome?.journeyCount, 1);
});
