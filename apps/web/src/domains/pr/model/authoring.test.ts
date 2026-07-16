import { describe, expect, test } from "vitest";
import type { PRFormFields } from "@/domains/pr/model/types";
import type { PRAuthoringOptions } from "@/domains/pr/queries/usePRAuthoringOptions";
import {
  applyPRAuthoringCreateDefaults,
  resolvePRAuthoringCreateDefaultEligibility,
  resolvePRAuthoringCustomPreferenceLabels,
} from "./authoring";

const fields: PRFormFields = {
  title: undefined,
  type: "study",
  time: [null, null],
  location: null,
  route: null,
  minPartners: 2,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: [],
  notes: null,
  meetingPoint: null,
};

const options = {
  type: "study",
  creationAllowed: true,
  durationMinutes: 120,
  earliestLeadMinutes: 60,
  timeWindowEditorDefaultMode: "NORMAL" as const,
  authoringDefaults: { minPartners: 4, maxPartners: 8, notes: "带上教材" },
  startOptions: [
    {
      key: "slot-1",
      startAt: "2037-01-01T09:00:00.000Z",
      endAt: "2037-01-01T11:00:00.000Z",
      description: "上午",
      locationOptions: [],
      routeOptions: [],
    },
  ],
  locationOptions: [],
  routeOptions: [],
  preferenceTags: [],
  defaultSelection: null,
} satisfies PRAuthoringOptions;

describe("PR authoring defaults", () => {
  test("fills configured defaults and first time slot", () => {
    const result = applyPRAuthoringCreateDefaults(
      fields,
      options,
      resolvePRAuthoringCreateDefaultEligibility(fields, fields),
    );
    expect(result.minPartners).toBe(4);
    expect(result.maxPartners).toBe(8);
    expect(result.notes).toBe("带上教材");
    expect(result.time).toEqual([options.startOptions[0].startAt, options.startOptions[0].endAt]);
  });

  test("keeps discovery prefill facts", () => {
    const prefilled: PRFormFields = {
      ...fields,
      minPartners: 5,
      maxPartners: 6,
      notes: "用户备注",
      time: ["2037-02-01T10:00:00.000Z", "2037-02-01T11:00:00.000Z"],
      location: "图书馆",
      preferences: ["安静"],
    };
    const eligibility = resolvePRAuthoringCreateDefaultEligibility(prefilled, fields);
    expect(applyPRAuthoringCreateDefaults(prefilled, options, eligibility)).toEqual(prefilled);
  });

  test("uses an empty create baseline so prefilled time is not replaced", () => {
    const prefilled = {
      ...fields,
      time: ["2037-02-01T10:00:00.000Z", "2037-02-01T11:00:00.000Z"] as PRFormFields["time"],
    };
    const eligibility = resolvePRAuthoringCreateDefaultEligibility(prefilled, fields);
    const result = applyPRAuthoringCreateDefaults(prefilled, options, eligibility);
    expect(eligibility.time).toBe(false);
    expect(result.time).toEqual(prefilled.time);
  });

  test("keeps an explicit minPartners value even when it is 2", () => {
    const explicit = { ...fields, minPartners: 2 };
    const base = { ...fields, minPartners: 3 };
    const eligibility = resolvePRAuthoringCreateDefaultEligibility(explicit, base);
    expect(eligibility.minPartners).toBe(false);
    expect(applyPRAuthoringCreateDefaults(explicit, options, eligibility).minPartners).toBe(2);
  });
});

describe("PR authoring preference labels", () => {
  test("returns only normalized, deduplicated labels that are not published", () => {
    expect(
      resolvePRAuthoringCustomPreferenceLabels(
        [" 安静 ", "自带 球拍", "  自带   球拍 ", "早起", "早起", ""],
        ["安静", "已有"],
      ),
    ).toEqual(["自带 球拍", "早起"]);
  });

  test("compares published labels case-insensitively", () => {
    expect(resolvePRAuthoringCustomPreferenceLabels(["Quiet", "quiet ", "New"], ["QUIET"])).toEqual(
      ["New"],
    );
  });
});
