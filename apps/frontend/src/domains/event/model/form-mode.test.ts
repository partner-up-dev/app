import { describe, expect, test } from "vitest";
import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";
import {
  buildAdvancedModeStartOptions,
  buildFormModeFuzzyDateOptions,
  buildFormModeFuzzyTimeOptions,
  filterStartOptionsByFuzzyTime,
  shouldAutoOpenAdvancedFormModeTime,
} from "./form-mode";

type StartOption = AnchorEventFormModeResponse["startOptions"][number];

const now = new Date("2026-05-17T10:02:00.000Z");

const presetStartOption = {
  key: "preset-1",
  startAt: "2026-05-17T11:00:00.000Z",
  endAt: "2026-05-17T12:00:00.000Z",
  description: null,
} satisfies StartOption;

describe("form mode time options", () => {
  test("buildAdvancedModeStartOptions rounds from now and stops at earliest lead boundary", () => {
    expect(buildAdvancedModeStartOptions(15, now).map((option) => option.startAt))
      .toEqual([
        "2026-05-17T10:05:00.000Z",
        "2026-05-17T10:10:00.000Z",
        "2026-05-17T10:15:00.000Z",
      ]);
  });

  test("shouldAutoOpenAdvancedFormModeTime opens when no preset time is available and earliest lead can produce options", () => {
    expect(shouldAutoOpenAdvancedFormModeTime([], 15, now)).toBe(true);
  });

  test("shouldAutoOpenAdvancedFormModeTime keeps preset mode when preset time is available", () => {
    expect(
      shouldAutoOpenAdvancedFormModeTime([presetStartOption], 15, now),
    ).toBe(false);
  });

  test("shouldAutoOpenAdvancedFormModeTime stays closed when earliest lead cannot produce options", () => {
    expect(shouldAutoOpenAdvancedFormModeTime([], null, now)).toBe(false);
  });

  test("buildFormModeFuzzyDateOptions derives relative date presets from start options", () => {
    const options = buildFormModeFuzzyDateOptions(
      [
        {
          key: "today-afternoon",
          startAt: "2026-05-19T06:00:00.000Z",
          endAt: "2026-05-19T08:00:00.000Z",
          description: null,
        },
        {
          key: "tomorrow-night",
          startAt: "2026-05-20T12:00:00.000Z",
          endAt: "2026-05-20T14:00:00.000Z",
          description: null,
        },
      ],
      new Date("2026-05-19T01:00:00.000Z"),
    );

    expect(options.map((option) => option.label)).toContain("今天");
    expect(options.map((option) => option.label)).toContain("明天");
    expect(options.at(-1)).toMatchObject({
      label: "任一天",
      value: "ANY_DAY",
    });
  });

  test("filterStartOptionsByFuzzyTime filters by product-local start hour", () => {
    const options: StartOption[] = [
      {
        key: "afternoon",
        startAt: "2026-05-19T06:00:00.000Z",
        endAt: "2026-05-19T08:00:00.000Z",
        description: null,
      },
      {
        key: "night",
        startAt: "2026-05-19T12:00:00.000Z",
        endAt: "2026-05-19T14:00:00.000Z",
        description: null,
      },
    ];

    expect(buildFormModeFuzzyTimeOptions(options).map((option) => option.value))
      .toEqual(["AFTERNOON", "NIGHT", "ANY_TIME"]);
    expect(
      filterStartOptionsByFuzzyTime(
        options,
        "DATE:2026-05-19",
        "AFTERNOON",
      ).map((option) => option.key),
    ).toEqual(["afternoon"]);
  });
});
