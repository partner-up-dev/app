import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import {
  expectJsonResponse,
  requestJson,
} from "../_infra/http/backend-app";
import {
  givenAnchorEvent,
  givenAnchorEventVisiblePR,
} from "../anchor-event/_kit/builders/anchor-events";
import {
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
} from "../../src/domains/pr/services";
import { AnchorEventRepository } from "../../src/repositories/AnchorEventRepository";
import { exitPR } from "./_kit/actions/exit";
import { joinPartnerRequest } from "./_kit/actions/join";
import { waitlistPR } from "./_kit/actions/waitlist";
import { givenUser } from "./_kit/builders/users";
import type { ScenarioPartnerRequest } from "./_kit/builders/partner-requests";

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

const FREQUENCY_LIMIT_CODE =
  "ANCHOR_EVENT_PARTICIPATION_FREQUENCY_LIMITED";
const anchorEventRepo = new AnchorEventRepository();

const buildTimeWindows = (): Array<[string, string]> =>
  Array.from({ length: 5 }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return [
      `2036-02-${day}T10:00:00.000Z`,
      `2036-02-${day}T11:00:00.000Z`,
    ];
  });

async function givenLimitedEventPRs(input: {
  label: string;
  intervalPrCount: number;
  maxPartnersByIndex?: Map<number, number | null>;
}): Promise<ScenarioPartnerRequest[]> {
  const creator = await givenUser(`${input.label}-creator`);
  const timeWindows = buildTimeWindows();
  const event = await givenAnchorEvent({
    label: input.label,
    timeWindows,
    participationFrequencyLimit: {
      intervalPrCount: input.intervalPrCount,
    },
  });

  return await Promise.all(
    timeWindows.map((timeWindow, index) =>
      givenAnchorEventVisiblePR({
        creator,
        event,
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

scenario(
  "anchor_event_frequency_limit_blocks_join_until_configured_pr_interval_passes",
  async (ctx) => {
    const user = await givenUser("frequency-join-candidate");
    const prs = await givenLimitedEventPRs({
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
    assert.equal(
      detail.partnerSection.viewer.joinBlockedReason,
      "PARTICIPATION_FREQUENCY_LIMITED",
    );

    const joined = await joinPartnerRequest({ pr: fifthPr, user });
    assert.equal(joined.myPartnerId !== null, true);
  },
);

scenario(
  "anchor_event_frequency_limit_blocks_waitlist_submission_but_ignores_pending_history",
  async (ctx) => {
    const user = await givenUser("frequency-waitlist-candidate");
    const filler = await givenUser("frequency-waitlist-filler");
    const prs = await givenLimitedEventPRs({
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

scenario(
  "anchor_event_frequency_limit_ignores_exited_or_released_history",
  async (ctx) => {
    const user = await givenUser("frequency-exit-candidate");
    const prs = await givenLimitedEventPRs({
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
  },
);

scenario(
  "anchor_event_frequency_limit_counts_prior_type_prs_after_policy_is_enabled",
  async (ctx) => {
    const creator = await givenUser("frequency-retrofit-creator");
    const user = await givenUser("frequency-retrofit-candidate");
    const [firstWindow, secondWindow] = buildTimeWindows();
    if (!firstWindow || !secondWindow) {
      throw new Error("Expected retrofit time windows");
    }
    const event = await givenAnchorEvent({
      label: "frequency-retrofit",
      timeWindows: [firstWindow, secondWindow],
    });
    const firstPr = await givenAnchorEventVisiblePR({
      creator,
      event,
      title: "frequency retrofit PR 1",
      timeWindow: firstWindow,
      minPartners: 1,
      maxPartners: null,
      expectedStatus: "OPEN",
    });
    const secondPr = await givenAnchorEventVisiblePR({
      creator,
      event,
      title: "frequency retrofit PR 2",
      timeWindow: secondWindow,
      minPartners: 1,
      maxPartners: null,
      expectedStatus: "OPEN",
    });

    ctx.record("eventId", event.id);
    ctx.record("firstPrId", firstPr.id);
    ctx.record("secondPrId", secondPr.id);
    ctx.record("userId", user.user.id);

    await joinPartnerRequest({ pr: firstPr, user });

    const updated = await anchorEventRepo.update(event.id, {
      timePoolConfig: {
        durationMinutes: 60,
        earliestLeadMinutes: null,
        startRules: [
          {
            id: "retrofit-current-window",
            kind: "ABSOLUTE",
            startAt: secondWindow[0],
            description: null,
          },
        ],
      },
      defaultConfirmationStartOffsetMinutes:
        DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
      defaultConfirmationEndOffsetMinutes:
        DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
      defaultJoinLockOffsetMinutes: DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
      participationFrequencyLimit: {
        intervalPrCount: 2,
      },
    });
    assert.notEqual(updated, null);

    await expectFrequencyLimited(
      await requestJson(`/api/pr/${secondPr.id}/join`, {
        method: "POST",
        token: user.token,
        body: {},
      }),
    );
  },
);
