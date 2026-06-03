import assert from "node:assert/strict";
import { test } from "vitest";
import type { PRRoute } from "../../../entities";
import { toAnchorEventRoutePlaceOptionView } from "./place-selector";

const route: PRRoute = [
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.0674, 113.2698],
    name: "广东外语外贸大学大学城校区北门",
    full_address: null,
  },
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.1405, 113.327],
    name: "广州南站西广场网约车上车点",
    full_address: null,
  },
];

test("route place option labels keep full endpoint names", () => {
  const option = toAnchorEventRoutePlaceOptionView({
    routePoolEntryId: "long-route",
    route,
    disabled: false,
    disabledReason: "NONE",
  });

  assert.equal(
    option.label,
    "广东外语外贸大学大学城校区北门~广州南站西广场网约车上车点",
  );
  assert.equal(option.label.length > 16, true);
});
