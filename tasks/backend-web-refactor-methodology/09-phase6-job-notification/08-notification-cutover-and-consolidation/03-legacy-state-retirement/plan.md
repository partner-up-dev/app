# `6-3.3` Execution Plan

1. **`6-3.3a` compatibility policy (complete).** Record Sir's forward cut-off;
   cancel production inventory, old-client overlap and retention gates.
2. **`6-3.3b` legacy decoder/drain (cancelled).** Do not retain or migrate old
   concrete Job decoders merely for already-deployed rows.
3. **`6-3.3c` PR-message inbox/API retirement (complete).** Apply the forward migration
   and remove the inbox entity/repository, read-marker endpoint, response
   fields and concrete PR-message edges after a current-source reference audit.
4. **`6-3.3d` opportunity/wave and decoder retirement (complete).** Remove unused
   opportunity/wave entities, repositories, services and scheduler exports with
   their forward migration after a current-source reference audit. Remove all
   concrete per-kind handlers/registrations/cancel helpers and generic
   no-cycle compatibility payloads under the same accepted cut-off.
5. **Delivery retention (complete/deferred).** Retain
   `notification_deliveries`; compare it with O11y while interpreting
   FAILED/SKIPPED `sentAt` as attempt time, not accepted delivery. Its removal
   is deferred beyond Phase 6 until real observability infrastructure exists.
6. **Verification (complete).** Run migration checks,
   import/dead-code searches, targeted scenarios and canonical static/build
   gates.

Stop if current source still creates or reads a retiring state after the
mutation. Old deployed Job/client compatibility and delivery retirement are not
stop conditions for this sub-task.
