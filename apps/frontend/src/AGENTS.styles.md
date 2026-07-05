# Frontend Style Guidance

This file owns app-local frontend styling governance.

Use `@partner-up-dev/design-web#design-web` for package visual foundation, variant vocabulary, shape defaults, and component-specific style caveats. This file should not duplicate package component API or design-web component rules.

## Ownership Model

- `ref` owns raw primitives only; ordinary components should not import it.
- `sys` owns app-wide semantic roles and is the default consumption layer.
- `dcs` owns narrow governed outputs that need central naming, such as page max width, bounded measures, or adaptive page typography.
- Shared UI primitives own reusable treatment contracts when the HTML, interaction, and styling must move together.

Each styling decision should have one owner. Do not recreate the same decision lower in the tree for convenience.

## Default Rule

Use direct `sys` tokens first.

Do not add `dcs`, a new primitive, or a new primitive variant just to wrap:

- one spacing, size, radius, or obvious semantic color token
- a trivial composition of existing `sys` values
- a local layout detail such as `margin: 0`, `width: fit-content`, or grid structure

Add or keep `dcs` only when the governed output itself needs central ownership and cannot be represented cleanly by existing `sys`.

If a style is domain-specific, page-specific, or only local structure, keep it local with direct `sys` tokens.

## Consumer Rules

Components, domain UI, pages, and sections may compose `sys`, narrow `dcs`, package components, and shared primitives.

They must not invent ordinary reusable styling infrastructure locally:

- no new fluid spacing/type curves
- no new reusable tint math
- no new shared interaction geometry
- no duplicated safe-area formulas outside scaffold primitives
- no private token namespaces that hide one-off values

## Local Exceptions

Landing-only adaptive curves, tint math, and `--landing-*` aliases may stay inside:

- `src/pages/HomePage.vue`
- `src/domains/landing/**`
- `src/domains/event/ui/sections/landing/**`

Splash and liquid-transition implementations may bypass token governance for local tint math and adaptive geometry when the values directly define splash physics, fill pressure, liquid waves, or route handoff reveal effects.

Keep both exceptions narrow. Ordinary layout, form controls, cards, and reusable UI primitives still follow the `sys`-first rule.

## Component Contract Boundary

Shared primitives may define private `--component-*` or component-prefixed CSS custom properties for their own geometry when the values are part of the primitive contract.

Keep those values inside the primitive and expose behavior through props or slots rather than leaking raw geometry to consumers.

## Guardrails

Run:

- `pnpm --filter @partner-up-dev/frontend lint:tokens`

Strict mode exists for enforcement work:

- `pnpm --filter @partner-up-dev/frontend lint:tokens:strict`

The token checker is baseline-backed. New findings outside the accepted baseline should be treated as regressions.
