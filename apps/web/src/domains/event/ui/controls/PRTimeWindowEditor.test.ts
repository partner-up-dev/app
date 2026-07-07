// @vitest-environment happy-dom

import { afterEach, describe, expect, test } from "vitest";
import { createApp, defineComponent, h, nextTick, ref, type App } from "vue";
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend";
import PRTimeWindowEditor from "./PRTimeWindowEditor.vue";
import type { TimeWindow } from "@/domains/event/model/time-window-view";
import type {
  PRTimeWindowEditorMode,
  PRTimeWindowPresetOption,
} from "@/domains/event/model/pr-time-window-editor";

const mountedApps: App[] = [];

const presetOptions: PRTimeWindowPresetOption[] = [
  {
    key: "preset-1",
    startAt: "2026-06-05T02:00:00.000Z",
    endAt: "2026-06-05T03:00:00.000Z",
    description: null,
  },
];

const mountEditor = async ({
  defaultMode,
  modelValue = null,
  durationMinutes = 60,
}: {
  defaultMode: PRTimeWindowEditorMode;
  modelValue?: TimeWindow | null;
  durationMinutes?: number | null;
}) => {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(
    defineComponent({
      setup() {
        const value = ref<TimeWindow | null>(modelValue);
        const allowEditAfterReady = ref<PRAllowEditAfterReady | null>(null);
        return () =>
          h(PRTimeWindowEditor, {
            modelValue: value.value,
            allowEditAfterReady: allowEditAfterReady.value,
            "onUpdate:modelValue": (nextValue: TimeWindow | null) => {
              value.value = nextValue;
            },
            "onUpdate:allowEditAfterReady": (
              nextValue: PRAllowEditAfterReady | null,
            ) => {
              allowEditAfterReady.value = nextValue;
            },
            presetOptions,
            durationMinutes,
            earliestLeadMinutes: 120,
            defaultMode,
          });
      },
    }),
  );
  app.mount(host);
  mountedApps.push(app);
  await nextTick();
  await nextTick();
  return host;
};

afterEach(() => {
  while (mountedApps.length > 0) {
    mountedApps.pop()?.unmount();
  }
  document.body.replaceChildren();
});

describe("PRTimeWindowEditor", () => {
  test("uses default mode for empty initial editor state", async () => {
    const host = await mountEditor({ defaultMode: "FUZZY" });

    expect(host.textContent).toContain("模糊");
  });

  test("external selected time window overrides default mode", async () => {
    const host = await mountEditor({
      defaultMode: "FUZZY",
      modelValue: [presetOptions[0].startAt, presetOptions[0].endAt],
    });

    expect(host.textContent).toContain("普通");
  });

  test("renders custom duration with dedicated label and input classes", async () => {
    const host = await mountEditor({
      defaultMode: "ADVANCED",
      durationMinutes: null,
    });

    const durationField = host.querySelector(
      ".pr-time-window-editor__duration-field",
    );
    const durationLabel = durationField?.querySelector(
      ".pr-time-window-editor__duration-label",
    );
    const durationInput = durationField?.querySelector<HTMLInputElement>("input");

    expect(durationLabel?.textContent).toContain("持续分钟");
    expect(
      durationField?.querySelector(".pr-time-window-editor__field-label"),
    ).toBeNull();
    expect(
      durationInput?.classList.contains("pr-time-window-editor__duration-input"),
    ).toBe(true);
  });
});
