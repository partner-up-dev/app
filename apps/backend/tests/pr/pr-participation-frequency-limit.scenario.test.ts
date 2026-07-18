import assert from "node:assert/strict";
import {
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
} from "../../src/domains/pr/contracts";
import { PRTypeConfigRepository } from "../../src/repositories/PRTypeConfigRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import {
  givenPRTypeConfig,
  givenPRTypeVisiblePR,
  type ScenarioPRType,
} from "../pr-discovery/_kit/builders/pr-type-config";
import { exitPR } from "./_kit/actions/exit";
import { joinPartnerRequest } from "./_kit/actions/join";
import { waitlistPR } from "./_kit/actions/waitlist";
import type { ScenarioPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";

type ProblemDetailsResponse = {
  code?: string;
};

type PRActionDetail = {
  partnerSection: {
    viewer: {
      canJoin: boolean;
      joinBlockedReason: string;
    };
  };
};

const FREQUENCY_LIMIT_CODE = "PR_TYPE_PARTICIPATION_FREQUENCY_LIMITED";
const prTypeConfigRepo = new PRTypeConfigRepository();

const buildTimeWindows = (): Array<[string, string]> =>
  Array.from({ length: 5 }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return [`2036-02-${day}T10:00:00.000Z`, `2036-02-${day}T11:00:00.000Z`];
  });

async function givenPRTypeFrequencyConfig(input: {
  prType: ScenarioPRType;
  timeWindows: Array<[string, string]>;
  intervalPrCount: number;
}): Promise<void> {
  const updated = await prTypeConfigRepo.updateByType(input.prType.type, {
    title: input.prType.title,
    description: null,
    locationPool: input.prType.locations,
    routePool: input.prType.routePool,
    timePoolConfig: {
      durationMinutes: 60,
      earliestLeadMinutes: null,
      startRules: input.timeWindows.map((window, index) => ({
        id: `frequency-start-${index}`,
        kind: "ABSOLUTE",
        startAt: window[0],
        description: null,
      })),
    },
    defaultMinPartners: 1,
    defaultMaxPartners: null,
    defaultNotes: null,
    defaultConfirmationEnabled: true,
    defaultConfirmationStartOffsetMinutes: DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
    defaultConfirmationEndOffsetMinutes: DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
    defaultJoinLockOffsetMinutes: DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
    meetingPoint: null,
    joinGateConfig: [],
    participationFrequencyLimit: { intervalPrCount: input.intervalPrCount },
    feedbackQuestionnaireTemplateId: null,
    locationMeetingPoints: {},
    coverImage: null,
    authoringCreationPolicy: "USER_AND_ADMIN",
    fullCapacityExpansionPolicy: "DISABLED",
    discoveryFormRatio: 50,
    discoveryCardRatio: 50,
    discoveryListRatio: 0,
  });
  assert.ok(updated);
}

async function givenLimitedPRs(input: {
  label: string;
  intervalPrCount: number;
  maxPartnersByIndex?: Map<number, number | null>;
}): Promise<ScenarioPartnerRequest[]> {
  const creator = await givenUser(`${input.label}-creator`);
  const timeWindows = buildTimeWindows();
  const prType = await givenPRTypeConfig({
    label: input.label,
    timeWindows,
    participationFrequencyLimit: {
      intervalPrCount: input.intervalPrCount,
    },
  });
  await givenPRTypeFrequencyConfig({
    prType,
    timeWindows,
    intervalPrCount: input.intervalPrCount,
  });

  return await Promise.all(
    timeWindows.map((timeWindow, index) =>
      givenPRTypeVisiblePR({
        creator,
        prType,
        title: `${input.label} PR ${index + 1}`,
        timeWindow,
        minPartners: 1,
        maxPartners: input.maxPartnersByIndex?.get(index) ?? null,
        expectedStatus: "OPEN",
      }),
    ),
  );
}

async function expectFrequencyLimited(response: Response): Promise<void> {
  const body = await expectJsonResponse<ProblemDetailsResponse>(response, 409);
  assert.equal(body.code, FREQUENCY_LIMIT_CODE);
}

async function getPRActionDetail(input: {
  pr: ScenarioPartnerRequest;
  user: Awaited<ReturnType<typeof givenUser>>;
}): Promise<PRActionDetail> {
  return await expectJsonResponse<PRActionDetail>(
    await requestJson(`/api/pr/${input.pr.id}`, {
      method: "GET",
      token: input.user.token,
    }),
    200,
  );
}

