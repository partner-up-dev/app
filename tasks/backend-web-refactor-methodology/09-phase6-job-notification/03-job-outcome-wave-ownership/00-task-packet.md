# D6-J-01 — Job Outcome And Wave Ownership Review

## Status

**Superseded by D6-J-02 after Sir's observability/window-policy correction.**
This packet preserves the intermediate read-only audit that first recognized
`notification_deliveries` as attempt evidence and `notification_waves` as
behaviorally unused. Its proposal to add a durable `job_attempts` table and
leave wave state in PR inbox markers is no longer the preferred target.

It does not authorize source, schema, migration, data, provider, or runtime
changes.

## Question

Can the capabilities of `notification_deliveries` and
`notification_waves` be absorbed into the Job domain without losing product
truth, attempt history, observability, or recovery?

## Historical Short Answer — Do Not Execute

- **Delivery attempt capability: yes.** The current delivery row is actually a
  handler-attempt outcome and can converge into a generic Job attempt/outcome
  ledger. It should not be flattened into the single `jobs` row because retries
  are one-to-many.
- **Wave capability: do not move it into Job.** The current wave table is
  write-only and duplicates the effective PR inbox-state relation. Delete the
  redundant table after migration proof; keep unread-wave truth with PR message
  inbox state, which the Job revalidates at execution.

D6-J-02 revises both placements: pure attempt history moves to observability;
wave becomes a Job creation-window mode; and the target removes PR inbox/read
state. The executable specification lives in
[`../04-job-observability-window-policy/`](../04-job-observability-window-policy/),
not in this historical packet.

## Artifacts

- `evidence.md`: schema, repository, callsite, and lifecycle findings.
- `target-model.md`: target Job attempt/outcome contract and wave SSoT.
- `decision-log.md`: historical intermediate decisions and their D6-J-02 disposition.
- `rehearsal.md`: migration branches and cheapest credible proof.
