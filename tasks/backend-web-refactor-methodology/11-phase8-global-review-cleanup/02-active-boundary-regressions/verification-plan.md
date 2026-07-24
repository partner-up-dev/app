# `8-1` Verification Plan

## Focused

- PR-type/POI meeting-point transaction tests;
- Trade settlement and RideHailing fee-confirmation handoff tests;
- controller/fitness reporter fixtures; and
- architecture fitness twice, expecting deterministic `0 new` and
  `0 unresolved`.

## Canonical

- `pnpm check:static`;
- `pnpm test:unit:backend`;
- `pnpm test:scenario:backend`; and
- only the System journeys whose route/contract surfaces changed.

## Structural Assertions

- no caller imports the three private implementation paths;
- the new public surfaces export semantic operations only;
- no repository/executor/Drizzle type crosses the surface; and
- both eager and dynamic-inclusive SCC inventories are recorded.
