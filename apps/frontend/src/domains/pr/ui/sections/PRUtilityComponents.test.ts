// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { createApp, nextTick, type App, type Component } from "vue";
import type { PRDetailView } from "@/domains/pr/model/types";
import type { PRShareData } from "@/domains/share/model/types";
import PRBetaGroupAction from "./PRBetaGroupAction.vue";
import PRMessageThreadAction from "./PRMessageThreadAction.vue";
import PRNotificationSubscriptionsSection from "./PRNotificationSubscriptionsSection.vue";
import PRPageEventPlazaEntry from "./PRPageEventPlazaEntry.vue";
import PRShareAction from "./PRShareAction.vue";
import PRStudySprintPomodoroAction from "./PRStudySprintPomodoroAction.vue";

const testState = vi.hoisted(() => ({
  routerPush: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: testState.routerPush,
  }),
}));

vi.mock("@/shared/telemetry/track", () => ({
  trackEvent: testState.trackEvent,
}));

vi.mock("@/shared/ui/overlay/useBodyScrollLock", () => ({
  useBodyScrollLock: vi.fn(),
}));

vi.mock("@/shared/ui/overlay/Modal.vue", () => ({
  default: {
    name: "Modal",
    props: ["open"],
    template: '<div v-if="open" data-testid="modal"><slot /></div>',
  },
}));

vi.mock("@/shared/ui/overlay/BottomDrawer.vue", () => ({
  default: {
    name: "BottomDrawer",
    props: ["open"],
    template: '<div v-if="open" data-testid="bottom-drawer"><slot /></div>',
  },
}));

vi.mock("@/domains/event/ui/primitives/AnchorEventBetaGroupQrPanel.vue", () => ({
  default: {
    name: "AnchorEventBetaGroupQrPanel",
    template: '<div data-testid="beta-group-panel" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRShareSection.vue", () => ({
  default: {
    name: "PRShareSection",
    template: '<div data-testid="share-section" />',
  },
}));

vi.mock("@/shared/ui/sections/APRNotificationSubscriptions.vue", () => ({
  default: {
    name: "APRNotificationSubscriptions",
    template: '<div data-testid="notification-panel" />',
  },
}));

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
  testState.routerPush.mockReset();
  testState.trackEvent.mockReset();
});

describe("PR utility components", () => {
  test("beta group action renders from QR code and tracks modal open", async () => {
    const host = await mountComponent(PRBetaGroupAction, {
      pr: buildPRDetail({
        betaGroupQrCode: "https://example.test/qr.png",
      }),
    });

    const action = getByTestId(host, "pr-detail.beta-group.open");
    action.click();
    await nextTick();

    expect(hasTestId(host, "beta-group-panel")).toBe(true);
    expect(testState.trackEvent).toHaveBeenCalledWith(
      "pr_secondary_action_click",
      {
        prId: 123,
        actionType: "JOIN_BETA_GROUP",
      },
    );
  });

  test("beta group action hides without QR code", async () => {
    const host = await mountComponent(PRBetaGroupAction, {
      pr: buildPRDetail({
        betaGroupQrCode: null,
      }),
    });

    expect(hasTestId(host, "pr-detail.beta-group.open")).toBe(false);
  });

  test("message thread action renders for event participants and routes to messages", async () => {
    const host = await mountComponent(PRMessageThreadAction, {
      pr: buildPRDetail({
        reminderSupported: true,
        viewer: {
          isParticipant: true,
        },
      }),
    });

    getByTestId(host, "pr-detail.message-thread.open").click();

    expect(testState.routerPush).toHaveBeenCalledWith("/pr/123/messages");
  });

  test("message thread action hides for non-participants", async () => {
    const host = await mountComponent(PRMessageThreadAction, {
      pr: buildPRDetail({
        reminderSupported: true,
        viewer: {
          isParticipant: false,
        },
      }),
    });

    expect(hasTestId(host, "pr-detail.message-thread.open")).toBe(false);
  });

  test("share action opens the share drawer from page-provided share context", async () => {
    const host = await mountComponent(PRShareAction, {
      pr: buildPRDetail({}),
      shareUrl: "https://example.test/pr/123",
      spmRouteKey: "pr",
      prShareData: buildPRShareData(),
    });

    getByTestId(host, "pr-detail.share.open").click();
    await nextTick();

    expect(hasTestId(host, "share-section")).toBe(true);
  });

  test("event plaza entry renders for event-backed PRs and tracks click", async () => {
    const host = await mountComponent(PRPageEventPlazaEntry, {
      pr: buildPRDetail({
        reminderSupported: true,
      }),
    });

    getByTestId(host, "pr-detail.event-plaza.open").click();

    expect(testState.trackEvent).toHaveBeenCalledWith(
      "pr_secondary_action_click",
      {
        prId: 123,
        actionType: "EVENT_PLAZA_ENTRY",
      },
    );
  });

  test("notification subscriptions render for visible participant reminders", async () => {
    const host = await mountComponent(PRNotificationSubscriptionsSection, {
      pr: buildPRDetail({
        reminderSupported: true,
        reminderVisible: true,
        viewer: {
          isParticipant: true,
        },
      }),
    });

    expect(hasTestId(host, "pr-detail.notification-subscriptions")).toBe(true);
    expect(hasTestId(host, "notification-panel")).toBe(true);
  });

  test("study sprint pomodoro action renders for active study sprint participants and routes with duration", async () => {
    const host = await mountComponent(PRStudySprintPomodoroAction, {
      pr: buildPRDetail({
        type: "STUDY_SPRINT",
        status: "ACTIVE",
        time: ["2026-06-02T10:00:00.000Z", "2026-06-02T10:45:00.000Z"],
        viewer: {
          isParticipant: true,
        },
      }),
    });

    const action = getByTestId(host, "pr-detail.study-sprint-pomodoro.open");
    expect(action.textContent).toContain("开始一起专注45分钟");
    action.click();

    expect(testState.routerPush).toHaveBeenCalledWith({
      name: "pr-study-sprint",
      params: {
        id: "123",
      },
      query: {
        duration: "45",
      },
    });
  });

  test("study sprint pomodoro action is disabled before active status", async () => {
    const host = await mountComponent(PRStudySprintPomodoroAction, {
      pr: buildPRDetail({
        type: "STUDY_SPRINT",
        status: "READY",
        viewer: {
          isParticipant: true,
        },
      }),
    });

    const action = getByTestId(host, "pr-detail.study-sprint-pomodoro.open");
    expect(action.hasAttribute("disabled")).toBe(true);
    expect(
      hasTestId(host, "pr-detail.study-sprint-pomodoro.disabled-hint"),
    ).toBe(true);
  });

  test("study sprint pomodoro action hides for non-participants and other PR types", async () => {
    const nonParticipantHost = await mountComponent(PRStudySprintPomodoroAction, {
      pr: buildPRDetail({
        type: "STUDY_SPRINT",
        viewer: {
          isParticipant: false,
        },
      }),
    });
    const otherTypeHost = await mountComponent(PRStudySprintPomodoroAction, {
      pr: buildPRDetail({
        type: "徒步",
        viewer: {
          isParticipant: true,
        },
      }),
    });

    expect(
      hasTestId(nonParticipantHost, "pr-detail.study-sprint-pomodoro.open"),
    ).toBe(false);
    expect(
      hasTestId(otherTypeHost, "pr-detail.study-sprint-pomodoro.open"),
    ).toBe(false);
  });
});

