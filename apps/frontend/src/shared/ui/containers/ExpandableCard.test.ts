// @vitest-environment happy-dom

import { afterEach, describe, expect, test } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  type App,
  type Ref,
} from "vue";
import ExpandableCard from "./ExpandableCard.vue";

type MountedCard = {
  app: App<Element>;
  host: HTMLElement;
  stats: {
    mounted: number;
    unmounted: number;
  };
};

const mountedCards: MountedCard[] = [];

afterEach(() => {
  for (const mounted of mountedCards.splice(0)) {
    mounted.app.unmount();
    mounted.host.remove();
  }
});

describe("ExpandableCard", () => {
  test("keeps content mounted while collapsed when requested", async () => {
    const mounted = mountCard({
      keepContentMounted: true,
      defaultExpanded: ref(true),
      expandedResetKey: ref("initial"),
    });
    await nextTick();

    expect(mounted.stats.mounted).toBe(1);
    expect(mounted.stats.unmounted).toBe(0);

    getToggle(mounted.host).click();
    await nextTick();

    expect(
      mounted.host.querySelector("[data-testid='expensive-child']"),
    ).not.toBeNull();
    expect(getContentMotion(mounted.host).getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(getContentMotion(mounted.host).classList.contains("is-open")).toBe(
      false,
    );
    expect(mounted.stats.mounted).toBe(1);
    expect(mounted.stats.unmounted).toBe(0);
  });

  test("resets expansion state without remounting kept content", async () => {
    const defaultExpanded = ref(false);
    const expandedResetKey = ref("initial");
    const mounted = mountCard({
      keepContentMounted: true,
      defaultExpanded,
      expandedResetKey,
    });
    await nextTick();

    expect(getToggle(mounted.host).getAttribute("aria-expanded")).toBe("false");
    expect(mounted.stats.mounted).toBe(1);

    defaultExpanded.value = true;
    expandedResetKey.value = "expanded";
    await nextTick();

    expect(getToggle(mounted.host).getAttribute("aria-expanded")).toBe("true");
    expect(getContentMotion(mounted.host).classList.contains("is-open")).toBe(
      true,
    );
    expect(mounted.stats.mounted).toBe(1);
    expect(mounted.stats.unmounted).toBe(0);

    defaultExpanded.value = false;
    expandedResetKey.value = "collapsed";
    await nextTick();

    expect(getToggle(mounted.host).getAttribute("aria-expanded")).toBe("false");
    expect(
      mounted.host.querySelector("[data-testid='expensive-child']"),
    ).not.toBeNull();
    expect(getContentMotion(mounted.host).getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(mounted.stats.mounted).toBe(1);
    expect(mounted.stats.unmounted).toBe(0);
  });
});

const mountCard = ({
  keepContentMounted,
  defaultExpanded,
  expandedResetKey,
}: {
  keepContentMounted: boolean;
  defaultExpanded: Ref<boolean>;
  expandedResetKey: Ref<string>;
}): MountedCard => {
  const stats = {
    mounted: 0,
    unmounted: 0,
  };
  const ExpensiveChild = defineComponent({
    name: "ExpensiveChild",
    setup() {
      onMounted(() => {
        stats.mounted += 1;
      });
      onUnmounted(() => {
        stats.unmounted += 1;
      });
      return () => h("div", { "data-testid": "expensive-child" }, "content");
    },
  });
  const TestHost = defineComponent({
    setup() {
      return () =>
        h(
          ExpandableCard,
          {
            title: "Expandable",
            defaultExpanded: defaultExpanded.value,
            expandedResetKey: expandedResetKey.value,
            keepContentMounted,
          },
          {
            default: () => h(ExpensiveChild),
          },
        );
    },
  });
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(TestHost);
  app.mount(host);

  const mounted = {
    app,
    host,
    stats,
  };
  mountedCards.push(mounted);
  return mounted;
};

const getToggle = (host: HTMLElement): HTMLButtonElement => {
  const toggle = host.querySelector(".expandable-card__toggle");
  if (!(toggle instanceof HTMLButtonElement)) {
    throw new Error("ExpandableCard toggle not found");
  }
  return toggle;
};

const getContentMotion = (host: HTMLElement): HTMLElement => {
  const content = host.querySelector(".expandable-card__content-motion");
  if (!(content instanceof HTMLElement)) {
    throw new Error("ExpandableCard content motion wrapper not found");
  }
  return content;
};
