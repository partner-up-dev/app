# `6-1` Legacy Job Compatibility Inventory

> Historical `6-1` entry snapshot. It is not the current registration map.
> `6-3` forward-retired all eight concrete Notification Job types without a
> deployed-row drain; only the listed official-account Job still uses the
> non-Notification legacy adapter.

## Static Registration Map

At `6-1` entry, all built-ins remained registered by the backend composition
root and entered the new runner through the explicit v1 legacy adapter. The
adapter accepted object payloads, mapped normal return to generic `SUCCEEDED`,
and mapped throw to the existing generic retry path. It did not claim a
provider-delivery result.

| Durable Job type | Registration owner | Current payload treatment | `6-1` path |
| --- | --- | --- | --- |
| `wechat.reminder.confirmation` | `infra/notifications/wechat-reminder.ts` | owner validates inside legacy handler | v1 adapter |
| `wechat.notification.new-partner` | `infra/notifications/wechat-reminder.ts` | owner validates inside legacy handler | v1 adapter |
| `wechat.notification.activity-start-reminder` | `infra/notifications/wechat-activity-start.ts` | owner validates inside legacy handler | v1 adapter |
| `wechat.notification.pr-message` | `infra/notifications/wechat-pr-message.ts` | owner Zod payload schema | v1 adapter; known return-after-failure behavior remains a `6-3` correction |
| `wechat.notification.meeting-point-updated` | `infra/notifications/wechat-meeting-point-updated.ts` | owner Zod payload schema | v1 adapter |
| `wechat.notification.pr-ready` | `infra/notifications/wechat-pr-ready.ts` | owner Zod payload schema | v1 adapter |
| `wechat.notification.waitlist-promoted` | `infra/notifications/wechat-waitlist-promoted.ts` | owner Zod payload schema | v1 adapter |
| `wechat.notification.waitlist-alternative-available` | `infra/notifications/wechat-waitlist-alternative-available.ts` | owner Zod payload schema | v1 adapter |
| `wechat.official-account.follow-sync` | `infra/marketing/official-account-follow-sync.job.ts` | owner validates inside legacy handler | v1 adapter |

The source map proves registration coverage only. It cannot prove which rows
are live in a deployed database or whether historical JSON is an object.

## Additive Existing-Row Path

Migration `0089` gives rows that predate the new fields `job_version = 1` and
`creation_mode = ONCE`; reservation/cursor/reason/token fields remain null.
The legacy adapter accepts v1 object payloads and the existing root
registrations remain present. A non-object payload, an unknown active type, or
a future version without a registered decoder is intentionally not silently
treated as a successful Job.

## Cancelled Pre-Deploy Inventory

The query below was the original compatibility proposal. Sir's later explicit
forward cut-off cancelled this gate; it was not run and is retained only as
design history.

```sql
select
  job_type,
  status,
  jsonb_typeof(payload) as payload_json_type,
  count(*) as row_count
from jobs
where status in ('PENDING', 'RETRY', 'RUNNING')
group by job_type, status, jsonb_typeof(payload)
order by job_type, status, payload_json_type;
```

For object payloads, key names (not values) may be sampled separately:

```sql
select
  job_type,
  key as payload_key,
  count(*) as row_count
from jobs
cross join lateral jsonb_object_keys(payload) as key
where status in ('PENDING', 'RETRY', 'RUNNING')
  and jsonb_typeof(payload) = 'object'
group by job_type, key
order by job_type, key;
```

Pass condition: every active type is mapped above and every active payload is
an object accepted by its v1 owner path. Any exception needs a named decoder,
drain, or forward data migration before release; it is not permission to drop
or relabel live work.

## Mixed-Runner Rollout Gate

Old code completes a claim by Job ID alone. New code fences completion by
`RUNNING + leased_by + lease_token`. If an old handler outlives its lease and a
new runner reclaims that Job, an old completion could otherwise overwrite the
new claim. The deployment owner must prevent old tick/request-tail claims and
prove old active invocations drained through their prior lease-plus-handler
bound before the new runner can claim. The durable rollout rule lives in
`docs/40-deployment/backend-rollout.md`.
