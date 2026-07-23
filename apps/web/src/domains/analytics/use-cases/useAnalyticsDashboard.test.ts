import { describe, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({
  overview: [] as Array<{ enabled: { value: boolean }; refetch: ReturnType<typeof vi.fn> }>,
  create: [] as Array<{ enabled: { value: boolean }; refetch: ReturnType<typeof vi.fn> }>,
  join: [] as Array<{ enabled: { value: boolean }; refetch: ReturnType<typeof vi.fn> }>,
  discovery: [] as Array<{ enabled: { value: boolean }; refetch: ReturnType<typeof vi.fn> }>,
}));

vi.mock("./useAnalyticsFilters", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");
  return {
    useAnalyticsFilters: () => ({
      draft: ref({}),
      applied: ref({}),
      filterError: ref(null),
      activeFilterSummary: ref("summary"),
      apply: vi.fn<() => void>(),
      reset: vi.fn<() => void>(),
    }),
  };
});

vi.mock("../queries/useBIOverviewAnalytics", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");
  return {
    useBIOverviewAnalytics: (_input: unknown, options: { enabled: { value: boolean } }) => {
      const query = {
        enabled: options.enabled,
        refetch: vi.fn<() => Promise<{ data: undefined }>>(async () => ({ data: undefined })),
      };
      state.overview.push(query);
      return {
        ...query,
        data: ref(undefined),
        isLoading: ref(false),
        isFetching: ref(false),
        error: ref(null),
      };
    },
  };
});
vi.mock("../queries/usePRFunnelAnalytics", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");
  const make =
    (bucket: "create" | "join") => (_input: unknown, options: { enabled: { value: boolean } }) => {
      const query = {
        enabled: options.enabled,
        refetch: vi.fn<() => Promise<{ data: undefined }>>(async () => ({ data: undefined })),
      };
      state[bucket].push(query);
      return {
        ...query,
        data: ref(undefined),
        isLoading: ref(false),
        isFetching: ref(false),
        error: ref(null),
      };
    };
  return { usePRCreateFunnelAnalytics: make("create"), usePRJoinFunnelAnalytics: make("join") };
});
vi.mock("../queries/usePRDiscoveryAnalytics", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");
  return {
    usePRDiscoveryAnalytics: (_input: unknown, options: { enabled: { value: boolean } }) => {
      const query = {
        enabled: options.enabled,
        refetch: vi.fn<() => Promise<{ data: undefined }>>(async () => ({ data: undefined })),
      };
      state.discovery.push(query);
      return {
        ...query,
        data: ref(undefined),
        isLoading: ref(false),
        isFetching: ref(false),
        error: ref(null),
      };
    },
  };
});

import { useAnalyticsDashboard } from "./useAnalyticsDashboard";

describe("useAnalyticsDashboard", () => {
  test.each([
    ["overview", true, false, false],
    ["pr-funnels", false, true, false],
    ["pr-discovery", false, false, true],
  ] as const)("enables only the %s endpoint group", (kind, overview, funnels, discovery) => {
    state.overview.length = state.create.length = state.join.length = state.discovery.length = 0;
    useAnalyticsDashboard(kind);
    expect(state.overview.at(-1)?.enabled.value).toBe(overview);
    expect(state.create.at(-1)?.enabled.value).toBe(funnels);
    expect(state.join.at(-1)?.enabled.value).toBe(funnels);
    expect(state.discovery.at(-1)?.enabled.value).toBe(discovery);
  });

  test("refreshes only active endpoint group", async () => {
    state.overview.length = state.create.length = state.join.length = state.discovery.length = 0;
    const overview = useAnalyticsDashboard("overview");
    await overview.refresh();
    expect(state.overview.at(-1)?.refetch).toHaveBeenCalledTimes(1);
    expect(state.create.at(-1)?.refetch).not.toHaveBeenCalled();
    expect(state.join.at(-1)?.refetch).not.toHaveBeenCalled();
    expect(state.discovery.at(-1)?.refetch).not.toHaveBeenCalled();
  });
});
