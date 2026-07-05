# Frontend Event Form Mode Unit TDD

## Role

The Frontend Event Form Mode unit preserves the local route-level UI
choreography for `/e/:eventId` when the landing mode is `FORM`.

Product TDD owns the cross-unit event-context contract. This Unit TDD owns the
frontend-local state machine, component boundaries, and interaction sequencing
that are easy to break while editing event-domain UI.

## Durable Inputs

- Product TDD event-context contract: `docs/20-product-tdd/event-context-contracts.md`
- Product TDD PR lifecycle contract: `docs/20-product-tdd/pr-lifecycle-contracts.md`
- Frontend architecture: `apps/frontend/src/ARCHITECTURE.md`
- Frontend component guidance: `apps/frontend/src/AGENTS.components.md`
- Event UI local pointer: `apps/frontend/src/domains/event/ui/AGENTS.md`
- PR preview primitive: `apps/frontend/src/domains/pr/ui/AGENTS.md`

## Local Invariants

- `/e/:eventId` owns the Form Mode journey as one route-level state machine:
  selection, recommendation request, matched handoff, no-match result, create
  fallback, and flow telemetry.
- `AnchorEventFormModeSurface.vue` owns cross-control flow and backend
  orchestration. Child controls own only local interaction state and emit
  committed values through narrow `v-model` or event contracts.
- Location and route controls must emit a concrete selected place. For route
  selections, the submitted route is `PR.route` shape, not route-pool entry
  identity, because the user may locally reverse a route-pool option.
- The no-match result is an inline state inside `/e/:eventId`, not a separate
  route or page-level feature fork.
- The PageHeader back action inside the no-match result returns to the Form Mode
  selection state.
- The `查看所有场次` action belongs to the selection state.
- The special long-press animation belongs to the Form Mode primary CTA only.
- Matched PR handoff state is route-level process state under
  `processes/route-handoff`, so the overlay can survive navigation from
  `/e/:eventId` to `/pr/:id`.
- Form Mode candidate cards should reuse the PR-domain `PRPreviewCard.vue` and
  provide caller-owned actions through its action slot instead of duplicating
  canonical PR facts in event UI.

## Failure / Drift Semantics

- If the route-level state is split across unrelated page and child component
  state, matched handoff, no-match back navigation, and telemetry can diverge.
- If child controls submit partial drafts instead of committed values, backend
  recommendation and auto-create requests can receive stale location, route,
  time, or preference state.
- If event UI copies PR detail facts instead of passing PR identity and caller
  context into PR-domain components, list, candidate, and detail surfaces can
  drift from `GET /api/pr/:id`.
- If no-match candidate UI becomes a separate route or feature fork, back
  behavior and long-press continuity become hard to reason about.
- If frontend code redefines recommendation eligibility, time matching, or
  auto-create authority, the change belongs in Product TDD / backend contracts
  first, not in this unit.

## Verification Expectations

For changes in this unit:

- Run frontend typecheck or build when Form Mode component contracts, route
  state, or PRPreviewCard integration changes.
- Run relevant frontend lint checks when moving component ownership or adding
  emitted events / props.
- For workflow changes, manually review the sequence:
  1. enter `/e/:eventId` in Form Mode
  2. change location or route, time, and preferences
  3. submit recommendation
  4. handle matched recommendation handoff
  5. handle no-match candidates
  6. return from no-match result to selection
  7. trigger zero-candidate create fallback when applicable
- If the behavior crosses backend recommendation, auto-create, join, or PR
  detail contracts, verify against `docs/20-product-tdd/event-context-contracts.md`
  and relevant scenario coverage instead of relying only on frontend build.

## Local AGENTS Pointers To Keep

`apps/frontend/src/domains/event/ui/AGENTS.md` should remain a local edit-time
pointer and hazard summary. It should not duplicate the full Form Mode state
machine once this Unit TDD doc is loaded.
