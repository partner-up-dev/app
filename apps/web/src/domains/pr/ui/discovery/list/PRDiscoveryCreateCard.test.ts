// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, reactive } from "vue";
import type {
  PRDiscoveryLocationPlaceOption,
  PRDiscoveryPlaceOption,
  PRDiscoveryPlaceSelection,
} from "@/domains/pr/model/pr-discovery-place-options";
import PRDiscoveryCreateCard from "./PRDiscoveryCreateCard.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@partner-up-dev/design-web", async () => {
  const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue");
  return {
    PuCard: defineComponent({
      setup(_, { slots }) {
        return () => h("section", slots.default?.());
      },
    }),
    PuButton: defineComponent({
      props: { disabled: Boolean },
      emits: ["click"],
      setup(props, { emit, slots }) {
        return () =>
          h(
            "button",
            {
              disabled: props.disabled,
              onClick: () => emit("click"),
            },
            slots.default?.(),
          );
      },
    }),
  };
});

vi.mock("@/domains/pr/ui/discovery/card/PRDiscoveryTimeWindowInlineEditor.vue", async () => {
  const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue");
  return {
    default: defineComponent({
      setup: () => () => h("div"),
    }),
  };
});

vi.mock("@/domains/pr/ui/discovery/card/PRDiscoveryInlinePlaceSelector.vue", async () => {
  const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue");
  return {
    default: defineComponent({
      setup: () => () => h("div"),
    }),
  };
});

vi.mock("@/domains/pr/ui/discovery/card/usePuCardAttention", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");
  return {
    usePuCardAttention: () => ({
      autoExpandHighlightActive: ref(false),
      cardDefaultExpanded: ref(false),
      cardResetKey: ref("test"),
    }),
  };
});

const mountedApps: Array<{ app: App<Element>; host: HTMLElement }> = [];

afterEach(() => {
  for (const mounted of mountedApps.splice(0)) {
    mounted.app.unmount();
    mounted.host.remove();
  }
});

describe("PRDiscoveryCreateCard place availability", () => {
  it("selects the first enabled place when a time-window change disables the previous place", async () => {
    const state = reactive<{ placeOptions: PRDiscoveryPlaceOption[] }>({
      placeOptions: [locationOption("a"), locationOption("b")],
    });
    const created: Array<PRDiscoveryPlaceSelection | null> = [];
    const Host = defineComponent({
      setup() {
        return () =>
          h(PRDiscoveryCreateCard, {
            type: "study",
            typeTitle: "学习",
            timeWindow: ["2099-01-01T04:00:00.000Z", "2099-01-01T05:00:00.000Z"],
            placeOptions: state.placeOptions,
            initialPlaceId: "a",
            onCreate: (place: PRDiscoveryPlaceSelection | null) => created.push(place),
          });
      },
    });
    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp(Host);
    app.mount(host);
    mountedApps.push({ app, host });

    host.querySelector("button")?.click();
    expect(created.at(-1)).toEqual({ kind: "location", location: "a" });

    state.placeOptions = [locationOption("a", true), locationOption("b")];
    await nextTick();
    host.querySelector("button")?.click();

    expect(created.at(-1)).toEqual({ kind: "location", location: "b" });
  });
});

const locationOption = (id: string, disabled = false): PRDiscoveryLocationPlaceOption => ({
  kind: "location",
  id,
  locationId: id,
  label: id,
  gallery: [],
  coordinate: null,
  availableStartKeys: [],
  remainingQuota: disabled ? 0 : 1,
  disabled,
  disabledReason: disabled ? "TIME_UNAVAILABLE" : "NONE",
});
