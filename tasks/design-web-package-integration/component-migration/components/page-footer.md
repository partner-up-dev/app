# PageFooter Padding Correction

## Target

- Local owner: `apps/frontend/src/shared/ui/sections/PageFooter.vue`.
- Package target: no direct package footer component; this is app product
  chrome composed inside `PuPageScaffold` footer surfaces.
- Desired final state: `PageFooter` has explicit, token-based top, bottom, left,
  and right padding defaults without shifting ownership away from
  `PuPageScaffold`.

## Current Contract

- Public props: `variant?: "minimal" | "brand"`.
- Slots: none.
- Events: none.
- Attrs / `data-testid`: attrs may be passed by page call sites and must stay on
  the rendered footer root.
- Accessibility: footer landmark plus navigation labels and legal links must
  remain unchanged.

## Migration Shape

- From: brand footer padding relies on custom properties for top/inline values
  that can default to `0`; minimal footer only has top padding.
- To: define complete block and inline padding defaults with existing spacing
  tokens and safe-area bottom behavior.
- Compatibility strategy: change only `PageFooter.vue`; do not alter page call
  sites or introduce a package-internal footer dependency.
- Actual result: brand footer now has top/left/right/bottom fallbacks with
  landing spacing when available and `sys` spacing otherwise; minimal footer now
  has right/bottom/left padding in addition to its existing top padding.

## Risks

- Runtime: low; static style correction only.
- Visual: medium on landing and PR/profile support footers because vertical
  rhythm and reveal-footer spacing can move.
- Tests: low; existing mocks may not detect visual padding.

## Verification

- Build: `pnpm --filter @partner-up-dev/frontend build` - passed.
- Token lint: `pnpm --filter @partner-up-dev/frontend lint:tokens` - passed.
- Unit tests: `pnpm test:unit:frontend` - passed.
- Browser smoke: Home brand footer and PR detail minimal footer on a 390x844
  viewport - passed. Computed padding values were non-zero on all four sides.
