# `6-3.2a` Plan

1. `6-3.2a-1`: extend the private generic task policy/scheduler port for
   `UNTIL_ACKNOWLEDGED`, keep creation key/Job type private, expose only the
   generic window-start cursor to a claimed handler, and add source-time
   channel availability without a PR → provider edge.
2. `6-3.2a-1`: add PR-message dispatch context/rendering, option/credit
   mapping and a final reservation-held recheck immediately before provider
   I/O.
3. `6-3.2a-2`: completed the internal named PR transaction: lock/re-read the
   PR and active roster, write the message and every eligible HELD/high-water
   reservation through the transaction-bound Notification writer, and roll
   back all of them on one failure. It now backs the three current producers.
4. `6-3.2a-3`: completed replacement of all three producers (participant, admin system,
   content-generated system message) through that one atomic persistence
   path. The content edit remains its existing source transaction followed by
   a separate atomic *message* transaction; this slice does not create a
   generic content-plus-message transaction.
5. `6-3.2a-3`: completed proof of coalesce, terminal-held, stale/covering ACK and reopen
   primitives before any Web behavior or legacy state removal. Preserve old
   message Job/inbox handler registration solely for pending-row drain.

## Cheapest Verification

- injected writer failure rolls back message and all target reservations;
- two messages → one held Job with raised high-water;
- terminal Job stays held until ACK; next message after release opens a new Job;
- dispatch skips after reservation is no longer held.
