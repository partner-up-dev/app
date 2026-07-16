// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h } from "vue";
import type { PRDiscoveryLocationPlaceOption } from "@/domains/pr/model/pr-discovery-place-options";
import PRDiscoveryInlinePlaceSelector from "./PRDiscoveryInlinePlaceSelector.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => `${key}:${JSON.stringify(params ?? {})}`,
  }),
}));

vi.mock("@/domains/route/ui/RouteMap.vue", async () => {
  const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue");
  return { default: defineComponent({ setup: () => () => h("div") }) };
});

vi.mock("@/shared/map/Map.vue", async () => {
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

describe("PRDiscoveryInlinePlaceSelector", () => {
  it("uses PR-owned copy for coordinate fallback and place availability", () => {
    const options: PRDiscoveryLocationPlaceOption[] = [
      locationOption("time", "TIME_UNAVAILABLE"),
      locationOption("full", "MAX_REACHED"),
      locationOption("quota", "NONE", 2),
      locationOption("none", "NONE", null),
    ];
    const Host = defineComponent({
      setup: () => () =>
        h(PRDiscoveryInlinePlaceSelector, {
          modelValue: "none",
          options,
          label: "地点",
          placeholder: "请选择地点",
        }),
    });
    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp(Host);
    app.mount(host);
    mountedApps.push({ app, host });

    expect(host.querySelector(".inline-place-selector__fallback")?.textContent).toContain(
      'prDiscovery.createCard.locationMapFallback:{"place":"none"}',
    );
    const labels = Array.from(host.querySelectorAll("option"), (option) => option.textContent);
    expect(labels).toContain('prDiscovery.createCard.optionTimeUnavailable:{"locationId":"time"}');
    expect(labels).toContain('prDiscovery.createCard.optionMaxReached:{"locationId":"full"}');
    expect(labels).toContain(
      'prDiscovery.createCard.optionRemaining:{"locationId":"quota","count":2}',
    );
    expect(labels).toContain("none");
  });
});

const locationOption = (
  id: string,
  disabledReason: PRDiscoveryLocationPlaceOption["disabledReason"],
  remainingQuota: number | null = 0,
): PRDiscoveryLocationPlaceOption => ({
  kind: "location",
  id,
  locationId: id,
  label: id,
  gallery: [],
  coordinate: null,
  availableStartKeys: [],
  remainingQuota,
  disabled: disabledReason !== "NONE",
  disabledReason,
});
