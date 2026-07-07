# Frontend Shared UI Primitives Unit TDD

## Role

The Frontend Shared UI Primitives unit preserves app-local rules for deciding
what belongs in `apps/web/src/shared/ui` and how shared primitives compose
with `@partner-up-dev/design-web`.

It is not a package API manual. Package-specific component props, slots,
events, and caveats belong to the `@partner-up-dev/design-web` Intent skill or
package docs.

## Durable Inputs

- Frontend architecture: `apps/web/src/ARCHITECTURE.md`
- Frontend component guidance: `apps/web/src/AGENTS.components.md`
- Frontend naming protocol: `apps/web/src/AGENTS.naming.md`
- Frontend styling rules: `apps/web/src/styles/AGENTS.md`
- Shared UI local pointer: `apps/web/src/shared/ui/AGENTS.md`
- Design package skill: `@partner-up-dev/design-web#design-web`

## Local Invariants

- `src/shared/ui` owns true cross-domain UI primitives only.
- A shared primitive must be reusable across multiple screens or domains, have
  a stable and intentionally narrow API, avoid domain-specific copy or workflow
  rules, and be describable as a primitive instead of a usage pattern.
- Repetition alone is not a promotion reason. If two surfaces look similar but
  carry different domain semantics, keep the component in the owning domain.
- When a matching `@partner-up-dev/design-web` component exists, compose it
  directly before creating local app primitives or wrappers.
- Import public package components and helper types from
  `@partner-up-dev/design-web`. Do not treat package implementation source
  files as consumer API.
- App-local shared primitives may own reusable treatment contracts only when
  HTML, interaction, and styling must move together.
- Domain vocabulary, backend-derived policy logic, workflow branching, and
  submission behavior stay in the owning domain or process layer.
- Extending a shared primitive API requires updating the local shared UI pointer
  in the same change so the contract remains discoverable.
- Styling decisions follow `src/styles/AGENTS.md`: use direct `sys` tokens
  first, add `dcs` only for real governed outputs, and keep ordinary local
  layout local.

## Failure / Drift Semantics

- If package component usage rules are copied into app docs, they can drift from
  the package skill. App docs should describe app-local selection and ownership,
  not every package prop.
- If shared primitives encode domain copy or workflow state, shared UI becomes a
  hidden domain layer and future domain changes become harder to isolate.
- If page-local wrappers are promoted before their API stabilizes, shared UI
  accumulates convenience abstractions that obscure the actual component
  contract.
- If primitive extensions do not update `apps/web/src/shared/ui/AGENTS.md`,
  agents may keep cloning old local patterns instead of using the governed API.

## Verification Expectations

For changes in this unit:

- Load the `@partner-up-dev/design-web#design-web` Intent skill before changing
  package component usage rules or selecting package primitives.
- Run frontend typecheck or build when shared primitive props, slots, emitted
  events, or imports change.
- Run `pnpm --filter @partner-up-dev/web lint:tokens` when shared primitive
  styles or token usage changes.
- Run `pnpm --filter @partner-up-dev/web lint:tokens:strict` only when
  intentionally working on token enforcement or baseline movement.
- Review whether a proposed shared component still satisfies the four shared
  primitive criteria before moving code into `src/shared/ui`.

## Local AGENTS Pointers To Keep

`apps/web/src/shared/ui/AGENTS.md` should remain the local primitive index
and quick edit-time pointer. It can list preferred primitives and app-specific
reuse rules, but package API details should stay with the design-web skill.
