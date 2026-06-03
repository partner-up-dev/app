# Admin Commerce JSON Logic Visual Editor

## Objective & Hypothesis

Replace Admin Commerce JSON Logic text editing with a visual editor core that can
serve both Placement matching rules and PricingPolicy condition rules.

Hypothesis: a constrained JSON Logic editor with domain-provided field catalogs
keeps admin editing safe while avoiding duplicated Placement-only and
Pricing-only rule builders.

## Guardrails Touched

- Frontend Admin Commerce UX.
- Placement `matchingRule` must remain JSON Logic-compatible.
- PricingPolicy `conditionRule` must preserve existing `null` means always
  semantics.
- Unknown or unsupported JSON Logic rules must be shown as editable JSON text
  in preserve-custom mode instead of silently rewritten.
- Pages own container and save orchestration; content/editor components own
  local draft state and rule conversion.

## Verification

- `pnpm --filter @partner-up-dev/frontend exec vite build` passes.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` exits 0; it reports the
  pre-existing `MultiStopToggle.vue` baseline findings.
- `pnpm --filter @partner-up-dev/frontend build` is blocked by unrelated
  current-worktree Ordering/Ride-hailing type errors; filtered `vue-tsc` output
  shows no errors in the JSON Logic editor, Pricing Rules editor, or Placement
  Offer page files touched by this task.
- Placement default now builds `true`, a valid JSON Logic rule, instead of `{}`.
- PricingPolicy condition rules now use the same visual editor core while
  preserving existing custom rules.
- Preserve-custom mode now shows a JSON textarea and saves the parsed JSON
  Logic from that textarea.
