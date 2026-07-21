// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref, type App } from "vue";
import type { OrderingEntryPayload } from "@/domains/commerce/model/ordering-entry-storage";
import type { OrderingEntryResponse } from "@/domains/commerce/queries/useCommerce";
import ButtonPlacement from "./ButtonPlacement.vue";

const testState = vi.hoisted(() => ({
  push: vi.fn<(location: { path: string }) => Promise<void>>(),
  resolveAdmission:
    vi.fn<
      (input: {
        placementInstanceId: number;
        matchingContext: unknown;
      }) => Promise<OrderingEntryResponse>
    >(),
  setOrderingEntry: vi.fn<(entry: OrderingEntryPayload) => void>(),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: testState.push }),
}));

vi.mock("@/domains/commerce/queries/useCommerce", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");

  return {
    usePlacementMatch: () => ({
      data: ref({
        placements: [
          {
            id: 11,
            type: "BUTTON",
            offerId: 29,
            creative: { ctaLabel: "下单" },
            bindingRules: [],
          },
        ],
      }),
    }),
    resolvePlacementOrderingEntry: testState.resolveAdmission,
  };
});

vi.mock("@/domains/commerce/use-cases/useOrderingHandoffStore", () => ({
  useOrderingHandoffStore: () => ({ setOrderingEntry: testState.setOrderingEntry }),
}));

vi.mock("@partner-up-dev/design-web", () => ({
  PuButton: {
    inheritAttrs: false,
    emits: ["click"],
    template:
      '<button v-bind="$attrs" @click="$emit(\'click\')"><slot name="leading" /><slot /></button>',
  },
}));

const mountedApps: Array<{ app: App<Element>; host: HTMLElement }> = [];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  for (const mounted of mountedApps.splice(0)) {
    mounted.app.unmount();
    mounted.host.remove();
  }
  document.body.innerHTML = "";
});

describe("ButtonPlacement admission feedback", () => {
  test("clears prior feedback when the matching context changes without remounting", async () => {
    testState.resolveAdmission.mockResolvedValue({ outcome: "NON_CREATOR" });
    const matchingContext = ref<unknown>({ kind: "PR", prId: 17 });
    const Host = defineComponent({
      setup() {
        return () => h(ButtonPlacement, { matchingContext: matchingContext.value });
      },
    });
    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp(Host);
    app.mount(host);
    mountedApps.push({ app, host });

    const button = host.querySelector<HTMLButtonElement>(
      '[data-testid="pr-detail.commerce-placement.open"]',
    );
    expect(button).not.toBeNull();
    button?.click();

    await vi.waitFor(() => {
      expect(
        host.querySelector('[data-testid="pr-detail.commerce-placement.admission-result"]')
          ?.textContent,
      ).toContain("仅搭子发起人可以创建新订单");
    });

    matchingContext.value = { kind: "PR", prId: 18 };
    await nextTick();

    expect(host.querySelector('[data-testid="pr-detail.commerce-placement.open"]')).toBe(button);
    expect(
      host.querySelector('[data-testid="pr-detail.commerce-placement.admission-result"]'),
    ).toBeNull();
    expect(testState.push).not.toHaveBeenCalled();
    expect(testState.setOrderingEntry).not.toHaveBeenCalled();
  });
});
