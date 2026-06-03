# Task Packet - Anchor Event List Auto Expand Create Card

## MVT Core

- Objective & Hypothesis: improve Anchor Event Page list mode so the batch-scoped `create-pr-card` auto-expands when the currently selected batch has no available Anchor PR candidates. Hypothesis: the existing event-detail payload plus a local list-mode expansion default keyed by selected batch is sufficient, with no backend contract change.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md` rule that users may create through the controlled event-page flow when the current batch or location has no suitable Anchor PR
  - frontend event-domain ownership for Anchor Event list-mode behavior
  - shared primitive stability: keep `ExpandableCard` generic and avoid widening its API for a page-local behavior
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`

## Execution Notes

- Input Type: Intent
- Active Mode: Execute
- Scope Decision:
  - keep the change inside Anchor Event list-mode components
  - treat available Anchor PRs as the joinable statuses already used elsewhere in frontend/backend flow (`OPEN` / `READY`)
  - reset the create-card initial expansion when the user switches batches
  - after batch switches, delay auto-expansion by 1 second and add a local visual attention flash without widening shared primitive APIs
- Excluded for this issue:
  - backend filtering or serialization changes
  - list-mode PR visibility or ordering changes
  - broad fully controlled `ExpandableCard` state behavior

## Follow-up Notes

- 2026-05-17: List Mode creation card should preserve mounted content while collapsed because its time-window and place-selector controls can own expensive setup. `ExpandableCard` now has a narrow `keep-content-mounted` contract and an `expanded-reset-key` reset path so this card can hide collapsed content without remounting it during auto-expand resets.
- Follow-up: `keep-content-mounted` preserves the collapse / expand animation with a CSS grid-row, opacity, and transform transition instead of `hidden`, so content stays mounted while the visible motion remains intact.
- 2026-05-18: The List Mode create-card auto-expand context now keys by event id and selected date only. The selected create start time is form state, not browse context; keeping it in the key caused custom start-time edits to collapse the card and replay auto-expand.
