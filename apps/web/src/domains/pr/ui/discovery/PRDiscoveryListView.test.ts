// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h } from "vue";
import type {
  PRDiscoveryListRecord,
  PRDiscoveryPersistedCandidate,
} from "@/domains/pr/model/pr-discovery-types";
import PRDiscoveryListView from "./PRDiscoveryListView.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@partner-up-dev/design-web", async () => {
  const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue");
  return {
    PuEmptyState: defineComponent({
      inheritAttrs: false,
      setup(_, { attrs, slots }) {
        return () => h("div", attrs, slots.default?.());
      },
    }),
    PuInlineNotice: defineComponent({
      inheritAttrs: false,
      setup(_, { attrs }) {
        return () => h("div", attrs);
      },
    }),
    PuTabs: defineComponent({
      props: {
        tabs: { type: Array, default: () => [] },
        modelValue: { type: [String, Number], default: null },
      },
      setup(props) {
        return () =>
          h(
            "div",
            { "data-testid": "tabs" },
            (props.tabs as Array<{ value: string; label: string }>).map((tab) =>
              h(
                "button",
                {
                  type: "button",
                  "data-value": tab.value,
                  "aria-selected": String(props.modelValue) === tab.value,
                },
                tab.label,
              ),
            ),
          );
      },
    }),
  };
});

vi.mock("@/shared/poi/queries/usePoisByIds", () => ({
  usePoisByIds: () => ({ data: { value: [] } }),
}));

vi.mock("./list/OtherPRTypesSection.vue", () => ({ default: { render: () => null } }));
vi.mock("./list/PRDiscoveryCommunityCard.vue", () => ({
  default: { render: () => null },
}));
vi.mock("./list/PRDiscoveryCreateCard.vue", () => ({ default: { render: () => null } }));
vi.mock("./list/PRDiscoveryCreationSuggestionCard.vue", () => ({
  default: { render: () => null },
}));
vi.mock("@/domains/pr/ui/primitives/PRPreviewCard.vue", () => ({
  default: defineComponent({
    inheritAttrs: false,
    props: { timeLabel: { type: String, default: "" } },
    setup(props, { attrs }) {
      return () => h("div", { ...attrs, "data-testid": "candidate" }, props.timeLabel);
    },
  }),
}));

const mountedApps: Array<{ app: App<Element>; host: HTMLElement }> = [];

afterEach(() => {
  for (const mounted of mountedApps.splice(0)) {
    mounted.app.unmount();
    mounted.host.remove();
  }
  vi.useRealTimers();
});

const candidate = (
  prId: number,
  startAt: string,
  endAt: string,
): PRDiscoveryPersistedCandidate => ({
  prId,
  canonicalPath: `/pr/${prId}`,
  title: null,
  type: "study",
  location: "图书馆",
  route: null,
  placeDisplayName: "图书馆",
  preferences: [],
  notes: null,
  time: [startAt, endAt],
  status: "OPEN",
  minPartners: 2,
  maxPartners: 4,
  partnerCount: 0,
  createdAt: "2025-01-01T00:00:00.000Z",
});

const listRecord = (
  prId: number,
  startAt: string,
  endAt: string,
  status: PRDiscoveryListRecord["status"],
): PRDiscoveryListRecord => ({
  ...candidate(prId, startAt, endAt),
  status,
});

const mountList = (
  candidates: readonly PRDiscoveryPersistedCandidate[],
  listRecords: readonly PRDiscoveryListRecord[] = [],
) => {
  const Host = defineComponent({
    setup() {
      return () => h(PRDiscoveryListView, { candidates, listRecords });
    },
  });
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(Host);
  app.mount(host);
  mountedApps.push({ app, host });
  return host;
};

describe("PRDiscoveryListView date groups", () => {
  it("excludes expired OPEN candidates from date tabs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-04-01T03:00:00.000Z"));

    const host = mountList([
      candidate(1, "2025-03-31T04:00:00.000Z", "2025-03-31T05:00:00.000Z"),
      candidate(2, "2025-04-02T04:00:00.000Z", "2025-04-02T05:00:00.000Z"),
    ]);

    expect(host.querySelector('[data-value="2025-03-31"]')).toBeNull();
    expect(host.querySelector('[data-value="2025-04-02"]')).not.toBeNull();
    expect(host.querySelectorAll('[data-testid="candidate"]')).toHaveLength(1);
    expect(host.querySelector('[data-testid="candidate"]')?.textContent).toBe("12:00");
  });

  it("defaults to the first date group with an unended time window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-04-01T03:00:00.000Z"));

    const host = mountList([
      candidate(1, "2025-04-01T01:00:00.000Z", "2025-04-01T02:00:00.000Z"),
      candidate(2, "2025-04-02T04:00:00.000Z", "2025-04-02T05:00:00.000Z"),
    ]);

    const selectedTab = host.querySelector(
      '[data-testid="prd.list.date-tabs"] button[aria-selected="true"]',
    );
    expect(selectedTab?.getAttribute("data-value")).toBe("2025-04-02");
    expect(host.querySelectorAll('[data-testid="candidate"]')).toHaveLength(1);
    expect(host.querySelector('[data-testid="candidate"]')?.textContent).toBe("12:00");
  });

  it("shows READY and ACTIVE in current/future groups but only CLOSED in recent expired groups", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-04-04T03:00:00.000Z"));

    const host = mountList(
      [],
      [
        listRecord(1, "2025-04-01T04:00:00.000Z", "2025-04-01T05:00:00.000Z", "CLOSED"),
        listRecord(2, "2025-04-01T04:00:00.000Z", "2025-04-01T05:00:00.000Z", "OPEN"),
        listRecord(3, "2025-04-05T04:00:00.000Z", "2025-04-05T05:00:00.000Z", "READY"),
        listRecord(4, "2025-04-06T04:00:00.000Z", "2025-04-06T05:00:00.000Z", "ACTIVE"),
      ],
    );

    expect(host.querySelector('[data-value="2025-04-01"]')).not.toBeNull();
    expect(host.querySelector('[data-value="2025-04-05"]')).not.toBeNull();
    expect(host.querySelectorAll('[data-testid="candidate"]')).toHaveLength(1);
    expect(host.querySelector('[data-testid="candidate"]')?.textContent).toBe("12:00");
  });

  it("renders only CLOSED records when an expired date group is selected by default", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-04-04T03:00:00.000Z"));

    const host = mountList(
      [],
      [
        listRecord(1, "2025-04-01T04:00:00.000Z", "2025-04-01T05:00:00.000Z", "CLOSED"),
        listRecord(2, "2025-04-01T04:00:00.000Z", "2025-04-01T05:00:00.000Z", "OPEN"),
      ],
    );

    expect(host.querySelector('[data-value="2025-04-01"]')).not.toBeNull();
    expect(host.querySelectorAll('[data-testid="candidate"]')).toHaveLength(1);
  });
});
