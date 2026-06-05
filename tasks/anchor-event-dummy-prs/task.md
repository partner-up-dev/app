# Anchor Event Dummy PRs

## Objective & Hypothesis
Intent: In Anchor Event `LIST` and `CARD_RICH` landing modes, show frontend-generated dummy PR opportunities that are not persisted PRs yet. When a user triggers the same "查看详情" intent used by real PR cards, the frontend immediately creates the corresponding event-assisted PR through the unified PR create command and opens the created PR detail.

Hypothesis: A bounded frontend projection can make empty or sparse event sessions feel actionable without changing backend PR discovery truth or mixing this behavior with automatic full-PR expansion. The projection should derive candidates from event create time windows, place pool options, and the published preference tag pool while excluding combinations that conflict with existing real PRs.

## Confirmed Product Decisions
- Dummy PRs are frontend orchestration only; they are not real PR records and are not automatic expansion sibling PRs.
- Dummy generation uses the event-derived create window data from Anchor Event detail rather than independently reimplementing raw `timePoolConfig`.
- Tag combinations are bounded to `no tag + one published tag`; no multi-tag combination generation in this slice.
- Each product-local date shows at most 3 browse opportunities total, counting real PRs and dummy PRs together.
- Triggering a dummy PR's "查看详情" intent is one-click create, with no confirmation step and without changing the primary action copy to "创建搭子请求".
- List/Card browse ordering should mix real PRs and dummy PRs in the same time/place neighborhood instead of appending dummy PRs as a separate block.
- Dummy generation should exclude options that conflict with real PRs, and should prefer candidates that differ from real PRs by time, place, and preference fingerprint as much as possible.
- If a dummy would match an existing real PR by time window, place, and preference fingerprint, do not generate it.
- List Mode PR card capacity text should hide `current` when it is `0`; keep the compact display as `👥 4` when max is 4.

## Guardrails Touched
- `/e/:eventId` landing behavior remains owned by Anchor Event frontend surfaces under `apps/frontend/src/domains/event`.
- Real PR browsing truth remains backend-authored through `browseTimeWindows` and demand cards; dummy PRs must stay distinct in code/data shape from persisted PR rows while using the same user-facing preview-card appearance.
- Event-assisted create must continue through `useEventAssistedPRCreateFlow` / `useCreateEventAssistedPR` and the unified structured PR create command.
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
- The exact mixed sort scoring when real PRs and dummy PRs share a date: start time first is expected, but place/tag diversity should break ties to avoid duplicates around existing PRs.
- Dummy PR browse cards should keep the same visual treatment and primary "查看详情" intent as real PR cards; creation remains an implementation step before opening detail.

## Verification
- Add model tests for dummy generation:
  - only future enabled create windows participate
  - `no tag + single tag` only
  - real PR exact conflicts are excluded
  - per-date cap counts real PRs and dummy PRs together
  - candidate diversity prefers different time/place/preference fingerprints when real PRs exist
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
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/event/model/dummy-prs.test.ts apps/frontend/src/domains/pr/ui/primitives/PRPreviewCard.route.test.ts` passed: 2 files, 10 tests.
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` exited 0 with only pre-existing commerce `color-mix` findings in `RentalOrderingContent.vue` and `RideHailingSkuCard.vue`; this slice added no new token-governance finding.
- `pnpm test:unit:frontend` still fails before running `apps/frontend/src/pages/PRPage.creator-actions.test.ts` because Vite/Rollup parses `apps/frontend/src/locales/zh-CN.jsonc` as plain JS; the other 24 frontend unit files and 93 tests passed.
