import type { PRAllowEditAfterReady } from "@partner-up-dev/backend";
import type { TimeWindow } from "@/domains/event/model/time-window-view";
import {
  buildFormModeDateKey,
  buildFormModeFuzzyTimeOptions,
  buildFormModeFuzzyTimeWindows,
  type FormModeFuzzyTimePreset,
  type FormModeTimeMode,
} from "@/domains/event/model/form-mode";

export type PRTimeWindowEditorMode = FormModeTimeMode;

export type PRTimeWindowPresetOption = {
  key: string;
  startAt: string;
  endAt: string;
  description: string | null;
};

export type PRTimeWindowPickerOption = {
  label: string;
  value: string;
};

export type PRTimeWindowEditorAllowEditAfterReady =
  PRAllowEditAfterReady | null;

export const timeWindowsEqual = (
  left: TimeWindow | null | undefined,
  right: TimeWindow | null | undefined,
): boolean =>
  (left?.[0] ?? null) === (right?.[0] ?? null) &&
  (left?.[1] ?? null) === (right?.[1] ?? null);

export const isCompleteTimeWindow = (
  timeWindow: TimeWindow | null | undefined,
): timeWindow is [string, string] =>
  typeof timeWindow?.[0] === "string" &&
  typeof timeWindow[1] === "string" &&
  timeWindow[0].length > 0 &&
  timeWindow[1].length > 0;

export const buildAllowEditAfterReadyForTimeWindowMode = (
  mode: PRTimeWindowEditorMode,
  timeWindow: TimeWindow | null,
): PRTimeWindowEditorAllowEditAfterReady => {
  if (mode !== "FUZZY" || !isCompleteTimeWindow(timeWindow)) {
    return null;
  }

  return {
    timeWindow: [timeWindow[0], timeWindow[1]],
  };
};

export const findFuzzyPresetForTimeWindow = (
  timeWindow: TimeWindow | null,
): {
  dateValue: string;
  timePreset: FormModeFuzzyTimePreset;
} | null => {
  if (!isCompleteTimeWindow(timeWindow)) {
    return null;
  }

  const dateValue = buildFormModeDateKey(timeWindow[0]);
  if (!dateValue) {
    return null;
  }

  for (const option of buildFormModeFuzzyTimeOptions()) {
    const [candidate] = buildFormModeFuzzyTimeWindows(dateValue, option.value);
    if (
      candidate &&
      candidate.startAt === timeWindow[0] &&
      candidate.endAt === timeWindow[1]
    ) {
      return {
        dateValue,
        timePreset: option.value,
      };
    }
  }

  return null;
};
