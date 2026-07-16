import assert from "node:assert/strict";
import { test } from "vitest";
import type { PartnerRequestFields } from "../../entities/partner-request";
import {
  buildPartnerRequestParsePromptVariablesJson,
  buildXhsPosterHtmlPromptVariablesJson,
  buildXiaohongshuCaptionPromptVariablesJson,
} from "./prompt-variables";

type SharePromptVariables = {
  caption?: string;
  context: {
    time: {
      start: string | null;
      end: string | null;
      timeZone: string;
    };
  };
};

type PartnerRequestParsePromptVariables = {
  nowIso: string;
  nowWeekday: string | null;
  typeSelection: {
    priority: string[];
    observedPRTypes: string[];
    configuredPRTypes: string[];
  };
  userInput: string;
};

const buildPR = (time: PartnerRequestFields["time"]): PartnerRequestFields => ({
  title: "Badminton partner",
  type: "badminton",
  time,
  location: "Jing'an Sports Center",
  route: null,
  minPartners: 4,
  maxPartners: 8,
  partners: [1, 2],
  budget: null,
  preferences: [],
  notes: null,
});

const parseVariables = (json: string): SharePromptVariables =>
  JSON.parse(json) as SharePromptVariables;

const parsePRParseVariables = (json: string): PartnerRequestParsePromptVariables =>
  JSON.parse(json) as PartnerRequestParsePromptVariables;

test("XHS prompt variables expose UTC instants as product local time", () => {
  const variables = parseVariables(
    buildXhsPosterHtmlPromptVariablesJson(
      buildPR(["2026-05-04T06:00:00.000Z", "2026-05-04T08:30:00.000Z"]),
      "14:00 badminton needs 2",
    ),
  );

  assert.equal(variables.caption, "14:00 badminton needs 2");
  assert.equal(variables.context.time.start, "2026-05-04 14:00");
  assert.equal(variables.context.time.end, "2026-05-04 16:30");
  assert.equal(variables.context.time.timeZone, "Asia/Shanghai");
});

test("XHS caption variables share the same product local time contract", () => {
  const json = buildXiaohongshuCaptionPromptVariablesJson(
    buildPR(["2026-05-04T06:00:00.000Z", "2026-05-04T08:30:00.000Z"]),
  );
  const variables = parseVariables(json);

  assert.equal(variables.context.time.start, "2026-05-04 14:00");
  assert.equal(variables.context.time.end, "2026-05-04 16:30");
  assert.equal(json.includes("2026-05-04T06:00:00.000Z"), false);
});

test("XHS prompt variables preserve product-local date-time strings", () => {
  const variables = parseVariables(
    buildXhsPosterHtmlPromptVariablesJson(
      buildPR(["2026-05-04T14:00", "2026-05-04T16:30"]),
      "14:00 badminton needs 2",
    ),
  );

  assert.equal(variables.context.time.start, "2026-05-04 14:00");
  assert.equal(variables.context.time.end, "2026-05-04 16:30");
});

test("PR parse prompt variables expose type selection priority", () => {
  const variables = parsePRParseVariables(
    buildPartnerRequestParsePromptVariablesJson(
      "  找羽毛球搭子  ",
      "2026-05-17T04:00:00.000Z",
      "Sunday",
      {
        observedPRTypes: ["羽毛球搭子"],
        configuredPRTypes: ["飞盘活动"],
      },
    ),
  );

  assert.deepEqual(variables.typeSelection.priority, [
    "observedPRTypes",
    "configuredPRTypes",
    "newTypeWhenNoCandidateFits",
  ]);
  assert.deepEqual(variables.typeSelection.observedPRTypes, ["羽毛球搭子"]);
  assert.deepEqual(variables.typeSelection.configuredPRTypes, ["飞盘活动"]);
  assert.equal(variables.userInput, "找羽毛球搭子");
});
