# `6-5.1c` Plan

1. Reuse existing generic Job/PR-message race tests rather than recreate them.
2. Compose the typed RideHailing handler's success, retryable, permanent and
   missing-source dispositions with the generic Job retry/exhaustion/fencing
   proof. Do not add generation, ambiguity or operator business state.
3. Prove paid and all-zero atomic handoffs, duplicate settlement uniqueness and
   post-commit provider execution, then run broad backend/system gates.

## Cheapest Credible Verification

One typed-handler disposition suite plus the paid/all-zero callback scenarios,
composed with existing JobRunner rollback, retry and fencing proof.
