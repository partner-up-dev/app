# `6-3.1g` Discovery Log

## Current topology

- Candidate creation/change, source waitlist entry and user credit regrant all
  converge on `waitlist-alternative-reminder.service`. It refreshes candidate
  PRs before scheduling the concrete WeChat Job and creates an Opportunity.
- The old handler repeats the same refresh during dispatch. This gives
  Notification a reverse mutation edge: a delivery attempt can activate,
  expire, release or promote PR state.
- A pending source slot is selected by type/location and opt-in. Its Partner
  row is reusable, but every PENDING entry gets a distinct `waitlistCycleId`.
  Existing repository projections omitted that fact, so they cannot safely
  identify a source lifecycle by row ID alone.

## Implementation shape selected

- A low-dependency `notification-contexts` query will own the current
  source/candidate compatibility, exact-cycle fence, capacity and recipient
  time-conflict decision. It returns only presentation facts needed by
  Notification; user/OpenID and preference/credit remain Notification-owned.
- A PR named reconciler will enumerate current pairs in response to candidate,
  source and recipient rebuild triggers. It asks the pure query before issuing
  a typed generic request; it does not start a transaction or expose Job keys.
- Generic Notification owns immediate active-pair scheduling, option/credit
  revalidation, rendering and the existing private WeChat provider binding.
  The old handler consumes the same pure query only to drain historical rows.

## Pre-implementation hazards

- `refreshTemporalStatus` can release slots and promote waiters, so replacing
  it with a hidden query wrapper would not satisfy the owner boundary.
- Raw persisted OPEN status is insufficient after time advances. The pure query
  must conservatively veto candidates at the start/join-lock boundary rather
  than treating state refresh as an eligibility read.
- Terminal-safe ONCE_PER_CAUSE would alter the current active-only scheduling
  behavior. The target must preserve active pair dedupe until a separate
  product decision introduces an availability-generation fact.
