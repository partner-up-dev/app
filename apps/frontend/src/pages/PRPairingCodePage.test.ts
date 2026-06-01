// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { createApp, nextTick, ref, type App } from "vue";
import type { PRDetailView } from "@/domains/pr/model/types";
import { derivePRPairingCode } from "@/domains/pr/model/pr-pairing-code";
import PRPairingCodePage from "./PRPairingCodePage.vue";

const testState = vi.hoisted(() => ({
  detail: undefined as PRDetailView | undefined,
  isLoading: false,
  error: null as Error | null,
  routerBack: vi.fn(),
  routerReplace: vi.fn(),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({
    back: testState.routerBack,
    replace: testState.routerReplace,
  }),
}));

vi.mock("@/domains/pr/routing/usePRRouteId", async () => {
  const { computed } = await vi.importActual<typeof import("vue")>("vue");

  return {
    usePRRouteId: () => computed(() => 123),
  };
});

vi.mock("@/domains/pr/queries/usePRDetail", async () => {
  const { computed } = await vi.importActual<typeof import("vue")>("vue");

  return {
    usePRDetail: () => ({
      data: computed(() => testState.detail),
      isLoading: computed(() => testState.isLoading),
      error: ref(testState.error),
    }),
  };
});

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
  testState.isLoading = false;
  testState.error = null;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("PRPairingCodePage", () => {
  test("renders the full-screen pairing code for READY active participants", async () => {
    const host = await mountPage(
      buildPRDetail({ status: "READY", isParticipant: true }),
    );

    expect(getByTestId(host, "pr-pairing-code.code")?.textContent).toContain(
      derivePRPairingCode(123),
    );
    expect(host.querySelector('[data-page="pr-pairing-code"]')).not.toBeNull();
  });

  test("does not reveal the code to non-participants", async () => {
    const host = await mountPage(
      buildPRDetail({ status: "READY", isParticipant: false }),
    );

    expect(getByTestId(host, "pr-pairing-code.code")).toBeNull();
    expect(host.textContent).toContain("prPage.pairingCodePage.unavailable");
  });

  test("returns to the PR detail page when there is no browser back entry", async () => {
    const host = await mountPage(
      buildPRDetail({ status: "READY", isParticipant: true }),
    );

    getByTestId(host, "pr-pairing-code.back")?.click();
    await nextTick();

    expect(testState.routerReplace).toHaveBeenCalledWith("/pr/123");
  });
});

const mountPage = async (detail: PRDetailView): Promise<HTMLElement> => {
  testState.detail = detail;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(PRPairingCodePage);
  app.mount(host);
  mountedApps.push({ app, host });
  await nextTick();
  return host;
};

const getByTestId = (
  host: HTMLElement,
  testId: string,
): HTMLElement | null => host.querySelector(`[data-testid="${testId}"]`);

const buildPRDetail = ({
  status,
  isParticipant,
}: {
  status: "OPEN" | "READY";
  isParticipant: boolean;
}): PRDetailView =>
  ({
    id: 123,
    status,
    partnerSection: {
      viewer: {
        isParticipant,
      },
    },
  }) as unknown as PRDetailView;
