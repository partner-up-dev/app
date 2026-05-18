// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { createApp, nextTick, type App } from "vue";
import type { PRRoute, PRStatus } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import PRPage from "./PRPage.vue";

const testState = vi.hoisted(() => ({
  detail: undefined as PRDetailView | undefined,
  routeQuery: {} as Record<string, unknown>,
  refetch: vi.fn(),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
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
    replace: vi.fn(),
    push: vi.fn(),
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

vi.mock("@/domains/pr/use-cases/usePRLivePolling", () => ({
  usePRLivePolling: () => ({
    resetLivePolling: vi.fn(),
  }),
}));

vi.mock("@/domains/pr/use-cases/usePRShareContext", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");

  return {
    usePRShareContext: () => ({
      shareUrl: ref("https://example.test/pr/123"),
      spmRouteKey: ref("pr_detail"),
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

vi.mock("@/domains/pr/ui/composites/PRFactsCard.vue", () => ({
  default: {
    name: "PRFactsCard",
    emits: ["ready"],
    template: '<section data-testid="pr-detail.facts-card" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRContextualActions.vue", () => ({
  default: {
    name: "PRContextualActions",
    template: '<section data-testid="pr-detail.actions" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRDraftPublishNotice.vue", () => ({
  default: {
    name: "PRDraftPublishNotice",
    template: '<section data-testid="pr-detail.publish-notice" />',
  },
}));

vi.mock("@/domains/pr/ui/sections/PRUtilityActions.vue", () => ({
  default: {
    name: "PRUtilityActions",
    template: '<section data-testid="pr-detail.utility-actions" />',
  },
}));

vi.mock("@/domains/support/ui/sections/MiniumCommonFooter.vue", () => ({
  default: {
    name: "MiniumCommonFooter",
    template: "<footer />",
  },
}));

vi.mock("@/domains/pr/ui/forms/PRForm.vue", () => ({
  default: {
    name: "PRForm",
    template: "<form />",
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
    name: "creator ready",
    status: "READY",
    isCreator: true,
    editVisible: false,
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
    async ({ status, isCreator, editVisible, statusVisible }) => {
      const host = await mountPage(buildPRDetail({ status, isCreator }));

      expect(hasTestId(host, "pr-detail.creator.edit-content")).toBe(
        editVisible,
      );
      expect(hasTestId(host, "pr-detail.creator.modify-status")).toBe(
        statusVisible,
      );
    },
  );
});

describe("PRPage display title", () => {
  test("uses backend place display when title is empty", async () => {
    const host = await mountPage(
      buildPRDetail({
        status: "OPEN",
        isCreator: true,
        title: "",
        location: null,
        route: buildRoute(),
        placeDisplayName: "广州塔~大学城",
      }),
    );

    expect(host.querySelector(".page-header__title")?.textContent).toContain(
      "广州塔~大学城",
    );
  });

  test("uses route summary when backend place display is unavailable", async () => {
    const host = await mountPage(
      buildPRDetail({
        status: "OPEN",
        isCreator: true,
        title: "",
        location: null,
        route: buildRoute(),
        placeDisplayName: null,
      }),
    );

    expect(host.querySelector(".page-header__title")?.textContent).toContain(
      "广州塔~大学城",
    );
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
  title = "周末徒步",
  location = "西湖",
  route = null,
  placeDisplayName = location,
}: {
  status: PRStatus;
  isCreator: boolean;
  title?: string;
  location?: string | null;
  route?: PRRoute | null;
  placeDisplayName?: string | null;
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
        joinBlockedReason: null,
        waitlistBlockedReason: null,
        confirmBlockedReason: null,
        checkInBlockedReason: null,
        exitBlockedReason: null,
      },
      reminder: {
        supported: false,
      },
      confirmation: {
        enabled: false,
      },
      timeline: {
        confirmationStartAt: null,
        confirmationEndAt: null,
        eventStartAt: null,
      },
    },
    feedbackQuestionnaire: null,
    anchorEventContext: null,
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
