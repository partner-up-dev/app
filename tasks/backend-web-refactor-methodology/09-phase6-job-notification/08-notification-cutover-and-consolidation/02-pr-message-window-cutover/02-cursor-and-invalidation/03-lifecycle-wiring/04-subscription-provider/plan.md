# `6-3.2b-3.4` Plan

1. **Complete:** preserved the HTTP response shape and non-PR subscription
   behavior.
2. **Complete:** branched only PR_MESSAGE onto
   `updatePRMessageNotificationSubscription` before the controller's generic
   option-repository mutation.
3. **Complete:** retained concrete historical job cancellation only as an
   explicit `CLEAR` legacy drain, separate from generic-window ownership.
4. **Complete:** added focused controller tests that ADD_ONE never invokes the
   legacy drain and CLEAR does so only after the canonical command. The b2
   real-Postgres scenario remains the behavioral proof for clear/restore/later
   message.
5. **Deferred to b3.5 matrix:** exercise generic channel `43101` alongside
   this controller path; runtime wiring was already proven in b2 and was not
   widened by this controller child.
