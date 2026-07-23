# `6-3.2c-1` Plan

1. Replace the declaration-only `NotificationAcknowledgementRequest` with a
   validated public contract and a semantic result that hides Job row details.
2. Add Notification's narrow private acknowledgement port/adapter using the
   existing generic Job `acknowledgeUntilAcknowledged` primitive and its
   private `pr.message-summary` key mapping.
3. Add the PR command and curated export; it performs active participant and
   `findByPrIdAndIdIncludingTombstone` validation before calling Notification.
4. Add the controller route with `acknowledgementCursor`, leaving
   `/read-marker` unchanged.
5. Verify with HTTP/real Postgres: raw GET and legacy marker do not release;
   stale cursor holds; covering/tombstoned cursor releases; former participant
   is rejected.
