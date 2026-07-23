# `6-3.1b` Confirmation-Recovery Discussion Log

## 2026-07-22 — Two-trigger recoverability and status parity

### Evidence gathered

- The legacy confirmation handler schedules two independent Jobs: confirmation
  start is exact, and confirmation-end-minus-thirty-minutes is deliberately
  coarse/early-tolerant.
- The stable public Notification payload already names `prId`, `slotId`, and
  the trigger, but contains no schedule instant.
- A Job may be claimed while a PR time/rule update replaces it. Without a
  current-vs-claimed schedule comparison, the generic dispatcher cannot
  distinguish an old claimed task from the newest policy.
- Existing `findActiveByPrIdAndUserId` includes `JOINED`, `CONFIRMED`, and
  `ATTENDED`; `confirmSlot` has no reminder cancellation. The durable PRD
  rules require no confirmation reminders when confirmation is disabled, but
  do not state that confirmation itself stops a reminder.

### Conclusion used by this slice

The scheduled instant remains private Job/Notification execution context and
is passed from `JobHandlerContext` to the Notification owner. It is not added
to the public business request. The cutover preserves active-status parity and
does not turn successful confirmation into a new cancellation edge. A product
decision to stop reminders after confirmation may be worthwhile, but it must
be separately specified and tested rather than smuggled into a reliability
migration.
