# `6-0` Current Dependency Topology

## Evidence Classification

The trees below describe checked-in source and committed migration direction.
They do not assert which FC environment variable overrides or deployed cron are
currently live; those are deployment-observation facts.

## Job / JobRunner

1. **Registration and producer side**

   - `apps/backend/src/index.ts` bootstraps the process and registers handler
     functions from `infra/notifications` and
     `infra/marketing/official-account-follow-sync.job.ts`.
   - PR commands/services currently call concrete
     `infra/notifications` scheduling functions; each normally calls
     `jobRunner.scheduleOnce({ jobType, payload, timing, dedupeKey })`.
   - The official-account bootstrap schedules a recurring job directly through
     the same JobRunner surface.

2. **Execution state owner**

   - `infra/jobs/job-runner.ts` owns the in-process handler map and DB work
     mechanics.
   - `entities/job.ts` owns persisted execution fields: `PENDING → RUNNING →`
     `SUCCEEDED | RETRY | FAILED | MISSED`, attempts, lease, timing buckets,
     and the active-dedupe uniqueness constraint.
   - A transaction-scoped advisory lock plus `FOR UPDATE SKIP LOCKED` protects
     each claim batch; the handler runs after that transaction commits, under a
     row lease. The advisory lock is not a whole-handler distributed lock.

3. **Tick topology**

   - `fc-job-runner-trigger` timer FC
     → `POST /internal/maintenance/tick` with `x-internal-token`
     → `runExternalMaintenanceTickOrSkip`
     → `jobRunner.runDueJobs({ source: "external-trigger" })`.
   - Normal non-internal requests additionally reach bounded request-tail
     maintenance
     → `jobRunner.runDueJobs({ source: "request-tail" })`.
   - `/health` exposes process-local JobRunner registration/last-summary
     diagnostics.

4. **Handler side**

   - JobRunner invokes a handler by string `jobType` and JSON payload.
   - Handlers are currently implemented in Notification/marketing modules;
     they revalidate business state, may call a provider, write local outcome,
     and either return (JobRunner marks `SUCCEEDED`) or throw (JobRunner
     schedules a linear retry until its max-attempt terminal result).

## Notification

1. **Current caller and policy topology**

   - PR command/service
     → direct `infra/notifications` function (confirmation, activity,
       new-partner, ready, meeting-point, waitlist) **or**, for PR messages,
       a direct `domains/notification/services/...` import plus a concrete
       infra scheduler.
   - The concrete scheduler chooses type-specific timing, uses JobRunner, and
     calls Notification's `createNotificationOpportunity` /
     `markNotificationOpportunityScheduled` helpers.
   - This is a compatibility topology: a cross-domain caller currently knows
     notification transport/scheduling placement instead of only a curated
     Notification command/event surface.

2. **Current durable records and links**

   - `user_notification_opts`: quota and opt state.
   - `notification_opportunities`: deduped attention intent; source currently
     writes `CREATED`, then `SCHEDULED` with an optional `job_id`.
   - `notification_waves`: PR-message unread-window projection; source currently
     creates `OPEN` rows, but no application callsite reads or advances them.
   - `jobs`: delayed execution record and retry/lease truth.
   - `notification_deliveries`: per-handler outcome record linked to a job and
     PR/user/kind; it is not linked back to an opportunity by a durable ID.

3. **Current dispatch topology**

   - JobRunner handler
     → Notification preparation service (reload user, PR/slot/inbox/quota)
     → `infra/notifications/channels` adapter
     → WeChat subscription-message provider
     → Notification delivery record and quota/cancellation follow-up.
   - Adapter refusal `43101` is non-retryable policy cleanup; a transport
     failure is supposed to be retryable only when the handler throws.
   - The PR-message handler currently records a transport failure and returns,
     so JobRunner marks that job `SUCCEEDED`; other families generally throw.

4. **Current atomicity / lifecycle boundary**

   - Most one-shot schedulers write `jobs`, then opportunity, then its
     `SCHEDULED` link in separate calls.
   - The PR-message path writes inbox/wave/opportunity before scheduling the
     job, also in separate calls and with per-recipient error swallowing.
   - No source path updates opportunity beyond `SCHEDULED` or wave beyond its
     initial state. Handler outcomes enter `notification_deliveries` only.
   - Therefore the enum vocabulary does not currently prove an end-to-end
     opportunity/wave lifecycle or an atomic intent-to-job handoff.

## Historical Outbox Boundary

`0000`/`0015` contain historical `domain_events`/`outbox_events`; committed
`0039` drops both and the current source has no entity, repository, dispatcher,
or processor. The active topology is durable `jobs` plus Notification records,
not a reusable active outbox.
