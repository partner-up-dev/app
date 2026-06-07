// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { createApp, nextTick, type App } from "vue";
import type { PRRoute, PRStatus } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import { derivePRPairingIdentity } from "@/domains/pr/model/pr-pairing-code";
import PRPage from "./PRPage.vue";

const testState = vi.hoisted(() => ({
  detail: undefined as PRDetailView | undefined,
  routeQuery: {} as Record<string, unknown>,
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("vue-i18n", () => ({
  createI18n: () => ({
    global: {
      t: (key: string) => key,
    },
  }),
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === "prPage.pairingCodeEntry.action") {
        return `配对码 ${String(params?.code ?? "")}`;
      }
      return key;
    },
  }),
}));

vi.mock("vue-router", () => ({
  RouterLink: {
    name: "RouterLink",
    props: ["to"],
    template: "<a><slot /></a>",
  },
  useRoute: () => ({
    query: testState.routeQuery,
  }),
  useRouter: () => ({
    back: vi.fn(),
    replace: testState.routerReplace,
    push: testState.routerPush,
  }),
}));

vi.mock("@/domains/pr/queries/usePRDetail", async () => {
  const { computed, ref } = await vi.importActual<typeof import("vue")>("vue");

  return {
    usePRDetail: () => ({
      data: computed(() => testState.detail),
      isLoading: ref(false),
      error: ref<Error | null>(null),
      refetch: testState.refetch,
    }),
  };
});

vi.mock("@/domains/pr/queries/usePRActions", () => {
  const createMutation = () => ({
    isPending: { value: false },
    error: { value: null },
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  });

  return {
    useUpdatePRContent: createMutation,
    useUpdatePRStatus: createMutation,
  };
});

