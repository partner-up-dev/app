# `6-2` Compatibility And Import Ledger

> Historical `6-2` exit snapshot, not current source truth. `6-3` migrated the
> remaining families, made the exemplar handoff atomic, and forward-retired
> opportunity/wave/inbox state plus all eight concrete Notification Job types.

## Purpose

This ledger distinguishes the one migrated owner path from source that is
intentionally still legacy. It is a migration inventory, not permission for a
new caller to select a `wechat.*` Job or per-kind dispatch helper.

## Migrated `WAITLIST_PROMOTED` Path

| Boundary | Current source fact | Evidence |
| --- | --- | --- |
| PR business caller | `domains/pr/services/waitlist.service.ts` calls `requestNotification` from its sibling Notification domain; it does not call the concrete promoted scheduler. | `rg -n 'requestNotification|scheduleWeChatWaitlistPromotedNotificationForParticipant' apps/backend/src/domains/pr/services/waitlist.service.ts` |
| Public Notification surface | `domains/notification/index.ts` exposes only the command and business contracts. Provider vocabulary, Job type, timing and private creation key do not cross this boundary. | inspect root entrypoint; `legacy.ts` is explicit and separate |
| Owner core | `notification-owner.service.ts` depends only on injected scheduler, option, curated-context and channel ports. It does not import PR internals, Job runtime or WeChat services. | `rg -n 'infra/jobs|domains/pr|WeChat' apps/backend/src/domains/notification/owner -g '*.ts'` returns no owner-core dependency |
| Composition | `infra/notifications/notification-owner-runtime.ts` binds the owner to JobRunner, current option storage, the curated PR query and the neutral WeChat channel. | `createNotificationOwnerRuntime` / `registerNotificationSendJobs` |
| Durable task | New work is `notification.send.v1`, version 1, with `ONCE_PER_CAUSE`. Metadata is top-level typed task data; the caller only supplies semantic aggregate/causation facts. | focused waitlist scenario |

The static query owner is deliberately one-way at the core boundary:
`Notification owner core → injected port ← infrastructure composition → curated
PR query`. The composition adapter may import a PR query; the Notification core
does not.

## Historical Registration Inventory

`apps/backend/src/index.ts` registers the generic definition before all
compatibility registrations. The current runtime therefore recognizes both
the migrated type and rows created before/alongside the cutover.

| Status | Job type | Registration family |
| --- | --- | --- |
| migrated | `notification.send.v1` (v1) | `registerNotificationSendJobs` |
| compatibility | `wechat.reminder.confirmation` | confirmation reminder |
| compatibility | `wechat.notification.activity-start-reminder` | activity-start reminder |
| compatibility | `wechat.notification.new-partner` | new-partner |
| compatibility | `wechat.notification.pr-message` | PR-message window |
| compatibility | `wechat.notification.meeting-point-updated` | meeting-point updated |
| compatibility | `wechat.notification.pr-ready` | PR-ready |
| compatibility | `wechat.notification.waitlist-promoted` | old promoted rows only |
| compatibility | `wechat.notification.waitlist-alternative-available` | waitlist alternative |

The old promoted registration and exported scheduler remain only because an
already-pending old row must still execute. A source search after the cutover
must find no business caller of
`scheduleWeChatWaitlistPromotedNotificationForParticipant`; its implementation
and compatibility export are the expected remaining matches.

## Explicit Compatibility Risks And Exit

- Unmigrated PR flows still import `infra/notifications` concrete schedulers.
  `waitlist.service.ts` itself retains three such imports for unrelated
  side-effects (new-partner, confirmation and activity-start). This is a
  temporary legacy ↔ PR ↔ infrastructure static path; do not use it as a new
  cross-domain pattern.
- Legacy per-kind channel handling retains historical
  `TRANSPORT_ERROR`/retry semantics. Only `notification.send.v1` applies the
  conservative `43101`-known / all-other-failures-ambiguous classification.
- At the `6-2` exit, `notification_opportunities`, `notification_waves`,
  delivery rows and inbox/read-state remained compatibility state for
  untouched families. The migrated promoted path created none of them.
- At that exit, promotion still committed before generic Job insertion. The
  failure-injection scenario made the gap explicit: a schedule error returned
  `500` while the promoted slot remained `JOINED`.

`6-3` subsequently added the named atomic handoff for each family. Sir's later
forward cut-off superseded the proposed pending-row drain: concrete
registrations and opportunity/wave/inbox state were retired, while historical
delivery rows alone were retained as inert audit evidence.

## Repeatable Checks

```sh
rg -n 'scheduleWeChatWaitlistPromotedNotificationForParticipant' \
  apps/backend/src apps/backend/tests -g '*.ts'
rg -n 'requestNotification' apps/backend/src/domains/pr/services/waitlist.service.ts
rg -n 'registerNotificationSendJobs|registerWeChat.*Jobs' apps/backend/src/index.ts
rg -n 'from .*domains/notification/legacy' apps/backend/src apps/backend/tests -g '*.ts'
```

Expected first-query result after `6-2`: only the compatibility implementation
and re-export, never a PR/business invocation.
