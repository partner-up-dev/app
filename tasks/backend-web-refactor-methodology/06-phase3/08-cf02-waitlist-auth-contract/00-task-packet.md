# Slice 3-8 — CF-02 Waitlist Auth Contract

## Objective

Align the waitlist auth wording, typed HTTP contract, runtime session rotation and user-visible journey, removing
the stale `auth payload` claim without inventing a second authentication channel.

## Entry / Exit

- Entry: CF-01 exited and the auth transport seam is unchanged or explicitly documented.
- Exit: PR lifecycle/cross-unit truth agrees with runtime, Backend waitlist scenario and focused/full System proof
  are green, and the Phase 3 exit checklist has no open CF-01/CF-02 contradiction.

## Owned Surface

- The exact conflicting durable lines, waitlist response/handler seams and focused tests frozen at entry.

## Non-goals

- General session/OAuth redesign, notification delivery redesign or Commerce work.

## Status

Complete. 08A source trace confirms runtime alignment, 08B corrects the stale lifecycle claim, and 08C adds the
minimal Backend/Web regression proof plus final Phase 3 gates. CF-02 closes without an auth transport redesign.

Decision evidence, options and recommendation: [`decision-brief.md`](./decision-brief.md).

## Subtasks

- [08A — Trace Characterization](./01-trace-characterization/00-task-packet.md) — Complete
- [08B — Durable-doc Correction](./02-durable-doc-correction/00-task-packet.md) — Complete
- [08C — Focused Proof and Phase Exit](./03-focused-proof-phase-exit/00-task-packet.md) — Complete

CF-02 and Phase 3 are complete. See [`03-focused-proof-phase-exit/`](./03-focused-proof-phase-exit/) and the parent
[`../exit-evidence.md`](../exit-evidence.md) for the final command and scope evidence.
