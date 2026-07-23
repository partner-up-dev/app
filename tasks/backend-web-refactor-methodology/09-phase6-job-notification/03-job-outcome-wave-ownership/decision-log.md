# D6-J-01 Decision Log

These intermediate proposals are retained for history. D6-J-02 supersedes the
placement decisions; no source/schema change is authorized.

| ID | Proposed decision | Rationale | Status |
| --- | --- | --- | --- |
| D6-J-01 | Move the capability currently represented by `notification_deliveries` into a general append-only Job attempt/outcome ledger. | Current rows correspond to handler attempts—including skips—not independently observed deliveries; retries create a natural 1:N Job-attempt relation. | Withdrawn: pure history moves to observability in D6-J-02 |
| D6-J-02 | Do not put attempt history into the single `jobs` row or an ever-growing JSON array. | It loses queryable history, creates update contention, and cannot represent one-to-many attempts cleanly. | Retained; D6-J-02 sends history to observability |
| D6-J-03 | Replace implicit return/throw outcome policy with a structured Job attempt disposition that JobRunner records and uses for its state transition. | It prevents `FAILED` attempt + `SUCCEEDED` Job contradictions and generalizes to Commerce external effects. | Retained with telemetry-owned history |
| D6-J-03A | Create an attempt row when a Job is claimed; finalize it together with the Job transition, and classify abandoned leases explicitly. | A process crash before handler return otherwise leaves no attempt evidence and makes provider ambiguity invisible. | Withdrawn: claim/lease/control remain on Job; history is telemetry |
| D6-J-04 | Remove `notification_waves` after migration/data proof; do not absorb it into Job. | The table is write-only and its advertised lifecycle is not implemented; PR inbox state already drives unread-wave behavior. | Revised: remove table but absorb window mechanics into Job creation mode |
| D6-J-05 | Keep PR unread-wave SSoT in PR message/inbox state and rename `lastNotifiedMessageId` toward its actual “wave start/claimed boundary” meaning. | Read/unread and wave closure are PR product state, and the current field is written before notification delivery. | Reopened: current read state has no proven independent UI use |
| D6-J-06 | Create a future Notification receipt entity only when a provider exposes an independently observed delivery/read lifecycle. | Current synchronous send acceptance is an attempt outcome, not proof of delivery. | Retained |

## Resulting Persistence Shape

The shape below is the **final D6-J-02 disposition**, replacing the historical
D6-J-01 proposal:

```text
keep/evolve:
  jobs
  user_notification_options

attempt history:
  correlated O11y only

remove after proof:
  notification_opportunities
  notification_deliveries
  notification_waves
  pr_message_inbox_states
```
