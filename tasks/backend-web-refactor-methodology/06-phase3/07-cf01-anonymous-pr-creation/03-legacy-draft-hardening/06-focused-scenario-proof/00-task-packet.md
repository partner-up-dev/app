# 07C focused scenario proof

## Objective

Lock the accepted DRAFT ownership/privacy policy through focused backend scenarios and characterize the
authenticated create conflict residue without changing production cleanup behavior.

## Owned surface

- `apps/backend/tests/pr/pr-draft.scenario.test.ts`
- `apps/backend/tests/pr/pr-join-gates.scenario.test.ts`
- `apps/backend/tests/pr/pr-admin.scenario.test.ts`
- `apps/backend/tests/pr/pr-create.scenario.test.ts`
- directly coupled PR scenario kit helpers/probes

No Web, schema/migration, durable docs, global test infrastructure, or broad production changes are in scope.

## Acceptance evidence

- Creatorless and cross-user DRAFT reads/mutations/publish are opaque `404 PR_NOT_ACCESSIBLE` and preserve root,
  status, content, and active slots.
- Owner-bound DRAFT detail/content edit/publish follows existing business rules; status patch retains its existing
  publish-guidance `400`.
- DRAFT participant/read surfaces do not leak or write child state; OPEN behavior remains covered.
- Admin DRAFT access remains on `/api/admin/*`; ordinary USER admin access remains denied.
- Failed authenticated create conflict returns the pre-existing conflict problem and leaves an owner-bound DRAFT
  with zero participant slots; no cleanup is introduced.

## Explicit gap

Public/share/LLM DRAFT proof is recorded in exit evidence if no inexpensive stable HTTP seam exists. Full System and
browser proof remains 07E.
