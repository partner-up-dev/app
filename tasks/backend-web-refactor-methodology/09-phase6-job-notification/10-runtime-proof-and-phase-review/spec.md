# `6-5` Specification

## Runtime Topology

- FC timer and bounded request-tail maintenance are wake-up mechanisms only.
- Both reach the same protected JobRunner tick contract and cannot decide
  Notification/RideHailing timing, eligibility or outcomes.
- Multi-instance claim/lease behavior remains DB-coordinated.
- Public health remains cheap. An authenticated operational diagnostic surface
  exposes bounded registration, DB backlog/lag, lease/retry and last-run facts
  without payload/PII leakage.

Current source routes FC trigger and request-tail into the same JobRunner.
`/health` still exposes only cheap process-local registration/last-summary
facts, while the protected diagnostic adds bounded DB backlog/lag/lease facts.
Scenario setup still disables live request-tail work, so `6-5.1b-1` proves the
path through an injected seam and a focused real-Postgres diagnostic scenario.
That is local source proof, not FC cadence or deployed-access proof.

The completed `6-5.1b` generic seam was permitted before `6-4` closed because
it encodes neither a RideHailing nor Notification outcome. It retains cheap
public health and exposes only a protected, bounded aggregate diagnostic: no
Job payload, provider request/response body, message text, OpenID, coordinate
or raw provider-order data.

## O11y Replacement Proof

Real observability is a later phase. Before that later phase deletes
`notification_deliveries`, it must support:

- Job ID/type/version and attempt-number correlation;
- schedule/claim lag, duration, disposition/reason and retry decision;
- 0..N attempts per Job, including crash/lease recovery visibility;
- bounded safe provider code/reference where available;
- query procedures for representative success, skip, retry, permanent failure
  and missed work;
- an agreed retention period;
- alerts/recovery runbooks for lag, lease expiry, retry exhaustion, missed
  windows and telemetry gaps;
- PII/payload exclusion.

Telemetry loss or expiration cannot change Job, ACK reservation, Notification
credit or RideHailing state.

FC stdout capture into Aliyun SLS is not sufficient: there is no governed
correlation, OpenTelemetry/metrics backend, checked-in query, retention/access
policy, or alert/runbook contract. Phase 6 must not bridge that gap by adding a
console JSON sink or a synthetic probe. It retains DB execution state and
`notification_deliveries`, then hands the platform work to the later phase.

## Compatibility Retirement Gates

`notification_deliveries` remains until later O11y replacement proof. By Sir's
explicit cut-off decision, legacy Job registrations/types and old
opportunity/wave/inbox objects do not require pending-row, old-client or
retained-decoder evidence before removal; this slice confirms no current-source
authority remains.

All removals use forward migrations and explicit retention/archive decisions.
No user-owned unrelated worktree changes enter the slice.

Current CaoCao stdout diagnostics are legacy debug residue. Remove them rather
than promoting redaction tests into an observability claim.

## Phase Review Criteria

1. Job depends on no business implementation and contains no business outcome.
2. Notification callers use only its business-template command/ACK surface.
3. All current notification kinds preserve timing/eligibility/credit behavior.
4. PR message attention windows work without wave/inbox/read-marker authority.
5. RideHailing fee confirmation is one generic task; no ambiguity state or
   settlement replay exists.
6. No new console/stdout diagnostic is presented as O11y; real O11y is
   explicitly deferred and non-authoritative.
7. FC/request-tail runtime and recovery docs match observed behavior.
8. Compatibility and remaining external evidence are explicit; no false phase
   completion claim is made.
9. Runtime proof never mutates Notification/provider/business state merely to
   manufacture an observability branch.

## Exit Artifacts

- local verification log;
- observability deferral/remaining-work record;
- compatibility retirement ledger;
- Phase 6 finding register and exit evidence;
- durable-doc promotion/current-state reconciliation log.
