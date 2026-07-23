# `6-3.1h` — Transaction-Bound Notification Facade Closure

## Status

**Complete.** The executor-facing Notification facade is now the only source
transaction capability. Focused proof is recorded in
[`verification-log.md`](./verification-log.md). Terminal lifecycle wiring can
now proceed without perpetuating the direct PR/POI/operator-to-Job writer edge.

## Why This Exists

`6-3.2b-3.1` correctly made its new invalidation port executor-facing: PR
passes a transaction executor to Notification, and Notification constructs the
generic Job writer internally. The same topology was not yet true for the
existing atomic scheduling factories. A source audit found direct
`createTransactionBoundJobWriter` imports in PR admission, waitlist promotion,
READY transition, PR-message source, PR content/meeting point, admin PR-type
coordination, and POI coordination.

This is not a new product vertical. It removes a structural leak that makes
the intended owner model false.

## Objective

Make every curated Notification transaction factory source-facing through its
caller-owned `TransactionExecutor` and semantic facts only. Notification alone
constructs its transaction-bound Job writer and retains private Job identity /
scheduling policy. Source domains retain their named source transaction and
never receive a generic Job API.

## Scope

- transaction-bound factories for `pr.new-partner`, `pr.waitlist-promoted`,
  `pr.ready`, `pr.meeting-point-updated`, and `pr.message-summary`;
- their source callers in PR, POI, and admin PR-type coordination;
- Notification-local writer-injected adapters only where focused testing needs
  them;
- targeted owner-edge proof and existing atomic-source regression coverage.

## Exit

No production source under `domains/pr`, `domains/poi`, or
`domains/admin-pr-type-config` imports `infra/jobs` or constructs a
transaction-bound Job writer. Each changed source still commits its domain
fact and generic Notification work in the same database transaction.

## Non-Goals

- changing notification templates, Job state semantics, causation/key policy,
  or product scheduling rules;
- turning Notification factories into a generic cross-domain transaction
  framework;
- touching legacy concrete handlers or lifecycle business behavior.
