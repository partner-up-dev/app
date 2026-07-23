# `6-3.1f-01` — Notification Owner Contract And Runtime

## Status

**Locally complete.** This sub-task changed no business source writer and
created no meeting-point notification through a route. Its focused proof is
recorded in [verification-log.md](./verification-log.md).

## Objective

Turn the already-declared `pr.meeting-point-updated` template into a complete
generic Notification capability: typed durable task, private once-per-cause
policy, source-immutable rendering, current eligibility checks, limited-credit
handling and prepared WeChat channel binding.

## Scope

- Notification contracts/task schema/owner policy and rendering.
- Runtime option, credit and dispatch-context composition.
- A curated PR context that checks user, OpenID, current option and active
  membership without resolving the latest meeting point.
- Prepared WeChat sender/adapter mapping for the existing provider template.
- Owner, runtime and channel tests.

## Non-goals

- No PR, PR-type or POI source call is cut over here.
- No migration, Opportunity, Delivery, Wave or outbox table is added.
- The concrete legacy meeting-point job remains unchanged for drain.

## Exit

Given a valid semantic request, the owner writes one `notification.send.v1`
task per cause/recipient with immutable event facts. Dispatch renders those
facts only if current eligibility holds, consumes credit while preserving
preference on success, and classifies a known WeChat permission revocation.
