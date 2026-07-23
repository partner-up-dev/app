# `6-3.2a-3` Plan — Complete

## Status

**Complete.** The producer edge now has one private semantic bridge into the
atomic PR message transaction. The next ordered slice is `6-3.2b`; it owns
cursor/tombstone and lifecycle invalidation rather than reopening this source
cutover.

1. Completed: switched the participant route to the atomic port with
   `ACTIVE_PARTICIPANT`; preserve authenticated active-participant ACL, rate
   limit, 403/429 mapping, and the `{ message, thread }` response using a
   synthetic immediate read projection.
2. Completed: switched the admin-system route to `OPERATOR_OR_SYSTEM`; preserve service-role
   auth, PR-exists/body prechecks, null read projection and admin operation-log
   action. Admin message update/delete remain non-producers.
3. Completed: switched the user content-generated producer to `OPERATOR_OR_SYSTEM` only
   after the existing content transaction commits. It is system context caused
   by an already-committed mutation, so an intervening creator exit cannot
   turn that committed mutation into a 403 or cause it to re-run. Preserve
   core-field label message rules, `pr.update_content` and
   `pr.notify_core_field_change` logs, and do not widen the content
   transaction. Admin content currently passes a null actor and therefore does
   not emit this message producer.
4. Completed: removed producer-side legacy unread-wave, inbox, wave, opportunity, Delivery
   and concrete scheduler calls. Keep the old handler and decoder for the
   historical-row drain.
5. Completed: added the real-Postgres matrix: M1/M2 HELD coalescing and high-water,
   terminal-held, stale/covering ACK, release/reopen, configured/missing/no-
   credit eligibility, and a legacy `wechat.notification.pr-message` fixture.
   Assert message/Job rollback on injected reservation failure.
6. Completed: audited reverse edges and updated the parent packet/durable contracts. The
   slice exits only with Job-level ACK evidence; HTTP semantic ACK remains a
   later child.
