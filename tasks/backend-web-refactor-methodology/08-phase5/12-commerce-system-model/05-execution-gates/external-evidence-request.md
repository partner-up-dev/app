# External Evidence Needed For A Complete Phase Exit

`5-7a` is not needed to begin `5-2`, but it is required before claiming Phase 5 fully complete. At the appropriate
time, the implementation needs one named staging target and authority for safe, non-destructive evidence:

1. a staging/test RideHailing provider instance and callback route that may receive one signed callback or the
   provider's documented safe-smoke equivalent;
2. a staging/test payment provider path or documented signed-notify safe-smoke mechanism;
3. confirmation of the named origin/edge target, expected status, and rollback/containment posture;
4. an operator/credential path for provider-console facts that cannot be observed through the public application.

The desired proof is receipt and rejection behavior (valid signed callback reaches backend; invalid signature/routing
is rejected), not an uncontrolled real passenger trip or payment. If this authority cannot be supplied, local Phase
work can be complete but `5-7b` must remain explicitly blocked on external evidence.
