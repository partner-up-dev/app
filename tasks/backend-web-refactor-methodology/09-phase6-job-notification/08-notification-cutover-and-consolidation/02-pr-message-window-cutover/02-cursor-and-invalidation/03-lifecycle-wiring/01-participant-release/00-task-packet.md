# `6-3.2b-3.1` — Participant Window Release

## Status

**Complete.** The exact release hand-off is now inside all four membership
removal transactions. Focused evidence is recorded in
[`verification-log.md`](./verification-log.md).

## Objective

At the exact transaction that removes a participant from a PR, request
Notification to release that participant's `pr.message-summary` window for
the PR. Cover self exit, administrator release, temporal unconfirmed release,
and content-conflict release.

## Owner Boundary

- PR owns lock order, authorisation, membership mutation and its operation
  semantics.
- Notification owns the semantic-to-private-key mapping and transaction-bound
  release port.
- Job remains a generic held-reservation implementation detail.

## Exit

Each removal entrance uses the same narrowly named PR-to-Notification hand-off
inside its transaction; a removed recipient cannot revive the old held window
by rejoining.

## Non-Goals

- terminal status, admin message/root deletion, or subscription controller
  conversion;
- altering join/exit product rules;
- repairing finite pre-b3 former-recipient rows outside the chosen D08 policy.
