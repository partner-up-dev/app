# Anchor Event Dummy PRs

## Objective & Hypothesis
Intent: In Anchor Event `LIST` and `CARD_RICH` landing modes, show frontend-generated dummy PR opportunities that are not persisted PRs yet. When a user triggers the same "查看详情" intent used by real PR cards, the frontend materializes the corresponding system-owned PR and opens the PR detail.

Hypothesis: A bounded frontend projection can make empty or sparse event sessions feel actionable without changing backend PR discovery truth or mixing this behavior with automatic full-PR expansion. The projection should derive candidates from event create time windows, place pool options, and the published preference tag pool while excluding combinations that conflict with existing real PRs.

## Confirmed Product Decisions
- Dummy PRs are frontend orchestration only; they are not real PR records and are not automatic expansion sibling PRs.
- Dummy generation uses the event-derived create window data from Anchor Event detail rather than independently reimplementing raw `timePoolConfig`.
- Tag combinations are bounded to `no tag + one published tag`; no multi-tag combination generation in this slice.
- Dummy generation shows at most 3 dummy PRs globally, chooses at most 1 to 2 product-local dates, and should not force-fill to the cap.
- Triggering a dummy PR's "查看详情" intent is one-click create, with no confirmation step and without changing the primary action copy to "创建搭子请求".
- Dummy materialization is system-owned: it must not make the viewer the PR creator, must not auto-join the viewer, and must not run viewer time-window conflict checks.
- List/Card browse ordering should mix real PRs and dummy PRs in the same time/place neighborhood instead of appending dummy PRs as a separate block.
- Dummy generation should exclude options that conflict with real PRs, and should prefer candidates that differ from real PRs by time, place, and preference fingerprint as much as possible.
- If a dummy would match an existing real PR by time window and place, do not generate it.
- Dummy generation must not create more than one dummy for the same time-window and place pair; preference tags must not be used to fill duplicate-looking cards.
- PR preview cards show at most one inline preference label after place and before participant count, using the same meta-row treatment as time/place/count.
- List Mode PR card capacity text should hide `current` when it is `0`; keep the compact display as `👥 4` when max is 4.

## Guardrails Touched
- `/e/:eventId` landing behavior remains owned by Anchor Event frontend surfaces under `apps/frontend/src/domains/event`.
- Real PR browsing truth remains backend-authored through `browseTimeWindows` and demand cards; dummy PRs must stay distinct in code/data shape from persisted PR rows while using the same user-facing preview-card appearance.
- Manual event-assisted create must continue through `useEventAssistedPRCreateFlow` / `useCreateEventAssistedPR` and the unified structured PR create command.
- Dummy PR materialization uses an Anchor Event system-owned endpoint/use-case that creates `OPEN` PRs with no creator slot.
- Dummy creation must respect `canUserCreatePR`, disabled place options, past start windows, POI availability/capacity, and backend create rejection paths.
- Automatic full-PR expansion remains backend/event policy and must not be reused or renamed for this feature.
- Preference tag pool ownership remains Anchor Event-owned moderation state; if List/Card detail lacks published tags, expose only the smallest read contract needed or reuse an existing event read model intentionally.
- `PRPreviewCard.vue` belongs to the PR domain; capacity-display changes should stay generic and not leak Anchor Event dummy concepts into PR primitives.

## Likely Files
- `docs/10-prd/behavior/workflows.md`
- `docs/10-prd/behavior/rules-and-invariants.md`
- `apps/backend/src/domains/anchor-event/use-cases/get-event-detail.ts` if List/Card need published tag data in detail.
- `apps/frontend/src/domains/event/model/dummy-prs.ts` or equivalent new event-domain projection model.
- `apps/frontend/src/domains/event/model/demand-cards.ts`
- `apps/frontend/src/domains/event/ui/surfaces/AnchorEventListModeSurface.vue`
- `apps/frontend/src/domains/event/ui/surfaces/AnchorEventCardModeSurface/AnchorEventCardModeSurface.vue`
- `apps/frontend/src/domains/event/use-cases/useEventAssistedPRCreateFlow.ts`
- `apps/frontend/src/domains/pr/ui/primitives/PRPreviewCard.vue`
- Focused frontend model/unit tests and scenario coverage where practical.

## Open Implementation Questions
- Whether published preference tags should be added to Anchor Event detail or fetched through a separate frontend query already available to event surfaces.
- Dummy PR browse cards should keep the same visual treatment and primary "查看详情" intent as real PR cards; creation remains an implementation step before opening detail.

