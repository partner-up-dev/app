import assert from "node:assert/strict";
import { test } from "vitest";
import {
  canonicalizePRTimeWindow,
  materializeNaturalLanguageTimeWindow,
} from "./pr-time-window-instant.service";

test("canonicalizePRTimeWindow accepts offset datetimes and stores UTC instants", () => {
  assert.deepEqual(
    canonicalizePRTimeWindow(["2026-06-27T00:00:00+08:00", "2026-06-27T01:00:00+08:00"]),
    ["2026-06-26T16:00:00.000Z", "2026-06-26T17:00:00.000Z"],
  );
});

test("materializeNaturalLanguageTimeWindow turns date-only into product-local all-day instants", () => {
  assert.deepEqual(materializeNaturalLanguageTimeWindow(["2026-06-27", null]), [
    "2026-06-26T16:00:00.000Z",
    "2026-06-27T16:00:00.000Z",
  ]);
});

test("materializeNaturalLanguageTimeWindow treats date-only end as exclusive next-day boundary", () => {
  assert.deepEqual(materializeNaturalLanguageTimeWindow(["2026-06-27", "2026-06-28"]), [
    "2026-06-26T16:00:00.000Z",
    "2026-06-28T16:00:00.000Z",
  ]);
});
