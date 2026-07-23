# `6-3.2a` Implementation Topology

## Target Write Path

1. A participant, admin-system, or content-generated caller selects the named
   PR message source path. Participant ACL/rate-limit checks and content
   prechecks remain source-owned. The producer mapping is:
   `ACTIVE_PARTICIPANT` for participant and `OPERATOR_OR_SYSTEM` for
   admin-system/content-generated system context. The latter avoids turning an
   independently committed content mutation into a retry-unsafe membership
   failure.
2. The source opens its message-specific PR transaction with this exact order:
   `PR FOR UPDATE → active roster FOR UPDATE + author recheck → insert/reload
   message → Notification handoff`. The roster lock is deterministic. The PR
   and roster lock form the source snapshot; an active-participant author
   cannot be released between precheck and insert, while an operator/system
   author bypasses only the membership assertion.
3. The transaction-bound Notification port receives the frozen roster and
   checks channel availability, active user/OpenID and `PR_MESSAGE`
   preference/credit using the same transaction executor.
4. For every eligible recipient, Notification derives its private key and asks
   the transaction-bound Job writer to `scheduleUntilAcknowledged` using the
   message ID as both initial start and high-water cursor.
5. The transaction commits the message and all accepted HELD reservations, or
   rolls back all of them. Operation logging happens after commit. The new path
   writes no inbox, wave, opportunity, Delivery or concrete message Job.
6. Content-generated messages run in an independent system-context message
   transaction after the existing content transaction commits. Only the
   participant create response may synthesize an immediate read cursor; no new
   inbox marker is written. The old concrete handler remains only for
   historical-row drain.

## Window Sequence

1. First eligible message creates a `PENDING + HELD` Job at message time plus
   five minutes.
2. Later messages lock the same private `PR / recipient` creation key and only
   raise high-water, including after the Job reaches a terminal execution
   state.
3. A covering future ACK releases the reservation; an old cursor is stale.
4. A subsequent message sees no HELD reservation and opens a new generation.
5. A claimed handler reloads current content from its generic window-start
   cursor and rechecks HELD immediately before channel I/O.

The old `wechat.notification.pr-message` path remains outside this topology as
a finite historical-row drain.

## Verification Matrix

| Case | Required evidence |
| --- | --- |
| M1/M2 coalesce | First message creates one HELD reservation; second message uses the same PR/recipient key and raises high-water without a second row. |
| Terminal-held | Terminal execution alone leaves the reservation HELD. |
| Stale/covering ACK | A stale cursor does not release; a covering cursor releases the held generation. |
| Release/reopen | A later message after release creates a new generation. |
| Eligibility | Configured active recipient with OpenID/credit is scheduled; missing channel, inactive/missing OpenID or no credit is not. |
| Legacy drain | A historical `wechat.notification.pr-message` row drains through its inbox dependency while no current producer creates one. |

The matrix proves Job-level ACK behavior only. It must not be reported as the
later HTTP semantic ACK contract.