const mountComponent = async (
  component: Component,
  props: Record<string, unknown>,
): Promise<HTMLElement> => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(component, props);
  app.component("router-link", {
    props: ["to"],
    emits: ["click"],
    template: '<a href="#" @click="$emit(\'click\', $event)"><slot /></a>',
  });
  app.mount(host);
  mountedApps.push({ app, host });
  await nextTick();
  return host;
};

const hasTestId = (host: HTMLElement, testId: string): boolean =>
  host.querySelector(`[data-testid="${testId}"]`) !== null;

const getByTestId = (host: HTMLElement, testId: string): HTMLElement => {
  const element = host.querySelector(`[data-testid="${testId}"]`);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing test id: ${testId}`);
  }
  return element;
};

type ViewerOverride = Partial<PRDetailView["partnerSection"]["viewer"]>;

const buildPRDetail = ({
  betaGroupQrCode = null,
  reminderSupported = false,
  reminderVisible = false,
  status = "OPEN",
  time = [null, null],
  type = "徒步",
  viewer = {},
}: {
  betaGroupQrCode?: string | null;
  reminderSupported?: boolean;
  reminderVisible?: boolean;
  status?: PRDetailView["status"];
  time?: PRDetailView["core"]["time"];
  type?: string;
  viewer?: ViewerOverride;
}): PRDetailView =>
  ({
    id: 123,
    title: "周末徒步",
    status,
    createdBy: 10,
    core: {
      type,
      time,
      location: "西湖",
      route: null,
      placeDisplayName: "西湖",
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
        supported: reminderSupported,
        visible: reminderVisible,
      },
      confirmation: {
        enabled: false,
      },
      timeline: null,
    },
    share: {
      canonical: {
        title: "周末徒步",
        description: "一起走",
        canonicalPath: "/pr/123",
        defaultImagePath: "/share.png",
        revision: "1",
      },
      xiaohongshuPoster: null,
      wechatThumbnail: null,
    },
    feedbackQuestionnaire: null,
    anchorEventContext:
      betaGroupQrCode === null
        ? null
        : {
            id: 77,
            title: "西湖活动",
            betaGroupQrCode,
          },
  }) as unknown as PRDetailView;

const buildPRShareData = (): PRShareData => ({
  title: "周末徒步",
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
  canonicalShare: {
    title: "周末徒步",
    description: "一起走",
    canonicalPath: "/pr/123",
    defaultImagePath: "/share.png",
    revision: "1",
  },
  xiaohongshuPoster: null,
  wechatThumbnail: null,
});
