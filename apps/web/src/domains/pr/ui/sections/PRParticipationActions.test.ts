// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { type App, type Component, createApp, nextTick, ref } from "vue";
import type { PRJoinEntryContext } from "@/domains/pr/model/pr-join-entry-context";
import type { PRDetailView } from "@/domains/pr/model/types";
import PRCheckInFeedbackActions from "./PRCheckInFeedbackActions.vue";
import PRConfirmationAction from "./PRConfirmationAction.vue";
import PRExitAction from "./PRExitAction.vue";
import PRJoinAction from "./PRJoinAction.vue";
import PRWaitlistActions from "./PRWaitlistActions.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/shared/telemetry/track", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/domains/pr/queries/usePRActions", () => {
  const createMutation = () => ({
    isPending: ref(false),
    error: ref(null),
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  });

  return {
    useCancelWaitlistPR: createMutation,
    useExitPR: createMutation,
    useJoinPR: createMutation,
    useWaitlistPR: createMutation,
  };
});

vi.mock("@/domains/pr/use-cases/usePRAttendanceActions", () => ({
  usePRAttendanceActions: () => ({
    canConfirm: ref(true),
    canCheckIn: ref(true),
    confirmPending: ref(false),
    checkInPending: ref(false),
    handleConfirmSlot: vi.fn(),
    submitCheckIn: vi.fn(),
  }),
}));

vi.mock("@/domains/feedback/queries/useSubmitFeedbackQuestionnaire", () => ({
  useSubmitFeedbackQuestionnaire: () => ({
    isPending: ref(false),
    mutateAsync: vi.fn(),
  }),
}));

vi.mock("@/domains/pr/ui/composites/PRJoinGates.vue", () => ({
  default: {
    name: "PRJoinGates",
    template: '<div data-testid="join-gates" />',
  },
}));

vi.mock("@/domains/pr/ui/composites/PRJoinSuccessPrompt.vue", () => ({
  default: {
    name: "PRJoinSuccessPrompt",
    template: '<div data-testid="join-success-prompt" />',
  },
}));

vi.mock("@/domains/pr/ui/composites/PRWaitlistSuccessPrompt.vue", () => ({
  default: {
    name: "PRWaitlistSuccessPrompt",
    template: '<div data-testid="waitlist-success-prompt" />',
  },
}));

vi.mock("./PRFeedbackQuestionnaireModal.vue", () => ({
  default: {
    name: "PRFeedbackQuestionnaireModal",
    props: ["open"],
    template: '<div v-if="open" data-testid="feedback-modal" />',
  },
}));

const entryContext: PRJoinEntryContext = {
  joinEntrySurface: "pr_detail",
};

const mountedApps: Array<{
  app: App<Element>;
  host: HTMLElement;
}> = [];

