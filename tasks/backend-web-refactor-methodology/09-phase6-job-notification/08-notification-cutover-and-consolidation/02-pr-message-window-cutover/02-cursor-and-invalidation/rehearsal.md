# `6-3.2b` Rehearsal

1. A visible-only max ID can drop below held high-water after delete. The
   message record must remain with a tombstone so `acknowledgementCursor` is
   monotonic even when `latestVisibleMessageId` is null or lower.
2. Releasing a reservation is not a delivery success, a business
   reconciliation, or a semantic ACK. Job accepts neutral control; Notification
   owns why a message window no longer represents current user attention.
3. For source creation and PR-message preference mutation, the option row is
   the shared serialization point. The source locks/reads it before creating a
   reservation; the mutation locks/updates it and releases affected held work
   before commit. Otherwise an opt-out can commit while an older source
   transaction creates an invalid new window.
4. A newly granted WeChat credit after a terminal held send is neither an ACK
   nor permission to replay absence-period history. `0 → positive` clears an
   old terminal generation and only a later message source opens fresh work.
5. A participant leaving or a provider call already in flight cannot revoke an
   already-completed external call. The release fences later execution and
   state transitions, and dispatch revalidation makes the remaining race
   explicit rather than pretending it can be undone.
6. Terminal PR status has two independent concerns: current message
   compatibility remains unchanged, while Notification source and dispatch
   eligibility reject new attention work. Both fences are necessary because an
   operator/system message can appear after a status transition.