## Verification
- Add model tests for dummy generation:
  - only future enabled create windows participate
  - `no tag + single tag` only
  - real PR time/place conflicts are excluded
  - global dummy cap is 3 and date spread is bounded to 1 to 2 dates
  - candidate selection does not repeat dummy time/place pairs or use tags to fill duplicate slots
  - candidate diversity prefers staggered start times and different place/preference fingerprints when real PRs exist
- Add or update frontend tests for List Mode one-click dummy create using `entrySurface: "list_mode"`.
- Add or update frontend tests for Card Mode one-click dummy create using `entrySurface: "card_rich"`.
- Add PR card unit coverage for `current = 0, max = 4` displaying only `4`, preserving existing non-zero behavior such as `1/4`.
- Run `pnpm test:unit:frontend` or the narrower affected frontend Vitest project if available.
- Run `pnpm --filter @partner-up-dev/frontend lint:tokens` if visual token changes are made.

## Execution Notes
- 2026-06-05 Execute started after user confirmed "开始".
- Impact handshake:
  - Address and Object: Anchor Event PRD workflow/rules, backend Anchor Event detail read model, frontend event dummy projection, List/Card landing surfaces, event-assisted create inputs, and PR preview capacity label.
  - State Diff: List/Card only show real PR browse items -> List/Card may also show frontend-only dummy items that one-click create real PRs.
  - Blast Radius Forecast: `/e/:eventId` List/Card browsing, event-assisted create telemetry/input, frontend unit tests, and Anchor Event detail response type inference.
  - Invariants Check: dummy is not backend PR discovery truth, automatic full-PR expansion remains separate, disabled/past/unavailable create choices stay blocked, real PR detail navigation remains unchanged.
  - Verification: focused projection tests, PRPreviewCard capacity test, TypeScript/Vitest frontend verification.

## Verification Results
- 2026-06-07 Diagnose: production `/e/7` showed three visually identical dummy PR preview cards for the same date, time, and place. Root cause was per-date filling plus tag-only variation hidden by List preview cards.
- 2026-06-07 Execute: dummy generation now has a global dummy cap, a 1-2 date spread cap, real/dummy time-place de-duplication, start-time staggering, and inline one-tag PR preview display.
- 2026-06-07 Diagnose: dummy "查看详情" still used the authenticated event-assisted create path, so it ran viewer PR time-window conflict checks and treated the viewer as the creator/participant after publish.
- 2026-06-07 Execute target: dummy materialization moves to a system-owned Anchor Event endpoint. It should validate event/time/place/tag scope, return an existing visible PR for the same time/place if one exists, and otherwise create an `OPEN` PR with `createdBy = null` and no partner slot.
- 2026-06-07 Execute: List/Card dummy detail now calls the Anchor Event dummy materialization endpoint, routes to ordinary PR detail with `fromEvent`, and no longer emits PR commitment telemetry for dummy materialization.
- `pnpm --filter @partner-up-dev/backend typecheck` passed after the system-owned dummy materialization change.
- `pnpm --filter @partner-up-dev/backend test:unit -- apps/backend/src/domains/anchor-event/use-cases/materialize-dummy-pr.test.ts apps/backend/src/domains/pr-core/services/pr-read.service.test.ts` passed: 2 files, 5 tests.
- `pnpm --filter @partner-up-dev/frontend build` passed after the system-owned dummy materialization change.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/event/queries/useMaterializeDummyPR.test.ts apps/frontend/src/domains/event/queries/useCreateEventAssistedPR.test.ts apps/frontend/src/domains/event/model/dummy-prs.test.ts apps/frontend/src/domains/pr/ui/primitives/PRPreviewCard.route.test.ts` passed: 4 files, 18 tests.
- `pnpm --filter @partner-up-dev/frontend build` passed after the 2026-06-07 adjustment.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/event/model/dummy-prs.test.ts apps/frontend/src/domains/pr/ui/primitives/PRPreviewCard.route.test.ts` passed after the 2026-06-07 adjustment: 2 files, 14 tests.
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` exited 0 with no findings outside baseline after the 2026-06-07 adjustment.
- `pnpm test:unit:frontend` still fails before running `apps/frontend/src/pages/PRPage.creator-actions.test.ts` because Vite/Rollup parses `apps/frontend/src/locales/zh-CN.jsonc` as plain JS; the other 24 frontend unit files and 93 tests passed.