vi.mock("@/domains/pr/queries/usePRCreate", () => ({
  useCreatePRFromStructured: () => ({
    isPending: { value: false },
    error: { value: null },
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/domains/pr/queries/usePRPublish", () => ({
  usePublishPR: () => ({
    isPending: { value: false },
    error: { value: null },
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/domains/pr/routing/usePRRouteId", async () => {
  const { computed } = await vi.importActual<typeof import("vue")>("vue");

  return {
    usePRRouteId: () => computed(() => 123),
  };
});

vi.mock("@/domains/pr/use-cases/usePRDetailHead", () => ({
  usePRDetailHead: vi.fn(),
}));

vi.mock("@/domains/pr/use-cases/usePRRouteShareDescriptor", () => ({
  usePRRouteShareDescriptor: () => ({}),
}));

vi.mock("@/domains/pr/use-cases/usePRShareContext", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");

  return {
    usePRShareContext: () => ({
      shareUrl: ref("https://example.test/pr/123"),
      spmRouteKey: ref("pr"),
      prShareData: ref({}),
    }),
  };
});

vi.mock("@/domains/share/use-cases/route-share-controller", () => ({
  useRouteShareDescriptorRegistration: vi.fn(),
}));

vi.mock("@/processes/wechat/pending-wechat-action", () => ({
  clearPendingWeChatAction: vi.fn(),
  readPendingWeChatAction: () => null,
}));

vi.mock("@/processes/route-handoff/useMatchedPRHandoff", () => ({
  useMatchedPRHandoff: () => ({
    state: { phase: "idle" },
    shouldHideTargetForPR: () => false,
    isActiveForPR: () => false,
    registerTargetRect: vi.fn(),
  }),
}));

vi.mock("@/shared/telemetry/track", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/shared/auth/useUserSessionStore", () => ({
  useUserSessionStore: () => ({
    isAuthenticated: true,
  }),
}));

vi.mock("@/domains/pr/ui/composites/PRFactsCard.vue", () => ({
  default: {
    name: "PRFactsCard",
    emits: ["ready"],
    template: '<section data-testid="pr-detail.facts-card" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRWaitlistActions.vue", () => ({
  default: {
    name: "PRWaitlistActions",
    template: '<section data-testid="pr-detail.waitlist-actions" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRConfirmationAction.vue", () => ({
  default: {
    name: "PRConfirmationAction",
    template: '<section data-testid="pr-detail.confirmation-action" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRCheckInFeedbackActions.vue", () => ({
  default: {
    name: "PRCheckInFeedbackActions",
    template: '<section data-testid="pr-detail.check-in-feedback-actions" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRJoinAction.vue", () => ({
  default: {
    name: "PRJoinAction",
    template: '<section data-testid="pr-detail.join-action" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRExitAction.vue", () => ({
  default: {
    name: "PRExitAction",
    template: '<section data-testid="pr-detail.exit-action" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRDraftPublishNotice.vue", () => ({
  default: {
    name: "PRDraftPublishNotice",
    template: '<section data-testid="pr-detail.publish-notice" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRBetaGroupAction.vue", () => ({
  default: {
    name: "PRBetaGroupAction",
    template: '<section data-testid="pr-detail.beta-group-action" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRMessageThreadAction.vue", () => ({
  default: {
    name: "PRMessageThreadAction",
    template: '<section data-testid="pr-detail.message-thread-action" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRShareAction.vue", () => ({
  default: {
    name: "PRShareAction",
    template: '<section data-testid="pr-detail.share-action" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRPageEventPlazaEntry.vue", () => ({
  default: {
    name: "PRPageEventPlazaEntry",
    template: '<section data-testid="pr-detail.event-plaza-entry" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRNotificationSubscriptionsSection.vue", () => ({
  default: {
    name: "PRNotificationSubscriptionsSection",
    template: '<section data-testid="pr-detail.notification-subscriptions-section" />',
  },
}));

vi.mock("@/domains/commerce/ui/ButtonPlacement.vue", () => ({
  default: {
    name: "ButtonPlacement",
    template: '<section data-testid="pr-detail.commerce-placement-action" />',
  },
}));

vi.mock("@/domains/support/ui/sections/SupportNavFooter.vue", () => ({
  default: {
    name: "SupportNavFooter",
    template: "<footer />",
  },
}));

vi.mock("@/domains/pr/ui/forms/UpdatePRStatusForm.vue", () => ({
  default: {
    name: "UpdatePRStatusForm",
    template: "<form />",
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
  testState.detail = undefined;
  testState.routeQuery = {};
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

type CreatorActionVisibilityCase = {
  name: string;
  status: PRStatus;
  isCreator: boolean;
  allowPostReadyTimeEdit?: boolean;
  editVisible: boolean;
  statusVisible: boolean;
};

const cases: CreatorActionVisibilityCase[] = [
  {
    name: "creator draft",
    status: "DRAFT",
    isCreator: true,
    editVisible: true,
    statusVisible: true,
  },
  {
    name: "creator open",
    status: "OPEN",
    isCreator: true,
    editVisible: true,
    statusVisible: true,
  },
  {
    name: "creator ready without post-ready edits",
    status: "READY",
    isCreator: true,
    editVisible: false,
    statusVisible: true,
  },
  {
    name: "creator ready with post-ready edits",
    status: "READY",
    isCreator: true,
    allowPostReadyTimeEdit: true,
    editVisible: true,
    statusVisible: true,
  },
  {
    name: "visitor open",
    status: "OPEN",
    isCreator: false,
    editVisible: false,
    statusVisible: false,
  },
  {
    name: "visitor draft",
    status: "DRAFT",
    isCreator: false,
    editVisible: false,
    statusVisible: false,
  },
];

describe("PRPage creator action visibility", () => {
  test.each(cases)(
    "$name shows edit=$editVisible and modify-status=$statusVisible",
    async ({
      status,
      isCreator,
      allowPostReadyTimeEdit,
      editVisible,
      statusVisible,
    }) => {
      const host = await mountPage(
        buildPRDetail({ status, isCreator, allowPostReadyTimeEdit }),
      );

      expect(hasTestId(host, "pr-detail.creator.edit-content")).toBe(
        editVisible,
      );
      expect(hasTestId(host, "pr-detail.creator.modify-status")).toBe(
        statusVisible,
      );
    },
  );
});

describe("PRPage edit content editor", () => {
  test("shows time editor for OPEN event-context PR when edit capability includes time", async () => {
    const host = await mountPage(
      buildPRDetail({
        status: "OPEN",
        isCreator: true,
        reminderSupported: true,
      }),
    );

    host
      .querySelector<HTMLButtonElement>(
        '[data-testid="pr-detail.creator.edit-content"]',
      )
      ?.click();
    await nextTick();
    await nextTick();

    expect(hasTestId(document.body, "pr-editor.form.start-date")).toBe(true);
    expect(hasTestId(document.body, "pr-editor.form.end-date")).toBe(true);
  });
});

describe("PRPage display title", () => {
  test("uses backend canonical title when anchor event title wins fallback", async () => {
    const host = await mountPage(
      buildPRDetail({
        status: "OPEN",
        isCreator: true,
        title: "",
        location: "万胜围",
        placeDisplayName: "万胜围",
        anchorEventTitle: "城市徒步局",
        canonicalTitle: "城市徒步局",
      }),
    );

    expect(host.querySelector(".page-header__title")?.textContent).toContain(
      "城市徒步局",
    );
  });

  test("uses backend canonical title when type wins before place", async () => {
    const host = await mountPage(
      buildPRDetail({
        status: "OPEN",
        isCreator: true,
        title: "",
        location: null,
        route: buildRoute(),
        placeDisplayName: "广州塔~大学城",
        canonicalTitle: "徒步",
      }),
    );

    expect(host.querySelector(".page-header__title")?.textContent).toContain(
      "徒步",
    );
  });

  test("uses backend canonical place fallback when higher labels are empty", async () => {
    const host = await mountPage(
      buildPRDetail({
        status: "OPEN",
        isCreator: true,
        title: "",
        location: null,
        route: buildRoute(),
        placeDisplayName: "广州塔~大学城",
        canonicalTitle: "广州塔~大学城",
      }),
    );

    expect(host.querySelector(".page-header__title")?.textContent).toContain(
      "广州塔~大学城",
    );
  });
});

describe("PRPage display status", () => {
  test("derives full display from open PR capacity", async () => {
    const host = await mountPage(
      buildPRDetail({
        status: "OPEN",
        isCreator: false,
        capacityCurrent: 4,
        capacityMax: 4,
      }),
    );

    expect(host.textContent).toContain("status.full");
  });

  test("keeps ready display ahead of derived fullness", async () => {
    const host = await mountPage(
      buildPRDetail({
        status: "READY",
        isCreator: false,
        capacityCurrent: 4,
        capacityMax: 4,
      }),
    );

    expect(host.textContent).toContain("status.ready");
    expect(host.textContent).not.toContain("status.full");
  });
});

describe("PRPage pairing code action", () => {
  test("shows the code for READY active participants and opens the full-screen page", async () => {
    const host = await mountPage(
      buildPRDetail({
        status: "READY",
        isCreator: false,
        isParticipant: true,
      }),
    );
    const pairingIdentity = derivePRPairingIdentity(123);
    const button = host.querySelector<HTMLButtonElement>(
      '[data-testid="pr-detail.pairing-code.open"]',
    );
    const colorSwatch = host.querySelector<HTMLElement>(
      '[data-testid="pr-detail.pairing-code.color"]',
    );

    expect(button).not.toBeNull();
    expect(button?.textContent).toContain(pairingIdentity.code);
    expect(colorSwatch?.style.backgroundColor).toBe(
      pairingIdentity.backgroundColor,
    );
    expect(button?.closest('[data-region="utility"]')).not.toBeNull();

    button?.click();

    expect(testState.routerPush).toHaveBeenCalledWith("/pr/123/pairing-code");
  });

  test("hides the code when the viewer is not an active participant", async () => {
    const host = await mountPage(
      buildPRDetail({
        status: "READY",
        isCreator: false,
        isParticipant: false,
      }),
    );

    expect(hasTestId(host, "pr-detail.pairing-code.open")).toBe(false);
  });

  test("hides the code before READY", async () => {
    const host = await mountPage(
      buildPRDetail({
        status: "OPEN",
        isCreator: false,
        isParticipant: true,
      }),
    );

    expect(hasTestId(host, "pr-detail.pairing-code.open")).toBe(false);
  });
});

const mountPage = async (detail: PRDetailView): Promise<HTMLElement> => {
  testState.detail = detail;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(PRPage);
  app.mount(host);
  mountedApps.push({ app, host });
  await nextTick();
  return host;
};

const hasTestId = (host: HTMLElement, testId: string): boolean =>
  host.querySelector(`[data-testid="${testId}"]`) !== null;

const buildPRDetail = ({
  status,
  isCreator,
  isParticipant = false,
  title = "周末徒步",
  location = "西湖",
  route = null,
  placeDisplayName = location,
  anchorEventTitle = null,
  canonicalTitle = title.trim() || "搭子请求",
  capacityCurrent = 0,
  capacityMax = null,
  allowPostReadyTimeEdit = false,
  reminderSupported = false,
}: {
  status: PRStatus;
  isCreator: boolean;
  isParticipant?: boolean;
  title?: string;
  location?: string | null;
  route?: PRRoute | null;
  placeDisplayName?: string | null;
  anchorEventTitle?: string | null;
  canonicalTitle?: string;
  capacityCurrent?: number;
  capacityMax?: number | null;
  allowPostReadyTimeEdit?: boolean;
  reminderSupported?: boolean;
}): PRDetailView =>
  ({
    id: 123,
    title,
    status,
    createdBy: isCreator ? 10 : 20,
    core: {
      type: "徒步",
      time: [null, null],
      location,
      route,
      placeDisplayName,
      minPartners: null,
      maxPartners: null,
      partners: [],
      budget: null,
      preferences: [],
      notes: null,
      meetingPoint: null,
      meetingPointVisibility: "VISIBLE",
    },
    partnerSection: {
      viewer: {
        isCreator,
        isParticipant,
        isWaitlisted: false,
        canJoin: false,
        canWaitlist: false,
        canExit: false,
        canConfirm: false,
        canCheckIn: false,
        slotState: null,
        releasedSlot: null,
        waitlistRank: null,
        joinBlockedReason: null,
        waitlistBlockedReason: null,
        confirmBlockedReason: null,
        checkInBlockedReason: null,
        exitBlockedReason: null,
      },
      reminder: {
        supported: reminderSupported,
      },
      confirmation: {
        enabled: false,
      },
      capacity: {
        current: capacityCurrent,
        max: capacityMax,
      },
      timeline: {
        confirmationStartAt: null,
        confirmationEndAt: null,
        eventStartAt: null,
      },
    },
    editCapability:
      status === "DRAFT" || status === "OPEN"
        ? {
            canEdit: true,
            editableFields: [
              "title",
              "time",
              "location",
              "route",
              "minPartners",
              "maxPartners",
              "preferences",
              "notes",
              "meetingPoint",
            ],
            constraints: {},
          }
        : status === "READY" && isCreator && allowPostReadyTimeEdit
          ? {
              canEdit: true,
              editableFields: ["time"],
              constraints: {
                timeWindow: [
                  "2038-01-02T12:00:00.000Z",
                  "2038-01-02T16:00:00.000Z",
                ],
              },
            }
        : {
            canEdit: false,
            editableFields: [],
            constraints: {},
          },
    editPostReadyCapability: allowPostReadyTimeEdit
      ? {
          editableFields: ["time"],
          constraints: {
            timeWindow: [
              "2038-01-02T12:00:00.000Z",
              "2038-01-02T16:00:00.000Z",
            ],
          },
        }
      : {
          editableFields: [],
          constraints: {},
        },
    feedbackQuestionnaire: null,
    anchorEventContext:
      anchorEventTitle === null
        ? null
        : {
            id: 1,
            title: anchorEventTitle,
            betaGroupQrCode: null,
          },
    share: {
      canonical: {
        title: canonicalTitle,
        description: "搭子请求详情",
        canonicalPath: "/pr/123",
        defaultImagePath: "/share-logo.png",
        revision: "test-revision",
      },
      xiaohongshuPoster: null,
      wechatThumbnail: null,
    },
  }) as unknown as PRDetailView;

const buildRoute = (): PRRoute => [
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.12908, 113.26436],
    name: "广州塔",
    full_address: "广东省广州市海珠区阅江西路222号",
  },
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.05799, 113.40084],
    name: "大学城",
    full_address: "广东省广州市番禺区大学城",
  },
];
