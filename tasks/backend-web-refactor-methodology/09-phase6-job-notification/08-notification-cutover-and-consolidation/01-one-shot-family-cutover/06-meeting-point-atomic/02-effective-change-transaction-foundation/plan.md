# `6-3.1f-02` Plan

1. Identify the smallest repository executor additions needed by the current
   fallback order. Do not convert unrelated POI or PR-type operations.
2. Parameterize effective resolution by those transaction-local dependencies;
   preserve source-insensitive equality and no-description suppression.
3. Add the narrow transaction-bound Notification port. It accepts per-PR event
   facts plus candidate user IDs, filters source-time eligibility in the
   transaction, and delegates private key policy to Notification owner code.
4. Add focused tests for the resolver/port seam and use static inventory to
   ensure no new concrete legacy scheduler call remains in the shared layer.
