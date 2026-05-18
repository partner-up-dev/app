// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { createApp, type App } from "vue";
import type { PRRoute } from "@partner-up-dev/backend";
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

vi.mock("@/domains/pr/queries/usePRDetail", async () => {
  const { computed } = await vi.importActual<typeof import("vue")>("vue");

  return {
    usePRDetail: () => ({
      data: computed(() => testState.detail),
    }),
  };
});

vi.mock("@/domains/pr/ui/primitives/PRStatusBadge.vue", () => ({
  default: {
    name: "PRStatusBadge",
    props: ["status"],
    template: '<span data-testid="pr-status">{{ status }}</span>',
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
  });
});

const mountCard = (detail: PRDetailView): HTMLElement => {
  testState.detail = detail;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(PRPreviewCard, {
    prId: 123,
  });
  app.mount(host);
  mountedApps.push({ app, host });
  return host;
};

const buildPRDetail = ({
  placeDisplayName,
  route,
}: {
  placeDisplayName: string | null;
  route: PRRoute | null;
}): PRDetailView =>
  ({
    id: 123,
    title: "",
    status: "OPEN",
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
      preferences: [],
      notes: null,
      meetingPoint: null,
      meetingPointVisibility: "VISIBLE",
    },
    partnerSection: {
      capacity: {
        current: 0,
        max: 4,
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
