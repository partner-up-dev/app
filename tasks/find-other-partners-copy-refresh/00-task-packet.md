# Task Packet - Find Other Partners Copy Refresh

## MVT Core

- Objective & Hypothesis: Replace frontend user-facing copy such as `看看其它活动` with `找其它搭子` where the product intent is partner discovery rather than literal event catalog wording. Hypothesis: the primary mutation is frontend locale copy plus a narrow set of naming cleanups around CTA-oriented keys and local variables, while event-catalog owner names should remain event-shaped unless the product truth itself changes.
- Guardrails Touched:
  - docs/10-prd workflow truth that the secondary browsing path is currently other active Anchor Events
  - frontend naming clarity so internal names continue to match the actual queried data shape
  - locale/schema consistency between `zh-CN.jsonc`, schema typing, and consuming Vue surfaces
- Verification:
  - passed targeted frontend search proving no stale `看看其它活动` / `discoverOthers` remains in frontend source
  - passed `pnpm --filter @partner-up-dev/frontend build`

## Current Understanding

- The current CTA copy is concentrated under `anchorEvent.otherEvents.*` and `anchorEvent.discoverOthers`.
- The main consuming surfaces are Anchor Event landing, Anchor Event list mode, and PR detail's Event Plaza entry.
- The actual queried data is still `Anchor Event` catalog data from `useAnchorEvents()`, not partner-request lists.
- The approved execution scope is to refresh partner-discovery phrasing while preserving event-shaped internal owners.

## Confirmed Constraints

- User-facing Chinese copy should move toward `找其它搭子`.
- Exploration and task-packet work are allowed before explicit start.
- Product-code mutation requires explicit user start.

## Next Step

- Done. Keep only literal event semantics such as other-event reminder/admin copy, and remove stale CTA wording from partner-discovery surfaces.
