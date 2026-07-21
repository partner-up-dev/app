# Phase 5 Workstream Map — Historical Sequence And Remaining Gates

```text
C0 System Model Gate (fact / sequence / read-cache / vocabulary) — complete
│
├─ A. Write-State Spine
│   ├─ 5-2 Quote → Admission → CreateOrderAttempt → provider dispatch — complete
│   ├─ 5-4 Rental R0 runtime retirement — complete, retained-Bill payment risk deferred by Sir
│   └─ 5-5 Provider observation → durable execution → final Bill target — complete
│
├─ B. Read-Model Spine
│   ├─ Checkout PaymentTx authority / mutation reconciliation — complete (`13-read-model-cache-convergence`)
│   ├─ Viewer Bill projection — deferred; needs a request-count baseline first
│   └─ 5-5 controlled Ride observation trigger and Order Detail projection — complete
│
└─ C. Closure And Evidence
    ├─ 5-6A proven public-surface and compatibility closure — complete
    ├─ 5-7b local review and Placement feedback repair — complete
    └─ 5-7a deployed topology evidence — pending authorized staging/provider proof
```

## Sequencing Rules

1. `5-2` was the first source slice after C0. It owns creation/admission facts, not all Ride runtime behavior.
2. `5-4` followed `5-2` because both touch the create-order surface; keeping R0 separate preserved an interpretable
   Ride admission proof. Its retained-Bill payment divergence is explicitly deferred by Sir, not silently resolved.
3. `5-5` followed the `CreateOrderAttempt` decision: provider observation can resolve an unknown create without
   inventing a second order.
4. Checkout cache convergence was realized by `13-read-model-cache-convergence/01-checkout-payment-tx`. It remains
   independent of Rental and was not bundled into a checkout feature change.
5. The Viewer Bill projection is intentionally later and only justified by the confirmed 1+N
   projection, a request-count threshold, and a focused change to the current intentional IDs-only TDD contract.
6. `5-6A` removed old imports/exports only after both write-state and read-model consumers had a proven replacement.
7. `5-7a` is still external evidence, not a source-repair substitute. `5-7b` local review is complete; formal Phase
   exit needs an authorized staging/provider proof or an explicit Phase-exit deferral.

## Explicitly Deferred

- D3 adjustment/refund product behavior;
- the job-runner/outbox delivery design for post-settlement RideHailing fee confirmation;
- Rental schema/data reclamation;
- retained Rental Bill payment ingress, explicitly deferred by Sir without rewriting R0;
- Admin read-composition redesign;
- cosmetic module/component splitting.
