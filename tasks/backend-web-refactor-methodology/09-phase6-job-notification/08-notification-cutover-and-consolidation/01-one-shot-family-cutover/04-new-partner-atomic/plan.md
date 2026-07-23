# `6-3.1d` Plan

1. Add a durable `admissionCycleId` to every active admission, including a
   direct reactivation and a waitlist promotion. Preserve the prior cycle
   through exit/release and replace it only at the next active admission.
2. Freeze source-time fan-out after the slot write, using the PR's active
   roster plus Notification-owned user/OpenID/`NEW_PARTNER` credit checks in
   the same serializable transaction. The per-recipient generic task carries
   `joinedUserId`, `joinedAtIso` and `admissionCycleId`; its causation and
   private once-per-cause key derive from that cycle.
3. Bind the typed template/render/context policy through the generic owner and
   the existing WeChat subscription adapter. Dispatch verifies that the
   original Partner slot is still active for the same admission cycle before
   provider I/O or credit consumption. An accepted generic send consumes
   limited credit without erasing the stored preference; a known permission
   revocation clears both.
4. Write recipient tasks through named direct-admission and waitlist-promotion
   transaction integrations; channel configuration, provider I/O and later
   eligibility stay dispatch-time work.
5. Remove the two post-commit legacy scheduler calls and all new
   `notification_opportunities` writes. Keep legacy handler registration and
   legacy-cancel behavior only for the pending-row drain.
6. Prove rollback, exact fan-out, one-cycle coalescing/new-cycle separation,
   later recipient exit skip, and ordinary direct/promotion product effects.

## Cheapest Verification

- an injected named-port writer failure rolls back direct admission and
  promotion (including the earlier waitlist-promotion Job) and produces no
  new-partner task;
- success creates exactly the source-eligible recipient task set, never writes
  a new opportunity row, and uses one durable admission-cycle cause per
  recipient;
- a reused Partner slot creates a new cycle rather than coalescing with the
  old one;
- a recipient who exits or loses eligibility before dispatch skips without a
  send or credit consumption, while exhausting generic credit preserves the
  preference fact;
- normal join and waitlist promotion scenarios retain their product effects.
