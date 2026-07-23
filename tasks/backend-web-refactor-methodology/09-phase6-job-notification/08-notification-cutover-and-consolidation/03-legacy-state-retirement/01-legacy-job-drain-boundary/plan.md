# `6-3.3b` Plan

1. Classify actual production rows from `6-3.3a`; reject unknown payloads.
2. Choose the smallest safe path per family: retain decoding through drain,
   migrate only verified non-running rows, or controlled archive/cancel under
   an operator-approved policy.
3. Prove the path with old-row fixtures and a worker claim/lease boundary.
4. Record the monitored zero-row/drain condition that permits registration
   removal in a later release.

## Cheapest Credible Verification

One representative fixture per payload family plus a grouped production count
before/after a controlled drain window. No live provider send is needed.
