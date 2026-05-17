import { describe, expect, test } from "vitest";
import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";
import {
  buildAdvancedModeStartOptions,
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
});
