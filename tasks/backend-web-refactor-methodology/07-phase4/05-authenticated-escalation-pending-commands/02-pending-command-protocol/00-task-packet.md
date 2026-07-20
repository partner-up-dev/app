# 4-4.2 Pending Command Protocol

Own typed pending-action storage and the PR dispatcher. Preserve the one-slot, ten-minute browser-continuity model;
do not introduce server persistence, cross-tab coordination, or generic retries.

## Result

Complete. The waitlist preference is backward-compatible in storage, and the dispatcher now passes the typed action
to its matching handler while preserving clear-before-handler, no-auto-reinsert semantics.
