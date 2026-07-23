// @vitest-environment happy-dom
import { afterEach, describe, expect, test, vi } from "vitest";
import { createApp, h, ref, type App } from "vue";

const state = vi.hoisted(() => ({ refresh: vi.fn<() => Promise<void>>() }));

vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/domains/admin/use-cases/useAdminAccess", () => ({
  useAdminAccess: () => ({ logout: vi.fn<() => void>() }),
}));
vi.mock("@/domains/admin/ui/navigation/AdminNavigationPanel.vue", () => ({
  default: { template: "<nav data-testid='admin-nav' />" },
}));
vi.mock("@/domains/admin/ui/layout/AdminPageScaffold.vue", () => ({
  default: {
    template:
      "<div><slot name='navigation' /><slot name='rail' /><slot name='actions' /><slot name='main' /></div>",
  },
}));
vi.mock("@/domains/analytics/ui/sections/AnalyticsFilterRail.vue", () => ({
  default: {
    template:
      "<aside data-testid='admin-analytics.filters'><button data-testid='admin-analytics.filters.apply' /><button data-testid='admin-analytics.filters.reset' /></aside>",
  },
}));
vi.mock("@/domains/analytics/ui/surfaces/BIOverviewSurface.vue", () => ({
  default: { template: "<section data-testid='admin-analytics.bi-overview' />" },
}));
vi.mock("@/domains/analytics/ui/surfaces/PRFunnelsSurface.vue", () => ({
  default: {
    template:
      "<section data-testid='admin-analytics.pr-create-funnel' /><section data-testid='admin-analytics.pr-join-funnel' />",
  },
}));
vi.mock("@/domains/analytics/ui/surfaces/PRDiscoverySurface.vue", () => ({
  default: { template: "<section data-testid='admin-analytics.pr-discovery-funnel' />" },
}));
vi.mock("@partner-up-dev/design-web", () => ({
  PuButton: {
    inheritAttrs: false,
    setup(
      _: unknown,
      context: { attrs: Record<string, unknown>; slots: Record<string, () => unknown> },
    ) {
      return () =>
        h(
          "button",
          { ...context.attrs },
          context.slots.default?.() as ReturnType<typeof h>[] | undefined,
        );
    },
  },
  PuInlineNotice: {
    props: ["message"],
    template: "<div data-testid='admin-analytics.error'>{{ message }}</div>",
  },
  PuLoadingState: { template: "<div data-testid='admin-analytics.loading' />" },
}));
vi.mock("@/domains/analytics/use-cases/useAnalyticsDashboard", () => ({
  useAnalyticsDashboard: () => ({
    filters: {
      draft: {},
      filterError: ref(null),
      activeFilterSummary: ref("summary"),
      apply: vi.fn<() => void>(),
      reset: vi.fn<() => void>(),
    },
    isRefreshing: ref(false),
    isInitialLoading: ref(false),
    error: ref(null),
    refresh: state.refresh,
  }),
}));

import AdminAnalyticsOverviewPage from "./AdminAnalyticsOverviewPage.vue";
import AdminPRFunnelAnalyticsPage from "./AdminPRFunnelAnalyticsPage.vue";
import AdminPRDiscoveryAnalyticsPage from "./AdminPRDiscoveryAnalyticsPage.vue";

const mounted: Array<{ app: App<Element>; host: HTMLElement }> = [];
afterEach(() => {
  for (const item of mounted.splice(0)) {
    item.app.unmount();
    item.host.remove();
  }
  state.refresh.mockClear();
});

describe("Analytics route pages", () => {
  test.each([
    ["overview", AdminAnalyticsOverviewPage, "admin-analytics.bi-overview"],
    ["funnels", AdminPRFunnelAnalyticsPage, "admin-analytics.pr-create-funnel"],
    ["discovery", AdminPRDiscoveryAnalyticsPage, "admin-analytics.pr-discovery-funnel"],
  ])("renders %s surface and refresh action", async (_name, component, surfaceTestId) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp(component);
    app.mount(host);
    mounted.push({ app, host });
    expect(host.querySelector(`[data-testid='${surfaceTestId}']`)).not.toBeNull();
    host.querySelector<HTMLElement>("[data-testid='admin-analytics.refresh']")?.click();
    expect(state.refresh).toHaveBeenCalledTimes(1);
  });
});
