# `6-2` Specification

> The module contract remains current. References below to one exemplar,
> retained compatibility or a future `6-3` handoff describe the `6-2` exit
> boundary; `6-3` subsequently migrated all families, closed the handoff and
> retired the concrete registrations.

## Module Boundary

Business/application callers may provide only:

- stable business template ID;
- recipient and, for the current subscription act, channel type;
- template-correlated typed payload;
- aggregate/causation/correlation facts.

They may not provide a provider template ID, raw provider fields, Job type,
private creation key, retry count or repository transaction object.

Notification owns:

- template/payload validation;
- timing, creation mode and dedupe derivation;
- private business-template/channel binding;
- rendering;
- preference + channel-credit interpretation;
- dispatch-time eligibility revalidation;
- provider result classification and Notification-owned consequences.

## Template Vocabulary

The registry must cover, even if only one is cut over in this slice:

- confirmation reminder;
- activity-start reminder;
- new partner;
- meeting-point updated;
- PR ready;
- waitlist promoted;
- waitlist alternative available;
- PR message summary.

Names are business vocabulary and remain independent of current uppercase DB
kinds and WeChat template IDs. The TypeScript representation must preserve the
template-to-payload correlation without `any` or an unsafe widened union.

## User Notification Option

One Notification-owned aggregate may contain preference and channel credit.
The channel-neutral domain model is `LIMITED(remaining) | UNLIMITED`. At a
future persistence boundary, `credit = null` may decode to `UNLIMITED`; a
non-negative integer decodes to `LIMITED(remaining)`.

Current WeChat `remaining_count` columns are non-null integers and therefore
always adapt to `LIMITED`. `6-2` does not make them nullable merely to model a
future channel. In every representation:

- null never means unknown, unloaded or channel unconfigured;
- preference and credit remain distinct fields and transitions.

## Handler And Ports

The registered `notification.send.v1` handler:

1. validates task version/payload;
2. reloads option, channel identity and template-specific current eligibility;
3. resolves the private binding and render context;
4. renders a prepared channel notification;
5. invokes `NotificationChannelPort.send`;
6. applies credit/preference consequences;
7. returns a generic Job disposition.

Request-time scheduling performs only the minimum semantic validation and
policy derivation needed to create the task. It must not run the full prepared
dispatch query and then repeat it in the handler; dispatch-time reload is the
authoritative eligibility/render-context read.

Eligibility/query adapters may depend on another domain's curated public query;
Notification core depends only on its injected port. This avoids a static
PR-internals ↔ Notification-internals cycle.

The channel adapter owns provider protocol/configuration only. It returns a
channel-neutral result and does not schedule, retry, mutate Job, load business
eligibility or own user preference.

The channel result matrix distinguishes:

- accepted success;
- known refusal/permanent non-application, including WeChat `43101` cleanup;
- proven definitely-not-applied and safe-to-repeat transient failure; and
- ambiguous network/HTTP/parse/provider outcome.

Ambiguous outcome is non-retrying unless channel evidence proves idempotency or
non-application. The current generic `TRANSPORT_ERROR` is not such proof.

## Representative Cutover

`WAITLIST_PROMOTED` must:

- preserve current user-visible timing and WeChat behavior;
- derive its task policy inside Notification;
- revalidate current promoted-slot ownership/eligibility at dispatch;
- preserve `43101` limited-credit cleanup and non-retryable classification;
- use the new public command from the PR/application path;
- stop using its concrete `infra/notifications` scheduler from that caller.

It is selected as the smallest owner-surface exemplar: one recipient, immediate
schedule and simple current-eligibility reload. At the `6-2` exit its promotion
mutation committed before scheduling and had no durable promotion
timestamp/reconciler, so that slice did not claim reliable handoff. `6-3`
subsequently closed the named atomic boundary.

`WAITLIST_ALTERNATIVE_AVAILABLE` remains a distinct business template while it
compatibly reuses the current waitlist-promoted provider template/configuration;
eight business templates do not imply eight provider templates.

`notification_deliveries` remains inert historical audit data after the final
cut-over; the generic handler does not write it. Phase 7 owns governed O11y and
any later table retirement.

## Historical `6-2` Exit Acceptance Criteria

1. The public surface contains no provider template/config vocabulary or Job
   mechanics.
2. Template and payload types cannot be mismatched.
3. Notification—not caller or channel—selects timing/creation/dedupe policy.
4. Dispatch revalidates current eligibility and option/credit.
5. Provider results map to the four generic Job dispositions.
6. No Notification Intent/Opportunity target is introduced.
7. `WAITLIST_PROMOTED` uses the new path and retains focused behavior.
8. At the `6-2` boundary, every untouched family remained operational through
   explicit compatibility registration; `6-3` later retired those
   registrations.
9. No ambiguous provider outcome becomes an automatic retry without evidence.
10. Request-time and dispatch-time code do not perform the same full data load.
