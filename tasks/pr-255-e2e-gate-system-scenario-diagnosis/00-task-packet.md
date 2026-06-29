# PR 255 E2E Gate System Scenario Diagnosis

## Objective & Hypothesis

Diagnose and fix GitHub Actions run:

- Run: `https://github.com/partner-up-dev/mvp-HA/actions/runs/28353679895`
- Job: `https://github.com/partner-up-dev/mvp-HA/actions/runs/28353679895/job/83991709228?pr=255`
- Job name: `e2e-gate`
- Failed step: `Run system scenario tests`

Hypothesis after diagnosis: the failure is real and locally reproducible. It is not caused by the payment admin scenario test change itself. The failures come from stale system assertions plus frontend regressions introduced by earlier page chrome/design-web migration.

## Current State

- Local branch: `develop`
- Local `HEAD`: `7f415098 fix(payment): align admin provider multi-active scenario`
- `origin/develop`: `7f415098`
- PR 255 head fetched as `origin/pr/255/head`: `7f415098`
- CI checkout merge ref: `a3a43022 Merge 7f415098... into fc79564...`
- Diff from `origin/develop` to PR merge ref only changes release metadata:
  - `.release-please-manifest.json`
  - `apps/backend/CHANGELOG.md`
  - `apps/backend/package.json`
  - `apps/frontend/CHANGELOG.md`
  - `apps/frontend/package.json`

Working tree has unrelated local changes that must not be staged unless explicitly requested:

- `.npmrc`
- `pnpm-workspace.yaml`
- deleted `scratch/OnePersonCompany-E2E-software-development.md`

## Guardrails Touched

- Frontend system scenarios under `tests/scenario/**`
- Frontend page shell / design-web slot usage
- Anchor event beta-group QR rendering
- Commerce rental ordering non-ready PR recovery assertions
- PR create form CTA rendering

No durable docs have been updated yet.

## Verification Already Run

Fetched the failing job logs through the GitHub Actions connector.

Local reproduction command:

```bash
pnpm test:scenario:system
```

Local result:

- 4 failed files / 6 passed
- 7 failed tests / 38 passed
- 3 unhandled errors from PR create waitForResponse promises

This confirms the failure is not CI-only.

## CI Failure Summary

CI failed in `e2e-gate > Run system scenario tests`.

The log explicitly shows failures in:

- `commerce/rental-ordering.scenario.test.ts`
  - `commerce_rental_ordering_blocks_non_ready_pr`
  - `commerce_rental_ordering_recovers_non_ready_pr_by_marking_ready`
- unhandled PR create waitForResponse errors from `pr-core/pr-create.scenario.test.ts`

Local full run additionally surfaced the same root classes more clearly:

- `anchor-event/anchor-event-landing-distribution.scenario.test.ts`
  - `anchor_event_list_mode_admin_only_highlights_beta_group_card`
- `pr-core/pr-detail-join.scenario.test.ts`
  - `pr_detail_join_success_shows_event_beta_group_followup`
- `pr-core/pr-create.scenario.test.ts`
  - all 3 PR create form scenarios failed because submit buttons were not found

## Root Causes

### 1. `PRCreatePage` Uses An Invalid `PuPageScaffold` Slot

File:

- `apps/frontend/src/pages/PRCreatePage.vue`

Evidence:

- `PRCreatePage.vue` puts `PRCreateFooterActions` under `<template #actions>`.
- `@partner-up-dev/design-web` `PuPageScaffold` supports only:
  - `default`
  - `aside`
  - `footer`
  - `header`
  - `pageHeader`
- `PuPageScaffold` does not support `actions`.

Effect:

- `PRCreateFooterActions` never renders.
- `pr-create.save-draft` and `pr-create.publish` are not in DOM.
- PR create tests time out while waiting/clicking these test IDs.
- The `page.waitForResponse(...)` promises then time out as unhandled rejections because no POST is ever made.

Likely fix:

- Move `PRCreateFooterActions` into `PuPageScaffold #footer`, or wrap it in a page-owned footer area.
- Keep `PageFooter variant="minimal"` only if layout still has a valid place for it, likely below main content or another footer-compatible region.

### 2. Rental Ordering Non-Ready PR Tests Assert Stale Copy

Files:

- `tests/scenario/commerce/rental-ordering.scenario.test.ts`
- `apps/frontend/src/pages/OrderingPage.vue`
- `apps/backend/src/domains/trade/use-cases/create-order.ts`