scenario("pr_type_frequency_limit_blocks_join_until_configured_pr_interval_passes", async (ctx) => {
  const user = await givenUser("frequency-join-candidate");
  const prs = await givenLimitedPRs({
    label: "frequency-join",
    intervalPrCount: 3,
  });
  const [firstPr, secondPr, , fourthPr, fifthPr] = prs;
  if (!firstPr || !secondPr || !fourthPr || !fifthPr) {
    throw new Error("Expected frequency scenario PRs");
  }

  ctx.record("firstPrId", firstPr.id);
  ctx.record("secondPrId", secondPr.id);
  ctx.record("fifthPrId", fifthPr.id);
  ctx.record("userId", user.user.id);

  await joinPartnerRequest({ pr: firstPr, user });

  await expectFrequencyLimited(
    await requestJson(`/api/pr/${secondPr.id}/join`, {
      method: "POST",
      token: user.token,
      body: {},
    }),
  );
  await expectFrequencyLimited(
    await requestJson(`/api/pr/${fourthPr.id}/join`, {
      method: "POST",
      token: user.token,
      body: {},
    }),
  );

  const detail = await getPRActionDetail({ pr: secondPr, user });
  assert.equal(detail.partnerSection.viewer.canJoin, false);
  assert.equal(detail.partnerSection.viewer.joinBlockedReason, "PARTICIPATION_FREQUENCY_LIMITED");

  const joined = await joinPartnerRequest({ pr: fifthPr, user });
  assert.equal(joined.myPartnerId !== null, true);
});

scenario(
  "pr_type_frequency_limit_blocks_waitlist_submission_but_ignores_pending_history",
  async (ctx) => {
    const user = await givenUser("frequency-waitlist-candidate");
    const filler = await givenUser("frequency-waitlist-filler");
    const prs = await givenLimitedPRs({
      label: "frequency-waitlist",
      intervalPrCount: 3,
      maxPartnersByIndex: new Map([[1, 2]]),
    });
    const [firstPr, secondPr] = prs;
    if (!firstPr || !secondPr) {
      throw new Error("Expected frequency waitlist scenario PRs");
    }

    ctx.record("firstPrId", firstPr.id);
    ctx.record("secondPrId", secondPr.id);
    ctx.record("userId", user.user.id);

    await joinPartnerRequest({ pr: firstPr, user });
    await joinPartnerRequest({ pr: secondPr, user: filler });

    await expectFrequencyLimited(
      await requestJson(`/api/pr/${secondPr.id}/waitlist`, {
        method: "POST",
        token: user.token,
        body: {
          alternativePrReminderOptIn: false,
        },
      }),
    );

    await exitPR({ pr: firstPr, user });
    const waitlisted = await waitlistPR({ pr: secondPr, user });
    assert.equal(waitlisted.isViewerWaitlisted, true);

    const thirdPr = prs[2];
    if (!thirdPr) {
      throw new Error("Expected third PR");
    }
    const joined = await joinPartnerRequest({ pr: thirdPr, user });
    assert.equal(joined.myPartnerId !== null, true);
  },
);

scenario("pr_type_frequency_limit_ignores_exited_or_released_history", async (ctx) => {
  const user = await givenUser("frequency-exit-candidate");
  const prs = await givenLimitedPRs({
    label: "frequency-exit",
    intervalPrCount: 3,
  });
  const [firstPr, secondPr] = prs;
  if (!firstPr || !secondPr) {
    throw new Error("Expected frequency exit scenario PRs");
  }

  ctx.record("firstPrId", firstPr.id);
  ctx.record("secondPrId", secondPr.id);
  ctx.record("userId", user.user.id);

  await joinPartnerRequest({ pr: firstPr, user });
  await exitPR({ pr: firstPr, user });

  const joined = await joinPartnerRequest({ pr: secondPr, user });
  assert.equal(joined.myPartnerId !== null, true);
});

scenario("pr_type_frequency_limit_counts_prior_type_prs_after_policy_is_enabled", async (ctx) => {
  const creator = await givenUser("frequency-retrofit-creator");
  const user = await givenUser("frequency-retrofit-candidate");
  const [firstWindow, secondWindow] = buildTimeWindows();
  if (!firstWindow || !secondWindow) {
    throw new Error("Expected retrofit time windows");
  }
  const prType = await givenPRTypeConfig({
    label: "frequency-retrofit",
    timeWindows: [firstWindow, secondWindow],
  });
  const firstPr = await givenPRTypeVisiblePR({
    creator,
    prType,
    title: "frequency retrofit PR 1",
    timeWindow: firstWindow,
    minPartners: 1,
    maxPartners: null,
    expectedStatus: "OPEN",
  });
  const secondPr = await givenPRTypeVisiblePR({
    creator,
    prType,
    title: "frequency retrofit PR 2",
    timeWindow: secondWindow,
    minPartners: 1,
    maxPartners: null,
    expectedStatus: "OPEN",
  });

  ctx.record("type", prType.type);
  ctx.record("firstPrId", firstPr.id);
  ctx.record("secondPrId", secondPr.id);
  ctx.record("userId", user.user.id);

  await joinPartnerRequest({ pr: firstPr, user });

  await givenPRTypeFrequencyConfig({
    prType,
    timeWindows: [firstWindow, secondWindow],
    intervalPrCount: 2,
  });

  await expectFrequencyLimited(
    await requestJson(`/api/pr/${secondPr.id}/join`, {
      method: "POST",
      token: user.token,
      body: {},
    }),
  );
});
