# `6-3.1d` — New-Partner Atomic Vertical

## Status

**Locally complete.** The generic New Partner path has focused real-Postgres,
full backend unit/scenario, migration, static and build proof. The legacy
handler/cancellation remains an explicitly bounded pending-row drain; this is
not a delivery-data retirement claim.

## Objective

Migrate `pr.new-partner` after the transaction-bound handoff foundation. Its
owner mutation must atomically preserve the exact source-time recipient
snapshot associated with a joined/revived participant; current state cannot
reconstruct that historical fan-out.

This slice also introduces a durable active-admission-cycle identity on a
reusable Partner slot. A delayed Job must prove that it belongs to the current
admission cycle rather than merely observing the same slot and user later.

## Exit

Join/promotion commits its participant facts, active-admission cycle and
recipient-specific generic tasks in one transaction. The source snapshot keeps
the legacy eligibility rule (active PR participant other than the entrant,
active user with OpenID and available `NEW_PARTNER` credit), while dispatch
still removes recipients who later cease to be eligible. Channel configuration
and provider I/O remain dispatch-time work. Legacy new-partner Jobs remain
runnable for old rows.