Evidence:

- Tests wait for: `订单创建需要 PR 处于 READY 状态`
- Current backend problem detail is: `创建订单需要搭子请求「已成团」`
- Current frontend PR-not-ready recovery dialog fallback also uses: `创建订单需要搭子请求「已成团」`

Effect:

- Dialog opens with title `暂不能创建订单`, but the test waits for obsolete detail copy and times out.

Likely fix:

- Update the two rental system scenario expected details to the current product copy:
  - `创建订单需要搭子请求「已成团」`
- Also update follow-up recovery dialog assertion if it still expects old copy:
  - Current frontend confirm dialog copy: `将当前搭子请求切换到「已成团」，此状态下不可以加入/退出。确认后请重新点击下单。`
  - Test currently expects: `这会立即将当前 PR 标记为已成团。确认后请重新点击下单。`

### 3. Beta Group QR Images Exist But Are Hidden

Files:

- `apps/frontend/src/domains/event/ui/primitives/AnchorEventBetaGroupCard.vue`
- `apps/frontend/src/domains/event/ui/primitives/AnchorEventBetaGroupQrPanel.vue`
- `tests/scenario/anchor-event/anchor-event-landing-distribution.scenario.test.ts`
- `tests/scenario/pr-core/pr-detail-join.scenario.test.ts`

Evidence:

- Playwright resolves the QR `<img>` elements, but reports them as hidden:
  - `locator resolved to hidden <img ... src="https://example.com/list-beta-group.png" ...>`
  - `locator resolved to hidden <img ... src="https://example.com/system-event-beta-group.png" ...>`
- Fixtures use `https://example.com/...` URLs.
- CSS gives the QR image width, but no stable height/aspect ratio:
  - `.anchor-event-beta-group-card__qr { width: min(100%, 220px); ... }`
  - `.beta-group-qr-panel__qr-image { width: min(100%, 240px); ... }`

Interpretation:

- When remote image loading fails or is blocked, the image has no intrinsic dimensions and becomes 0-height; Playwright therefore treats it as not visible even though the element exists.

Likely fix options:

- Prefer fixture-side fix: use deterministic local/data URL image fixtures for QR URLs in system scenarios.
- Also acceptable frontend hardening: give QR images stable dimensions/aspect ratio, e.g. `aspect-ratio: 1 / 1; object-fit: cover; display: block;`, so broken-but-present test fixtures do not collapse.

## Suggested Fix Plan

1. Fix `PRCreatePage` actions placement.
   - Move `PRCreateFooterActions` out of invalid `#actions`.
   - Use `#footer` or a valid page-level layout region.
   - Re-run `tests/scenario/pr-core/pr-create.scenario.test.ts`.

2. Update rental ordering stale assertions.
   - Replace old READY copy with current `已成团` wording.
   - Check both blocked and recovery flows.
   - Re-run `tests/scenario/commerce/rental-ordering.scenario.test.ts`.

3. Stabilize QR visibility.
   - Either replace system QR fixture URLs with local/data image URLs, or add stable QR image dimensions.
   - Re-run:
     - `tests/scenario/anchor-event/anchor-event-landing-distribution.scenario.test.ts`
     - `tests/scenario/pr-core/pr-detail-join.scenario.test.ts`

4. Run full system gate:

```bash
pnpm test:scenario:system
```

5. If passing, commit and push to `develop`.

## Implementation Update

Applied fixes:

- Moved `PRCreateFooterActions` from the unsupported `PuPageScaffold #actions` slot into the supported `#footer` slot in `PRCreatePage.vue`.
- Updated rental ordering PR-not-ready fallback copy and system scenario assertions to the current `已成团` product language.
- Updated the stale rental recovery button assertion from `去成团` to `切换到已成团`.
- Added stable square layout to Anchor Event beta-group QR images so externally unreachable fixture images do not collapse to a hidden zero-height image.

Verification:

```bash
pnpm exec biome check --write apps/frontend/src/pages/PRCreatePage.vue apps/frontend/src/pages/OrderingPage.vue apps/frontend/src/domains/event/ui/primitives/AnchorEventBetaGroupCard.vue apps/frontend/src/domains/event/ui/primitives/AnchorEventBetaGroupQrPanel.vue tests/scenario/commerce/rental-ordering.scenario.test.ts
pnpm exec vitest run --project system-scenario tests/scenario/pr-core/pr-create.scenario.test.ts tests/scenario/commerce/rental-ordering.scenario.test.ts tests/scenario/anchor-event/anchor-event-landing-distribution.scenario.test.ts tests/scenario/pr-core/pr-detail-join.scenario.test.ts
pnpm check:type:frontend
pnpm test:scenario:system
```

