# `6-3.1f` Discovery Log

## Observed source topology

- PR content reaches `updatePRContent` from both the user and admin paths.
  It captures a global effective-point snapshot, writes `partner_requests`
  outside a transaction, then invokes the concrete scheduler. Its surrounding
  release, reminder, status and message work makes a silent wide transaction
  unsafe; the source bridge must be explicit.
- PR-type coordination captures all PRs of a type, writes the type config
  through a global repository, then invokes the same scheduler. One config
  mutation can change many PRs because effective resolution is PR override,
  then type/location rule, type rule, then POI fallback.
- Admin POI PUT keeps the business flow in its controller. It finds requests
  by previous and next POI names, writes a repository that currently has no
  transaction executor, then schedules afterward.

## Current notification behavior

- Legacy source creation filters active participant, active user, OpenID and
  available credit, then writes one concrete Job and one Opportunity per
  recipient. Its timestamp-only key is not a source causation identity.
- Legacy dispatch rechecks user, OpenID, preference/credit, PR existence and
  active membership, and renders the payload's description/time. It must stay
  executable only for pending legacy rows.
- Generic Notification already declares the meeting-point template, but its
  payload is only `{ prId }` and it has no policy, renderer, context,
  option, credit or prepared-channel binding. The provider service and old
  channel mapping already expose the required template.

## Evidence that shapes the implementation

- Effective equality intentionally ignores source and compares description plus
  image. A source change with identical visible content is not an event.
- A next effective point without a description was historically not notified.
  This slice preserves that behavior instead of inventing a removal message.
- POI matching is name-based. A rename must retain the previous-name and
  next-name query union until a separately authorized POI identity model
  changes it.
- Existing generic atomic families provide the reusable transaction-bound Job
  writer and Notification port pattern. They do not authorize a generic
  cross-domain transaction helper.

## Verification baseline

- There was no source-atomic or generic-owner meeting-point scenario before
  this work.
- Existing useful regressions are effective-resolution units and the provider
  field-mapping test. New proof needs owner/channel units plus real Postgres
  source scenarios for all three families.

## `03` implementation boundary

- PR-content now uses a named serializable bridge rather than taking a global
  effective snapshot and scheduling after `partner_requests` has committed.
  It clears the same-row poster cache in the protected transaction, so a
  failed task handoff cannot leave a changed core row with stale cache state.
- The only adjacent slot work included is the active-status-conditional release
  required by a preflighted time conflict, plus the existing capacity/status
  work. This gives Notification the correct post-release roster and restores
  both row and slots when the handoff fails.
- Reminder cancellation/reconciliation, waitlist promotion, persisted PR
  messaging and alternative availability checks remain post-commit. They use
  global/named protocols that have not yet received a common transaction port;
  expanding this bridge to swallow them would hide, rather than resolve, that
  design work.

## `04` topology and implementation boundary

- The old coordination use case captured effective points through global
  repositories, updated the type config, then scheduled concrete WeChat work
  after the config had committed. A failure could therefore expose a changed
  config with zero or only some legacy creation rows.
- The config type is a primary key with no rename route. The current affected
  set is consequently every PR whose exact stored type equals that key; this
  includes all statuses, matching the old helper rather than silently changing
  product impact semantics.
- Effective resolution remains PR override, type/location, type default, then
  published POI. Visible equality ignores source identity, so an explicit
  override or equal description/image is deliberately suppressing.
- The new source port must lock config then PRs in sorted ID order inside a
  serializable retry transaction. It may use the transaction-bound resolver
  and Notification handoff, but must not turn either into a reusable generic
  cross-domain transaction abstraction.
- One type coordination operation uses one UUID/timestamp inside its successful
  transaction. The UUID groups its generic tasks; `prId` and recipient are the
  additional causation/creation-key dimensions that prevent cross-PR or
  cross-recipient coalescing.

## `04` implementation result

- `updateAdminPRTypeConfigCoordination` now delegates only to the named
  source transaction. That transaction locks the config then the full exact
  type PR set in ascending ID order, takes transaction-local snapshots, writes
  coordination fields and writes generic Notification tasks before commit.
- The generic PR-type-config package no longer exposes a bare coordination
  mutation. This closes the otherwise easy path to change a live fallback
  policy without producing its required source events.
- Real-Postgres route proof covers an explicit override, type/location rule,
  null-to-type fallback and POI-to-type fallback in one operation. The changed
  PRs share one source UUID/correlation while retaining PR-specific causation.
- A direct injected second handoff failure follows a first real generic Job
  write; its assertion proves both the type config and that first Job are
  absent after rollback. Full backend unit/scenario/type/lint regression passed.

## `05` topology and rehearsal

- The old admin POI controller owns a global old/new-name union, effective
  snapshot, row update and post-commit concrete scheduler. This must become a
  POI-owned source transaction; controller ownership stops at auth, validation
  and its existing response projection.
- POI names are unique but PR locations reference them by exact text. The
  source transaction therefore locks the POI then the deduplicated old/new
  location union in ascending PR ID order. The transaction-bound resolver sees
  the same POI row before and after its update.
- A rename cannot make an old-name POI fallback PR receive the new point:
  after the row moves, its effective point is null and the preserved detector
  suppresses a removal event. The old/new union remains necessary to prevent
  source reach from being silently narrowed and to preserve future-safe
  comparison semantics; only a new-name PR that gains a usable point can fan
  out now.
- The POI repository is already executor-aware and normalizes its own update
  data. The new use case must retain controller behavior that omits
  availability/meeting-point fields by carrying the locked existing values,
  rather than letting repository defaults accidentally clear them.

## `05` implementation result

- `updateAdminPoi` now calls a named POI serializable source port. The port
  locks the POI then the normalized old/new-location PR union, captures
  transaction-local snapshots, persists the POI, collects visible deltas and
  writes generic Notification tasks before the same commit.
- The route retains its protocol-only boundary: validation, normalized input
  and the existing response projection remain in the controller; all
  effective-point and event orchestration has moved to POI.
- Four real-Postgres scenarios prove POI-only fan-out, a persisted non-point
  no-delta mutation, rename old/new semantics with no invented removal event,
  and rollback of the POI plus an already-written generic task.
- Exporting the new POI use case from the POI aggregate barrel revealed an
  initialization cycle into PR's effective-point service. The service now
  depends on POI's explicit low-dependency `queries` surface, not its public
  aggregate barrel. This is a production dependency correction, not a test
  isolation workaround; full scenario proof covers the previously failing PR
  detail reads.

## `06` implementation result

- All three actual source families now write only the generic
  `pr.meeting-point-updated` task through their named transaction-bound port.
  The shared source contract retains immutable source UUID/description/time,
  per-PR causation and source-time roster; it does not introduce an outbox,
  Opportunity, Delivery or Wave abstraction.
- The obsolete concrete creation scheduler, PR source helper, global
  affected-request collectors, source dedupe-key builder and creation policy
  are removed. Static absence proof finds no remaining source reference to
  those symbols and no concrete scheduler/Opportunity writer under the PR,
  PR-type-config or POI source owners.
- Compatibility remains explicitly bounded to pre-cutover rows: backend
  startup registers the old job handler; it decodes old payloads and keeps its
  historical Delivery accounting; WeChat credit exhaustion may still cancel
  matching old rows. A real old row is inserted, claimed and completed by that
  handler in scenario proof.
- Full backend unit/scenario/type/lint/build gates pass after the legacy drain
  and the aggregate-barrel-cycle correction. Durable Notification, PR,
  topology and architecture decision documents now record the resulting
  owner, temporal and dependency rules.
