// @vitest-environment happy-dom

import type { PRRoute } from "@partner-up-dev/backend";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";
import type {
  PRDiscoveryPlaceSelection,
  PRDiscoveryPlaceSelectorView,
} from "@/domains/pr/model/pr-discovery-place-options";
import PRCarouselPlaceSelector from "./PRCarouselPlaceSelector.vue";
import PRPeekRadioCarousel from "./PRPeekRadioCarousel.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@partner-up-dev/design-web", async () => {
  const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue");
  return {
    PuButton: defineComponent({
      emits: ["click"],
      setup(_, { emit, slots }) {
        return () => h("button", { onClick: () => emit("click") }, slots.default?.());
      },
    }),
  };
});

vi.mock("@/domains/route/ui/RouteMap.vue", async () => {
  const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue");
  return { default: defineComponent({ setup: () => () => h("div") }) };
});

const mountedApps: Array<{ app: App<Element>; host: HTMLElement }> = [];

afterEach(() => {
  for (const mounted of mountedApps.splice(0)) {
    mounted.app.unmount();
    mounted.host.remove();
  }
});

const route: PRRoute = [
  {
    name: "Route origin",
    full_address: "Origin",
    wgs84: null,
    bd09: null,
    gcj02: null,
  },
  {
    name: "Route destination",
    full_address: "Destination",
    wgs84: null,
    bd09: null,
    gcj02: null,
  },
];

const placeSelector: PRDiscoveryPlaceSelectorView = {
  kind: "route",
  labelKey: "prDiscovery.placeSelector.routeLabel",
  placeholderKey: "prDiscovery.placeSelector.routePlaceholder",
  ariaLabelKey: "prDiscovery.placeSelector.routeAriaLabel",
  applyActionKey: "prDiscovery.placeSelector.applyRoute",
  options: [
    {
      kind: "route",
      id: "route:route-1",
      routePoolEntryId: "route-1",
      label: "Route origin → Route destination",
      route,
      availableStartKeys: [],
      remainingQuota: null,
      disabled: false,
      disabledReason: "NONE",
    },
  ],
};

describe("PRCarouselPlaceSelector", () => {
  it("selects the route-application card first and activates it on the next click", async () => {
    const selected = ref<PRDiscoveryPlaceSelection | null>(null);
    const routeApplications: Array<true> = [];
    const Host = defineComponent({
      setup: () => () =>
        h(PRCarouselPlaceSelector, {
          modelValue: selected.value,
          placeSelector,
          "onUpdate:modelValue": (value: PRDiscoveryPlaceSelection | null) => {
            selected.value = value;
          },
          onCreateRoute: () => routeApplications.push(true),
        }),
    });

    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp(Host);
    app.mount(host);
    mountedApps.push({ app, host });
    await nextTick();

    const createRoute = () =>
      host.querySelector<HTMLElement>(
        '[data-testid="pr-discovery.place.option"][data-place-id="__create_route__"]',
      );
    expect(createRoute()).not.toBeNull();

    createRoute()?.click();
    await nextTick();
    expect(routeApplications).toHaveLength(0);

    createRoute()?.click();
    await nextTick();
    expect(routeApplications).toHaveLength(1);
  });
});

const createPointerEvent = (
  type: string,
  values: {
    pointerId: number;
    pointerType: string;
    clientX: number;
    clientY: number;
    button?: number;
  },
): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(event, key, { configurable: true, value });
  }
  return event;
};

describe("PRPeekRadioCarousel touch capture", () => {
  it("does not capture a tap before a horizontal swipe is established", () => {
    const Host = defineComponent({
      setup: () => () =>
        h(PRPeekRadioCarousel, {
          modelValue: "first",
          items: [{ id: "first" }, { id: "second" }],
        }),
    });
    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp(Host);
    app.mount(host);
    mountedApps.push({ app, host });

    const carousel = host.querySelector<HTMLElement>(".peek-radio-carousel");
    expect(carousel).not.toBeNull();
    if (!carousel) {
      throw new Error("carousel did not mount");
    }
    const setPointerCapture = vi.fn<(pointerId: number) => void>();
    Object.assign(carousel, { setPointerCapture });

    carousel.dispatchEvent(
      createPointerEvent("pointerdown", {
        pointerId: 1,
        pointerType: "touch",
        clientX: 100,
        clientY: 100,
        button: 0,
      }),
    );
    expect(setPointerCapture).not.toHaveBeenCalled();

    carousel.dispatchEvent(
      createPointerEvent("pointermove", {
        pointerId: 1,
        pointerType: "touch",
        clientX: 30,
        clientY: 100,
        button: 0,
      }),
    );
    expect(setPointerCapture).toHaveBeenCalledWith(1);
  });
});
