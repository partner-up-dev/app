// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, h } from "vue";
import type { PRDiscoveryCatalogItem } from "@/domains/pr/model/pr-discovery-types";
import PRDiscoveryCard from "./PRDiscoveryCard.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("vue-router", async () => {
  const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue");
  return {
    RouterLink: defineComponent({
      props: { to: { type: [String, Object], required: true } },
      setup(props, { slots, attrs }) {
        return () =>
          h(
            "a",
            {
              ...attrs,
              href:
                typeof props.to === "string"
                  ? props.to
                  : `${props.to.path}?type=${encodeURIComponent(String(props.to.query?.type ?? ""))}`,
            },
            slots.default?.(),
          );
      },
    }),
  };
});

vi.mock("@partner-up-dev/design-web", async () => {
  const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue");
  return {
    PuChip: defineComponent({
      setup:
        (_, { slots }) =>
        () =>
          h("span", slots.default?.()),
    }),
    PuChipGroup: defineComponent({
      setup:
        (_, { slots }) =>
        () =>
          h("div", slots.default?.()),
    }),
    PuImg: defineComponent({
      props: { src: { type: String, required: true } },
      setup: (props) => () => h("img", { src: props.src }),
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

describe("PRDiscoveryCard", () => {
  it("renders up to three unique POI names before location fallbacks", () => {
    const host = mountCard({
      pois: [
        { id: 1, name: " Library ", gallery: [] },
        { id: 2, name: "Library", gallery: [] },
        { id: 3, name: "Gym", gallery: [] },
        { id: 4, name: "Cafe", gallery: [] },
        { id: 5, name: "Park", gallery: [] },
      ],
      locationPool: ["Location fallback"],
    });

    expect(placeTagTexts(host)).toEqual(["Library", "Gym", "Cafe"]);
  });

  it("falls back to unique locationPool labels when POIs have no names", () => {
    const host = mountCard({
      pois: [{ id: 1, name: "  ", gallery: [] }],
      locationPool: [" Library ", "Library", "Studio", "Cafe", "Park"],
    });

    expect(placeTagTexts(host)).toEqual(["Library", "Studio", "Cafe"]);
  });

  it("keeps the cover priority explicit cover, POI gallery, then fallback gallery", () => {
    const explicitHost = mountCard({
      coverImage: " explicit.jpg ",
      pois: [{ id: 1, name: "Place", gallery: ["poi.jpg"] }],
      fallbackGallery: ["fallback.jpg"],
    });
    expect(coverImageSource(explicitHost)).toBe("explicit.jpg");

    const poiHost = mountCard({
      pois: [{ id: 1, name: "Place", gallery: [" poi.jpg "] }],
      fallbackGallery: ["fallback.jpg"],
    });
    expect(coverImageSource(poiHost)).toBe("poi.jpg");

    const fallbackHost = mountCard({
      pois: [{ id: 1, name: "Place", gallery: [] }],
      fallbackGallery: [" fallback.jpg "],
    });
    expect(coverImageSource(fallbackHost)).toBe("fallback.jpg");
  });

  it("uses a router link by default and a selectable surface in select mode", () => {
    const linkHost = mountCard({ type: "study" });
    expect(linkHost.querySelector("a")?.getAttribute("href")).toBe("/prd?type=study");

    const selectHost = mountCard({ type: "travel" }, { mode: "select" });
    expect(selectHost.querySelector("a")).toBeNull();
    expect(selectHost.querySelector(".pr-discovery-card--select")).not.toBeNull();
  });

  it("marks a disabled select surface and does not emit activation", () => {
    const clickedTypes: string[] = [];
    const host = mountCard(
      { type: "travel" },
      {
        mode: "select",
        disabled: true,
        onClick: (type) => clickedTypes.push(type),
      },
    );

    host
      .querySelector(".pr-discovery-card")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(host.querySelector(".pr-discovery-card")?.getAttribute("aria-disabled")).toBe("true");
    expect(clickedTypes).toEqual([]);
  });
});

const mountCard = (
  overrides: Partial<PRDiscoveryCatalogItem> = {},
  props: {
    mode?: "link" | "select";
    disabled?: boolean;
    onClick?: (type: string) => void;
  } = {},
): HTMLElement => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(() =>
    h(PRDiscoveryCard, {
      item: catalogItem(overrides),
      ...props,
    }),
  );
  app.mount(host);
  mountedApps.push({ app, host });
  return host;
};

const texts = (host: HTMLElement, selector: string): string[] =>
  Array.from(host.querySelectorAll(selector), (node) => node.textContent?.trim() ?? "");

const placeTagTexts = (host: HTMLElement): string[] =>
  texts(host, '[data-testid="prd.discovery-card.place-tags"] span');

const coverImageSource = (host: HTMLElement): string | null =>
  host.querySelector('[data-testid="prd.discovery-card.cover"] img')?.getAttribute("src") ?? null;

const catalogItem = (overrides: Partial<PRDiscoveryCatalogItem>): PRDiscoveryCatalogItem => ({
  type: "study",
  title: "Study together",
  description: "A description",
  coverImage: null,
  locationCount: 0,
  locationPool: [],
  routeCount: 0,
  routePool: [],
  pois: [],
  fallbackGallery: [],
  ...overrides,
});
