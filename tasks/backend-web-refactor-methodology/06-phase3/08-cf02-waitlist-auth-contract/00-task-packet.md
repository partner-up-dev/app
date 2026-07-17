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

Header-only contract correction decided 2026-07-17; execution remains planned after `3-7`.

Decision evidence, options and recommendation: [`decision-brief.md`](./decision-brief.md).
