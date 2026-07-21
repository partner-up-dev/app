# 5-7b.2 — Final Commit Review

## Status

**Local F-03 follow-up is complete and verified.** Sir has explicitly deferred
F-01's Rental payment path and F-02's RideHailing fee-confirmation recovery to
separate product and job-runner/outbox work. They remain recorded known
divergences, not repaired or silently reclassified. `5-7a` remains a separate
pending external-evidence gate; this packet does not authorize a commit by
itself.

## Objective

Decide whether the completed Phase 5 worktree is safe to commit as one scoped
Commerce change without turning local tests, source inference, or a task-local
database state into deployment claims.

## Review Axes And Cheap Proof

| Axis | Cheap proof | Current result |
| --- | --- | --- |
| Owner/transaction boundaries | source sequence trace + focused characterization tests | reviewed; no new owner/lock-order blocker confirmed |
| Rental R0 cut-off | trace historical Rental order/bill reads through checkout and provider-prepay command | known divergence; **deferred by Sir** from this pass, with the durable R0 target left unchanged |
| Payment recovery | compare same-attempt `SETTLED`/`ALREADY_SETTLED` transitions with post-settlement consequence handling | known divergence; **deferred by Sir** to a dedicated job-runner/outbox design |
| Placement admission feedback | move between PRs without a component remount and inspect local admission feedback | **complete** — context/Placement change clears feedback; generation guard suppresses stale responses |
| Callback/cancellation overlap | trace pending termination claim through provider cancellation callback | reviewed; pending claim is reused, so the initial duplicate-claim concern is not a finding |
| Static quality | `git diff --check`; canonical static gate | diff check passes; full static gate presently stops at global Oxfmt findings and needs scope/baseline separation |
| Runtime topology | 5-7a evidence packet | pending external provider smoke; no local claim promoted |

## Confirmed Findings

The detailed evidence and repair boundary live in
[`finding-register.md`](./finding-register.md).

1. A historical/retained Rental Bill can still reach Checkout and create a
   provider prepay. This is explicitly deferred from this repair pass.
2. A successful Bill settlement whose downstream RideHailing fee confirmation
   fails cannot be recovered by a duplicate payment notification or checkout
   reconciliation. This is explicitly deferred to job-runner/outbox work.
3. A Placement admission result is held in local state across a reused PR page
   component, so its message can describe the prior PR after navigation. This
   was the approved source repair; its completed packet is
   [`04-placement-feedback-repair/`](./04-placement-feedback-repair/).

## Review-Process Incident

A delegated review accidentally executed the migration runner and applied
`drizzle/0088_create_order_attempts.sql` to a locally reachable database
service. No source file, task file, staging/production deployment, provider,
or Git commit was changed by that command. The migration runner labelled its
policy environment `production`; that label alone does not identify the
database. The repository backend environment points at `localhost:5436`, and a
local listener was present, which strongly bounds the observed side effect to
the local development service but does not turn it into test or deployment
evidence. Do not reset or roll back the database without an explicit recovery
decision.

## Commit Boundary (When Unblocked)

- Include the Phase 5 Commerce source, migration, tests, fake-provider support,
  PRD/TDD promotion, and the Phase 5 task packet if task evidence is committed
  by repository convention.
- Exclude `package.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml`: they are
  owned by the separate Node runtime/toolchain packets. Exclude
  `tasks/oxc-toolchain-migration/`, `tasks/project-node-runtime/`, and
  `tasks/quality-gate-orchestration/` for the same reason.
- Do not add a deployment-doc claim or treat the local migration runner as
  5-7a evidence.

## Deferred Decisions And Approved Repair

- F-01 is not being repaired in this pass. The selected durable R0 target stays
  recorded; Sir's direction is a scope/risk acceptance, not a durable-rule
  rewrite.
- F-02 is not being repaired by an unsafe replay shortcut. Sir plans a future
  job-runner/outbox solution, which requires its own owner/state/retry design
  rather than incidental work here.
- F-03 is approved: invalidate only local admission feedback when the stable
  matching context or matched Placement changes, and prevent an invalidated
  request from writing feedback, handoff state, or navigation.

## Exit Criteria

1. F-03 focused no-remount and stale-response regression proof is complete.
2. Preserve F-01/F-02 as explicit deferred findings; do not change durable
   truth or claim them repaired.
3. Re-run the focused Web source proof appropriate to F-03.
4. Resolve or explicitly isolate the Oxfmt baseline so any future scoped
   commit has a
   truthful static-gate statement.
5. Re-review the exact staged file set before committing; `5-7a` remains
   explicitly pending after the local commit.
