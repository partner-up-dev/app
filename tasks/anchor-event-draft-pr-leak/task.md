# Anchor Event Draft PR Leak

## Objective & Hypothesis
Reality: Production `/e/2?mode=list` renders many real PR preview cards with `DRAFT` status. Local and staging did not reproduce, but production `/api/events/2` returns `DRAFT` PRs inside `browseTimeWindows`.

Hypothesis: The shared backend PR read service treats `visibilityStatus = VISIBLE` as public-visible without excluding `DRAFT`, and its active-visible predicate currently only excludes `CLOSED` and `EXPIRED`. Anchor Event detail consumes that read service directly, so draft PRs can leak into public event browsing.

## Guardrails Touched
- Public browse surfaces must not expose `DRAFT` PRs.
- `DRAFT` remains visible to its creator through creator-owned reads and PR detail authorization flows; this fix should not hide creator drafts from owner surfaces.
- Anchor Event List Mode should defensively render only public statuses for current/future date panels and `CLOSED` for expired panels.
- Backend public read semantics should be owned by `pr-core` read services rather than page-local filtering only.

## Verification
- Backend unit test for PR read status predicates and visible reads excluding `DRAFT`.
- Frontend/unit or type verification for List Mode defensive filtering when possible.
- Re-run focused frontend dummy/preview tests because recent dummy changes touched the same surface.
- Build/typecheck the affected apps.

## Evidence
- 2026-06-07 production `https://app.partner-up.cn/e/2?mode=list` showed 13 `草稿` cards.
- Production `https://api-app.partner-up.cn/api/events/2` returned status counts: `EXPIRED: 9`, `CLOSED: 4`, `DRAFT: 13`, `OPEN: 1`.

## Execution Notes
- Backend public-visible PR reads now exclude `DRAFT` after temporal status synchronization.
- Backend active-visible status is now explicit: `OPEN`, `READY`, and `ACTIVE` only.
- Anchor Event List Mode also defensively renders only `OPEN`, `READY`, and `ACTIVE` in current/future date panels, and only `CLOSED` in expired panels.

## Verification Results
- `pnpm --filter @partner-up-dev/backend test:unit -- apps/backend/src/domains/pr-core/services/pr-read.service.test.ts` passed: 1 file, 3 tests.
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/event/model/dummy-prs.test.ts apps/frontend/src/domains/pr/ui/primitives/PRPreviewCard.route.test.ts` passed: 2 files, 14 tests.
- `pnpm --filter @partner-up-dev/frontend build` passed.
