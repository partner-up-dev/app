// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { createApp, h, type App } from "vue";
import type { PRRoute, PRStatus } from "@partner-up-dev/backend/contracts";
import type { PRDetailView } from "@/domains/pr/model/types";
import PRPreviewCard from "./PRPreviewCard.vue";

const testState = vi.hoisted(() => ({
  detail: undefined as PRDetailView | undefined,
}));

vi.mock("vue-router", () => ({
  RouterLink: {
    name: "RouterLink",
    props: ["to"],
    template: '<a :href="to"><slot /></a>',
  },
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const statusText: Record<string, string> = {
        "status.draft": "DRAFT",
        "status.open": "OPEN",
        "status.ready": "READY",
        "status.full": "FULL",
        "status.active": "ACTIVE",
        "status.closed": "CLOSED",
        "status.expired": "EXPIRED",
      };
      return statusText[key] ?? key;
    },
  }),
}));

vi.mock("@/domains/pr/queries/usePRDetail", async () => {
  const { computed } = await vi.importActual<typeof import("vue")>("vue");

  return {
    usePRDetail: () => ({
      data: computed(() => testState.detail),
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
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("PRPreviewCard route display", () => {
  test("uses a route summary when backend place display is unavailable", () => {
    const host = mountCard(
      buildPRDetail({
        placeDisplayName: null,
        route: buildRoute(),
      }),
    );

    expect(host.textContent).toContain("🧭 广州塔~大学城");
    expect(host.querySelector("a")?.getAttribute("href")).toBe("/pr/123");
  });

  test("shows derived full status for open PRs at capacity", () => {
    const host = mountCard(
      buildPRDetail({
        status: "OPEN",
        current: 4,
        max: 4,
      }),
    );

    expect(host.textContent).toContain("FULL");
  });

  test("shows only max capacity when current count is zero", () => {
    const host = mountCard(
      buildPRDetail({
        current: 0,
        max: 4,
      }),
    );

    expect(host.textContent).toContain("👥 4");
    expect(host.textContent).not.toContain("0/4");
  });

  test("keeps current over max capacity when current count is non-zero", () => {
    const host = mountCard(
      buildPRDetail({
        current: 1,
        max: 4,
      }),
    );

    expect(host.textContent).toContain("👥 1/4");
  });

  test("shows only the first non-empty preference tag after place", () => {
    const host = mountCard(
      buildPRDetail({
        placeDisplayName: "活动室",
        preferences: ["", " 学科:数学 ", "新手友好"],
      }),
    );
    const text = host.textContent ?? "";

    expect(text).toContain("🏷️ 数学");
    expect(text).not.toContain("学科:数学");
    expect(text).not.toContain("新手友好");
    expect(text.indexOf("📍 活动室")).toBeLessThan(text.indexOf("🏷️ 数学"));
    expect(text.indexOf("🏷️ 数学")).toBeLessThan(text.indexOf("👥 4"));
  });

  test("keeps READY display ahead of derived fullness", () => {
    const host = mountCard(
      buildPRDetail({
        status: "READY",
        current: 4,
        max: 4,
      }),
    );

    expect(host.textContent).toContain("READY");
    expect(host.textContent).not.toContain("FULL");
  });

  test("preserves route override, action slot, open event, and semantic attrs", () => {
    const onOpenDetail = vi.fn<() => void>();
    const app = createApp({
      render: () =>
        h(
          PRPreviewCard,
          {
            prId: 123,
            to: "/custom-preview",
            "data-testid": "pr-preview",
            onOpenDetail,
          },
          {
            actions: () =>
              h("button", { type: "button", "data-testid": "pr-preview-action" }, "Action"),
          },
        ),
    });
    const host = mountApp(buildPRDetail({}), app);
    const link = host.querySelector("a");

    expect(host.querySelector('[data-testid="pr-preview"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="pr-preview-action"]')?.textContent).toBe("Action");
    expect(link?.getAttribute("href")).toBe("/custom-preview");

    link?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onOpenDetail).toHaveBeenCalledOnce();
  });
});

const mountApp = (detail: PRDetailView, app: App<Element>): HTMLElement => {
  testState.detail = detail;
  const host = document.createElement("div");
  document.body.appendChild(host);
  app.mount(host);
  mountedApps.push({ app, host });
  return host;
};

const mountCard = (detail: PRDetailView): HTMLElement =>
  mountApp(
    detail,
    createApp(PRPreviewCard, {
      prId: 123,
    }),
  );

const buildPRDetail = ({
  placeDisplayName = null,
  route = null,
  status = "OPEN",
  current = 0,
  max = 4,
  preferences = [],
}: {
  placeDisplayName?: string | null;
  route?: PRRoute | null;
  status?: PRStatus;
  current?: number;
  max?: number | null;
  preferences?: string[];
}): PRDetailView =>
  ({
    id: 123,
    title: "",
    status,
    createdAt: "2026-05-17T00:00:00.000Z",
    core: {
      type: "通勤拼车",
      time: [null, null],
      location: null,
      route,
      placeDisplayName,
      minPartners: 1,
      maxPartners: 4,
      partners: [],
      myPartnerId: null,
      budget: null,
      preferences,
      notes: null,
      meetingPoint: null,
      meetingPointVisibility: "VISIBLE",
    },
    partnerSection: {
      capacity: {
        current,
        max,
      },
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
