# Slice 6: Anchor Event Low-Risk States

## Objective & Hypothesis

Replace local loading, error, and no-data displays in low-risk Anchor Event
surfaces with package-owned feedback components. This should reduce local CSS
ownership without changing data fetching, routing, telemetry, or create flows.

## Guardrails Touched

- Frontend design-system consumer boundary: import public components from
  `@partner-up-dev/design-web`.
- Anchor Event user-facing surfaces:
  - list mode top-level loading/error and batch empty/exhausted states
  - card mode top-level loading/error state
  - other-events section loading state
  - landing highlights loading/error/empty state

## Explicit Deferrals

- Card Mode empty-stack create panel remains local in this slice because it
  owns assisted-create form controls and route/process behavior.
- Card swipe projection, splash handoff, long-press CTA, and matched handoff
  remain in Slice 7 because package substitution would affect interaction
  semantics.
- Page-level Anchor Event Landing shell states are not migrated here; that page
  needs a separate container/content split before swapping more state UI.

## Verification

- Passed: `pnpm --filter @partner-up-dev/frontend build`
- Passed: `pnpm --filter @partner-up-dev/frontend lint:tokens`
- Passed: `pnpm test:unit:frontend`
- Passed: source scan for removed local state classes in touched files.
- Passed: `git diff --check`