Results:

- Targeted system scenario files: 4 passed / 23 tests passed.
- Frontend type check: passed.
- Full system scenario gate: 10 passed / 45 tests passed.

## Follow-up CI Failure: PR Detail Edit Timezone

New failed job:

- Run: `https://github.com/partner-up-dev/mvp-HA/actions/runs/28355567358`
- Job: `https://github.com/partner-up-dev/mvp-HA/actions/runs/28355567358/job/83997627722?pr=255`
- Checkout ref: `99f043b908f3dcd73ceedb067caf3a75081ba485`
- Checkout meaning: `Merge f64f2decf5005107e7a8c221b2d640344696ffc1 into fc79564d13a56f17d88104fde2599cf321a18091`
- `develop` and `pull/255/head` are identical at `f64f2decf5005107e7a8c221b2d640344696ffc1`.

Failure:

- File: `tests/scenario/pr-core/pr-detail-edit.scenario.test.ts`
- Test: `pr_detail_ready_creator_edits_time_window_from_pr_page`
- Error: `page.waitForFunction: Timeout 10000ms exceeded`
- Location: wait for edit form initial values:
  - `startDate === "2030-01-01"`
  - `startTime === "00:00"`
  - `endDate === "2030-01-02"`
  - `endTime === "00:00"`

Diagnosis:

- The test fixture stores the time window as `2030-01-01T00:00:00+08:00` to `2030-01-02T00:00:00+08:00`.
- `DateTimeRangePicker` deserializes instants through `new Date(...)` and local browser time, by design.
- CI runner/browser context uses UTC unless pinned, so the first instant renders as `2029-12-31 16:00` instead of `2030-01-01 00:00`.
- Local reproduction confirms the root cause:

```bash
TZ=UTC pnpm exec vitest run --project system-scenario tests/scenario/pr-core/pr-detail-edit.scenario.test.ts
TZ=Asia/Shanghai pnpm exec vitest run --project system-scenario tests/scenario/pr-core/pr-detail-edit.scenario.test.ts
```

Results:

- `TZ=UTC`: failed with the same timeout.
- `TZ=Asia/Shanghai`: passed.

Corrected fix direction:

- Do not change the scenario browser timezone to match the test.
- Keep the browser context as the runtime truth for local date-time rendering.
- Update `tests/scenario/pr-core/pr-detail-edit.scenario.test.ts` so expected date/time input values are derived in the browser context from the fixture instants.
- The assertion should use browser-side `new Date(instant)` / local getters, matching `DateTimeRangePicker` behavior.
- This keeps the scenario valid under both CI UTC and local `Asia/Shanghai` browser contexts.
- Re-run:

```bash
TZ=UTC pnpm exec vitest run --project system-scenario tests/scenario/pr-core/pr-detail-edit.scenario.test.ts
TZ=UTC pnpm test:scenario:system
TZ=Asia/Shanghai pnpm exec vitest run --project system-scenario tests/scenario/pr-core/pr-detail-edit.scenario.test.ts
```

Implementation:

- Updated `tests/scenario/pr-core/pr-detail-edit.scenario.test.ts` to derive initial form input expectations from the browser context with `new Date(instant)` local getters.
- Updated the post-submit detail assertion to wait for the browser-local edited start date instead of hard-coding `2030-01-02`.
- Kept scenario browser timezone unchanged.

Verification:

```bash
TZ=UTC pnpm exec vitest run --project system-scenario tests/scenario/pr-core/pr-detail-edit.scenario.test.ts
TZ=Asia/Shanghai pnpm exec vitest run --project system-scenario tests/scenario/pr-core/pr-detail-edit.scenario.test.ts
```

Results:

- UTC target scenario: passed.
- Asia/Shanghai target scenario: passed.

## Notes For Next Agent

- The user asked for diagnosis only for the last turn, then asked to write this task packet because context is low.
- Do not assume all failures are caused by the latest payment scenario test commit. The E2E failures are reproducible on current `develop` and are frontend/system-scenario issues.
- Do not stage unrelated working tree changes listed in Current State.
