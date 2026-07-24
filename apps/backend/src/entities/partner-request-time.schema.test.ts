import assert from "node:assert/strict";
import { test } from "vitest";
import {
  naturalLanguagePartnerRequestFieldsSchema,
  partnerRequestFieldsSchema,
} from "../domains/pr/contracts/partner-request";

const baseFields = {
  title: "Badminton partner",
  type: "badminton",
  location: "Scenario Court",
  route: null,
  minPartners: 2,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: [],
  notes: null,
};

test("partnerRequestFieldsSchema accepts offset datetime PR time windows", () => {
  assert.equal(
    partnerRequestFieldsSchema.safeParse({
      ...baseFields,
      time: ["2026-06-27T00:00:00+08:00", "2026-06-27T01:00:00+08:00"],
    }).success,
    true,
  );
});

test("partnerRequestFieldsSchema rejects persisted date-only PR time windows", () => {
  assert.equal(
    partnerRequestFieldsSchema.safeParse({
      ...baseFields,
      time: ["2026-06-27", null],
    }).success,
    false,
  );
});

test("naturalLanguagePartnerRequestFieldsSchema keeps date-only as parse-only input", () => {
  assert.equal(
    naturalLanguagePartnerRequestFieldsSchema.safeParse({
      ...baseFields,
      time: ["2026-06-27", null],
    }).success,
    true,
  );
});
