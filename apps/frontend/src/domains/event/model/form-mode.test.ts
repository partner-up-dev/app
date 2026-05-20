import { describe, expect, test } from "vitest";
import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";
import {
  buildAdvancedModeStartOptions,
  buildFormModeFuzzyTimeWindows,
  buildFormModeFuzzyDateOptions,
  buildFormModeFuzzyTimeOptions,
  buildFormModePointTimeWindows,
  formatFormModeFuzzySelectionLabel,
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

  test("buildFormModeFuzzyDateOptions derives fixed seven-day relative dates from now", () => {
    const options = buildFormModeFuzzyDateOptions(
      new Date("2026-05-19T01:00:00.000Z"),
    );

    expect(options).toHaveLength(7);
    expect(options.map((option) => option.label).slice(0, 2)).toEqual([
      "今天",
      "明天",
    ]);
    expect(options.map((option) => option.value)).toEqual([
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
      "2026-05-22",
      "2026-05-23",
      "2026-05-24",
      "2026-05-25",
    ]);
  });

  test("buildFormModeFuzzyTimeOptions returns fixed concrete time periods", () => {
    expect(buildFormModeFuzzyTimeOptions()).toEqual([
      { label: "上午", value: "MORNING", startTime: "06:00", endTime: "11:00" },
      { label: "中午", value: "NOON", startTime: "11:00", endTime: "13:00" },
      { label: "下午", value: "AFTERNOON", startTime: "13:00", endTime: "17:00" },
      { label: "傍晚", value: "DUSK", startTime: "17:00", endTime: "19:00" },
      { label: "夜晚", value: "NIGHT", startTime: "19:00", endTime: "23:00" },
      { label: "午夜", value: "LATE_NIGHT", startTime: "23:00", endTime: "06:00" },
    ]);
  });

  test("buildFormModePointTimeWindows emits a point window for exact modes", () => {
    expect(buildFormModePointTimeWindows("2026-05-19T06:00:00.000Z")).toEqual([
      {
        startAt: "2026-05-19T06:00:00.000Z",
        endAt: "2026-05-19T06:00:00.000Z",
      },
    ]);
  });

  test("buildFormModeFuzzyTimeWindows emits a concrete interval and matching label", () => {
    expect(buildFormModeFuzzyTimeWindows("2026-05-20", "DUSK")).toEqual([
      {
        startAt: "2026-05-20T09:00:00.000Z",
        endAt: "2026-05-20T11:00:00.000Z",
      },
    ]);
    expect(
      formatFormModeFuzzySelectionLabel(
        "2026-05-20",
        "DUSK",
        new Date("2026-05-19T01:00:00.000Z"),
      ),
    ).toBe("明天傍晚");
  });
});
