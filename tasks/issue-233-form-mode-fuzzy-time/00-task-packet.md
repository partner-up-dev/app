# Issue 233 Form Mode Fuzzy Time

## Objective & Hypothesis

Support fuzzy time selection inside Anchor Event Form Mode recommendation while keeping persisted `PartnerRequest.time_window` exact-only.

Hypothesis: users can broaden recommendation input through a compact `FUZZY` time-control mode, while Form Mode emits concrete start-time match windows that the backend can use without understanding fuzzy UI concepts or Anchor Event time config.

## Current Direction

- `FormModeTimeControl` should emit one unified value for `NORMAL`, `ADVANCED`, and `FUZZY`.
- The recommendation input is `timeWindows: Array<{ startAt: string; endAt: string }>` and means PR start-time match windows.
- `timeWindows` are not PR duration windows. They match candidate PR `time_window[0]` only.
- `NORMAL` and `ADVANCED` emit point windows: `{ startAt, endAt: startAt }`.
- `FUZZY` emits a concrete interval window, for example `明天傍晚` -> tomorrow 17:00-19:00 in product local time.
- Point windows require exact startAt equality. Non-point windows use a half-open interval: `window.startAt <= prStartAt < window.endAt`.
- PR creation still needs a separate `createTimeWindow`, because PR `time_window` is a duration-bearing executable window.
- For `NORMAL`, `createTimeWindow` comes from the selected event start option.
- For `ADVANCED`, `createTimeWindow` is `startAt + event.durationMinutes`.
- For `FUZZY`, fallback create should derive an exact create start from the fuzzy recommendation window start and then apply event duration.
- Fuzzy date options are fixed from today forward for 7 days; they are not derived from Anchor Event `startOptions`.
- Fuzzy date aggregation items such as weekend and any-day are out of scope.
- Backend recommendation should receive concrete `timeWindows`, not `{ mode: "FUZZY", datePreset, timePreset }`.
- Backend recommendation candidate time match should not overlap candidate PR duration windows. It only checks candidate PR startAt against the submitted start-time windows.

## Guardrails Touched

- PR remains the executable collaboration object with one concrete `time_window` after creation.
- `FUZZY` is frontend UI input only and must not be persisted on PR or leak into the backend recommendation contract.
- Form Mode recommendation remains backend-authored.
- Event-assisted create fallback still creates an exact-time PR from a concrete `createTimeWindow`.
- Anchor Event time config must not constrain fuzzy recommendation matching; recommendation matching is against existing PR startAt values.

## Verification

- `pnpm --filter @partner-up-dev/frontend exec vitest run src/domains/event/model/form-mode.test.ts`
- `pnpm exec vitest run apps/backend/src/domains/anchor-event/use-cases/recommend-form-mode-prs.test.ts apps/backend/src/domains/anchor-event/services/form-mode.test.ts --project backend-unit`
- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm lint:backend`

## Next Verification To Add

- Frontend coverage for fixed 7-day fuzzy date options.
- Frontend coverage that `NORMAL` and `ADVANCED` emit point recommendation windows.
- Frontend coverage that fuzzy label and fuzzy recommendation window align, for example `明天傍晚`.
- Backend coverage that PR startAt inside a submitted window matches.
- Backend coverage that PR duration overlap does not match when PR startAt is outside the submitted window.
- System scenario coverage that Form Mode `FUZZY` submits concrete `timeWindows`, shows a fuzzy CTA label, and matches an existing PR whose `time_window[0]` falls inside the submitted window.

## Implementation Notes

- Frontend `FormModeTimeSelection` now carries `mode`, display `label`, recommendation `timeWindows`, and fallback `createTimeWindow`.
- `FUZZY` date options are fixed to today plus the next 6 product-local days.
- Recommendation requests send only concrete `timeWindows`; the backend no longer accepts fuzzy preset fields.
- Backend matching checks candidate PR `time_window[0]` against submitted windows; it does not use PR duration overlap.
- Added a system scenario for `明天傍晚` fuzzy selection matching a PR whose startAt is inside that submitted window.
