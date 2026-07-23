# `6-3.1f` — Meeting-Point Atomic Vertical

## Status

**Locally complete.** The generic owner/runtime, transaction foundation and
all three source writers now have full backend unit/scenario proof. Cross-source
consolidation removed every new concrete meeting-point creation edge while a
real pending legacy row still executes through its retained compatibility
handler. The implementation is deliberately split into six independently
verifiable sub-task folders below. This packet is the parent coordination
record; each source writer stays a named, source-owned transaction rather than
using a generic cross-domain transaction helper.

## Objective

Migrate `pr.meeting-point-updated` after the transaction bridge. It preserves
the product's per-update behavior across PR-content, PR-type and POI update
entrances; “only notify the latest location” is not an allowed simplification.

## Frozen Product Semantics

- There are three source families, not merely three HTTP routes:
  PR-content (including admin and user routes that converge on the same
  command), PR-type coordination, and admin POI update.
- A real effective-meeting-point change creates a distinct event. A type or
  POI mutation can create several per-PR events; every affected PR gets its
  own fan-out and cause.
- An event carries its source-time description and timestamp. Dispatch may
  reject a now-ineligible recipient, but must never replace a queued event's
  description with the latest effective location.
- Preserve the existing detector: source-only changes with equal description
  and image do not notify, and a next effective meeting point with no usable
  description creates no notification. A future “meeting point removed”
  product message needs its own intent and template.
- Source-time eligibility is active PR participation, active user, bound
  OpenID, and available meeting-point subscription credit. Dispatch rechecks
  the same mutable facts before provider I/O or credit consumption.

## Owner Boundary

- The source owner owns its row lock, source mutation, effective before/after
  observation, source event identity, and transaction boundary.
- Notification owns per-recipient option filtering, generic task policy,
  private Job identity, rendering, channel mapping, dispatch revalidation and
  credit handling.
- Job owns only durable execution mechanics. No Opportunity, Delivery, Wave,
  or generic outbox table is introduced.
- The old concrete WeChat handler, payload decoder, Opportunity/Delivery
  writes and cancellation prefix survive solely to drain already-pending rows.

## Sub-task Map

| Order | Folder | Atomic responsibility | Cheapest exit proof |
| --- | --- | --- | --- |
| 1 | [01-notification-owner-contract-runtime](./01-notification-owner-contract-runtime/00-task-packet.md) | Make the generic template executable end-to-end without changing a source writer. | Owner/runtime/channel unit proof of immutable payload, once-per-cause identity, revalidation and provider mapping. |
| 2 | [02-effective-change-transaction-foundation](./02-effective-change-transaction-foundation/00-task-packet.md) | Make effective-point reads and named Notification handoff transaction-bound and executor-aware. | Transaction-local snapshot/port test; no global scheduler edge remains in the shared helper. |
| 3 | [03-pr-content-atomic-source](./03-pr-content-atomic-source/00-task-packet.md) | Cut over the PR-content source family. | Writer failure leaves the core PR write and generic Jobs absent. |
| 4 | [04-pr-type-atomic-source](./04-pr-type-atomic-source/00-task-packet.md) | Cut over PR-type coordination across all affected PRs. | Config mutation and all generic fan-out roll back together. |
| 5 | [05-poi-atomic-source](./05-poi-atomic-source/00-task-packet.md) | Move POI update behavior out of the controller and cut it over atomically. | POI rename/update preserves old-plus-new name impact and rolls back with Jobs. |
| 6 | [06-cross-source-proof-and-legacy-drain](./06-cross-source-proof-and-legacy-drain/00-task-packet.md) | Prove all sources, remove creation callers, and promote durable truth. | Three entrance scenarios, rapid-change proof, static legacy inventory, full gates. |

## Exit

Each real update receives a distinct source causation and commits its current
recipient fan-out with the update. All three sources route to the same
Notification policy; pending legacy rows remain executable.
