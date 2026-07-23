# `6-3.2b-3.5` Plan

1. Add the one missing real-Postgres generic `43101` proof: a generic owner
   dispatch receives permission revocation, invokes the canonical PR-message
   clear transaction, releases the held generation, and a subsequent
   zero-to-positive grant creates no historical job.
2. Treat the existing source-specific scenarios as the one matrix, rather than
   duplicating business setup in a mega-test: participant removal, terminal
   fences, admin tombstone/root delete, subscription clear/re-enable, and the
   new generic `43101` test together cover every named entrance.
3. Run that matrix, then the complete backend scenario/unit suites, static
   gates, build and `git diff --check`.
4. Audit only the architectural claims made by b3: source domains and the
   controller must have zero direct Job writer/key/job-runtime imports; no
   changed lifecycle route may write inbox/wave/opportunity/delivery or the
   concrete PR-message type. Retained legacy drain code is an expected,
   explicitly classified exception rather than a zero-match target.
5. Promote verified current behavior, lock order and compatibility boundaries
   to durable docs. Do not call the concrete handler or inbox table retired;
   `6-3.2c` subsequently completed the current Web ACK migration, while
   `6-3.3` remains responsible for retirement.
