# `6-3.1g` — Waitlist-Alternative Pure Recovery Vertical

## Status

**Locally complete.** The pure PR projection, named reconciler, typed generic
owner path and controller/candidate/source callers are cut over. The concrete
source scheduler and Opportunity creation are gone; only the old payload
decoder/handler, Delivery accounting and prefix cancellation remain as a
pending-row drain path. See [`verification-log.md`](./verification-log.md).

## Objective

Migrate `pr.waitlist-alternative-available` through a pure current-state query
and named reconciler. Its current scheduling and dispatch paths call temporal
refresh, which can mutate PR state; that reverse dependency must disappear
before the generic owner owns eligibility.

## Frozen Target Semantics

- This is a recoverable current-state family, not an atomic availability
  event. A named PR reconciler may recreate one currently valid task after a
  missed request; it must not manufacture an event/outbox row.
- One source identity is the tuple `(sourcePartnerId, waitlistCycleId,
  candidatePrId)`, scoped by the recipient. A reusable Partner row receives a
  new `waitlistCycleId` on every PENDING re-entry, so the cycle is mandatory in
  the generic payload, causation and dispatch revalidation.
- Current validity means: source slot belongs to the recipient/source PR,
  remains PENDING with alternative opt-in and its exact cycle; candidate PR is
  a different exact-normalized type/location PR, visible, raw-OPEN, not
  already past its pure join boundary, and has current capacity; the recipient
  has no active time conflict. Route-mode/null-location PRs remain outside this
  policy.
- The query is read-only. It may use repositories and pure temporal predicates
  but never `refreshTemporalStatus`, promotion, release, status update or a PR
  command. It is shared by generic dispatch and legacy pending-row dispatch.
- Preserve legacy active-only dedupe semantics: while a current pair has an
  active task, repeat reconciliation coalesces it; after a terminal task, a
  later explicit reconciliation of the still-valid pair may request a new one.
  `ONCE_PER_CAUSE` would silently change that behavior without a durable
  availability-generation fact.
- `pr.waitlist-alternative-available` remains a distinct business template;
  its private WeChat binding intentionally reuses the current
  WAITLIST_PROMOTED provider template/configuration and renderer field shape.

## Exit

The generic task is recreated deterministically from valid current source/candidate
facts, and both reconciliation and dispatch are read-only with respect to PR.
The existing provider-template reuse stays explicit compatibility behavior.

## Implementation Result

- The generic task carries the exact source PR, reusable Partner row, durable
  waitlist cycle and candidate PR. Its private active key uses the same pair
  identity, while its business causation remains PR-owned.
- `getWaitlistAlternativeAvailableNotificationContext` is the sole PR-owned
  eligibility projection for both the generic dispatcher and legacy drain. It
  uses pure temporal vetoes rather than a status refresh.
- Candidate changes, source entry and quota regrant call the named PR
  reconciler. Joining an alternative still closes source slots through the
  separate PR-owned mutation.
