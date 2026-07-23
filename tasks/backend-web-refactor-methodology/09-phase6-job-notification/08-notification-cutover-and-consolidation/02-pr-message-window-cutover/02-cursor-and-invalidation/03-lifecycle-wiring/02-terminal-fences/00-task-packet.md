# `6-3.2b-3.2` — Terminal Transition And Attention Fences

## Status

**Locally complete; awaiting the shared final lifecycle matrix.** Participant
release and the `6-3.1h` transaction-owner-surface closure are locally
complete; terminal code uses the same executor-facing Notification factory
without a source-to-Job writer edge.

## Objective

Make `CLOSED` and `EXPIRED` PRs attention-terminal: the transition releases
all current recipients' windows, source creation does not schedule new
attention, and a stale generic job skips before channel I/O.

## Compatibility

This does not change existing message posting or visible-thread access. It
only governs `pr.message-summary` source eligibility and dispatch.

## Exit

Manual and temporal terminal transitions have the same atomic release shape,
and the context contract carries an explicit `PR_TERMINAL` skip result.

## Delivered

- `CLOSED` and temporal `CLOSED` / `EXPIRED` now use a named serializable
  `PR → active roster → status → exact window release` transition.
- A terminal PR still accepts compatible message persistence but cannot create
  a new generic attention reservation.
- Generic and concrete legacy dispatch both return `PR_TERMINAL` before
  channel I/O or credit consumption.
- The real-Postgres terminal scenario covers manual close, temporal close and
  expiry, source-time no-reopen, and both generic / legacy dispatch fences.
