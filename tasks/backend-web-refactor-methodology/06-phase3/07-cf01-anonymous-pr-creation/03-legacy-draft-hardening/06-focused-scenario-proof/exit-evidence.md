# 07C focused scenario proof exit evidence

Captured 2026-07-18. This packet records focused proof only; it does not mark 07C/07E or Phase 3 complete.

## Implemented proof

- `givenDraftPR` now persists the supplied creator as `createdBy`; passing `null` explicitly creates the legacy
  creatorless fixture. DRAFT slot initialization remains empty, matching the production create residue shape.
- Creatorless and cross-user detail/content/publish assertions now require opaque `404 PR_NOT_ACCESSIBLE`; root title,
  status, creator and child slot/message/gate/inbox state remain unchanged.
- Owner-bound DRAFT detail/content/publish is covered. Owner status patch retains the existing `400` “Use publish
  endpoint” guidance, and owner publish creates the expected OPEN creator slot. Other authenticated users remain opaque
  404.
- Creatorless DRAFT detail, join-gate projection/resolve, messages list/create/read-marker, profile and orders are
  covered for authenticated and anonymous reads where the route admits them; no child state is written. OPEN join-gate
  coverage remains unchanged.
- Dedicated admin DRAFT detail/content/status/messages/delete remains available through `/api/admin/*`; ordinary USER
  access is still `401` at the admin middleware boundary.
- Same-owner overlapping active PR creation returns `409 JOIN_TIME_WINDOW_CONFLICT` and leaves an owner-bound DRAFT
  residue with zero participant slots. No cleanup or child deletion was introduced.
- Public share cache get/cache endpoints reject DRAFT with opaque `404 PR_NOT_ACCESSIBLE` and do not write either cache.

## Validation

```text
pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario \
  apps/backend/tests/pr/pr-draft.scenario.test.ts \
  apps/backend/tests/pr/pr-join-gates.scenario.test.ts \
  apps/backend/tests/pr/pr-admin.scenario.test.ts \
  apps/backend/tests/pr/pr-create.scenario.test.ts
PASS — 4 files, 18 tests

pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario \
  apps/backend/tests/pr/pr-route.scenario.test.ts
PASS — 1 file, 3 tests

Final formatted rerun across all five files
PASS — 5 files, 21 tests

pnpm check:type:backend
PASS — tsc --noEmit

pnpm check:build:backend
PASS — backend and db-migrate-fc bundles built

git diff --check
PASS
```

The first focused run exposed an admin fixture setup issue (`PR_TYPE_CONFIG_REQUIRED`); the fixture now creates an
explicit configured PR type and the rerun is green. No production source was changed by this proof packet.

## Remaining gap / handoff

- No LLM generation request was added because it invokes the external AI provider. Public canonical detail and stable
  share cache seams are proved here; LLM/provider/browser and full cross-unit System proof remain 07E.
- Failed-create residue is characterization only. Historical rows and questionnaire/child data were not deleted or
  rewritten.