afterEach(() => {
  for (const mounted of mountedApps.splice(0)) {
    mounted.app.unmount();
    mounted.host.remove();
  }
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("PR participation action components", () => {
  test("join component renders join for joinable visitors", async () => {
    const host = await mountComponent(PRJoinAction, {
      pr: buildPRDetail({
        viewer: {
          canJoin: true,
        },
      }),
      entrySurface: entryContext.joinEntrySurface,
    });

    expect(hasTestId(host, "pr-detail.join.open")).toBe(true);
  });

  test("exit component renders exit for participants", async () => {
    const host = await mountComponent(PRExitAction, {
      pr: buildPRDetail({
        viewer: {
          isParticipant: true,
          canExit: true,
        },
      }),
    });

    expect(hasTestId(host, "pr-detail.exit.open")).toBe(true);
  });

  test("waitlist component renders waitlist for waitlistable visitors", async () => {
    const host = await mountComponent(PRWaitlistActions, {
      pr: buildPRDetail({
        viewer: {
          canWaitlist: true,
        },
      }),
      joinEntryContext: entryContext,
    });

    expect(hasTestId(host, "pr-detail.waitlist.open")).toBe(true);
  });

  test("waitlist component opens the waitlist gate modal from the trigger", async () => {
    const host = await mountComponent(PRWaitlistActions, {
      pr: buildPRDetail({
        viewer: {
          canWaitlist: true,
        },
      }),
      joinEntryContext: entryContext,
    });

    const trigger = host.querySelector<HTMLButtonElement>(
      '[data-testid="pr-detail.waitlist.open"]',
    );
    trigger?.click();
    await nextTick();

    expect(hasTestId(document.body, "pr-detail.waitlist.alternative-reminder")).toBe(true);
    expect(hasTestId(document.body, "join-gates")).toBe(true);
  });

  test("waitlist component renders notice and cancel for waitlisted viewers", async () => {
    const host = await mountComponent(PRWaitlistActions, {
      pr: buildPRDetail({
        viewer: {
          isWaitlisted: true,
          waitlistRank: 2,
        },
      }),
      joinEntryContext: entryContext,
    });

    expect(hasTestId(host, "pr-detail.waitlist.notice")).toBe(true);
    expect(hasTestId(host, "pr-detail.waitlist.cancel")).toBe(true);
    expect(hasTestId(host, "pr-detail.waitlist.open")).toBe(false);
  });

  test("waitlist component hides waitlist trigger for participants", async () => {
    const host = await mountComponent(PRWaitlistActions, {
      pr: buildPRDetail({
        viewer: {
          isParticipant: true,
          canWaitlist: true,
        },
      }),
      joinEntryContext: entryContext,
    });

    expect(hasTestId(host, "pr-detail.waitlist.open")).toBe(false);
  });

  test("confirmation component renders confirm for joined participants", async () => {
    const host = await mountComponent(PRConfirmationAction, {
      pr: buildPRDetail({
        confirmationEnabled: true,
        viewer: {
          isParticipant: true,
          canConfirm: true,
          slotState: "JOINED",
        },
      }),
    });

    expect(hasTestId(host, "pr-detail.participant.confirm-action")).toBe(true);
  });

  test("check-in component renders check-in for confirmed participants", async () => {
    const host = await mountComponent(PRCheckInFeedbackActions, {
      pr: buildPRDetail({
        viewer: {
          isParticipant: true,
          canCheckIn: true,
          slotState: "CONFIRMED",
        },
      }),
    });

    expect(hasTestId(host, "pr-detail.participant.check-in-action")).toBe(true);
  });

  test("check-in component renders feedback retry for attended participants", async () => {
    const host = await mountComponent(PRCheckInFeedbackActions, {
      pr: buildPRDetail({
        feedbackPending: true,
        viewer: {
          isParticipant: true,
          slotState: "ATTENDED",
        },
      }),
    });

    expect(hasTestId(host, "pr-detail.feedback.open")).toBe(true);
  });
});

const mountComponent = async (
  component: Component,
  props: Record<string, unknown>,
): Promise<HTMLElement> => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(component, props);
  app.mount(host);
  mountedApps.push({ app, host });
  await nextTick();
  return host;
};

const hasTestId = (host: HTMLElement, testId: string): boolean =>
  host.querySelector(`[data-testid="${testId}"]`) !== null;

type ViewerOverride = Partial<PRDetailView["partnerSection"]["viewer"]>;

const buildPRDetail = ({
  viewer = {},
  confirmationEnabled = false,
  feedbackPending = false,
}: {
  viewer?: ViewerOverride;
  confirmationEnabled?: boolean;
  feedbackPending?: boolean;
}): PRDetailView =>
  ({
    id: 123,
    title: "周末徒步",
    status: "OPEN",
    createdBy: 10,
    core: {
      type: "徒步",
      time: [null, null],
      location: "西湖",
      route: null,
      minPartners: null,
      maxPartners: null,
      partners: [],
      budget: null,
      preferences: [],
      notes: null,
      meetingPoint: null,
    },
    partnerSection: {
      viewer: {
        isCreator: false,
        isParticipant: false,
        isWaitlisted: false,
        canJoin: false,
        canWaitlist: false,
        canExit: false,
        canConfirm: false,
        canCheckIn: false,
        slotState: null,
        releasedSlot: null,
        waitlistRank: null,
        joinBlockedReason: "NOT_JOINABLE_STATUS",
        waitlistBlockedReason: null,
        confirmBlockedReason: null,
        checkInBlockedReason: null,
        exitBlockedReason: null,
        ...viewer,
      },
      reminder: {
        supported: false,
      },
      confirmation: {
        enabled: confirmationEnabled,
      },
      timeline: {
        confirmationStartAt: null,
        confirmationEndAt: null,
        startAt: null,
      },
    },
    feedbackQuestionnaire: feedbackPending
      ? {
          instanceId: 1,
          responseState: {
            status: "NOT_SUBMITTED",
          },
        }
      : null,
  }) as unknown as PRDetailView;
