# Phase 5 Final Review — Finding Register

## F-01 — Rental R0 Can Still Create a Payment

**Severity: blocker. Confirmed.**

R0 promises no new Rental payment flow while retaining historical Rental order
and Bill reads. The current implementation preserves the read paths but leaves
them payment-capable:

```text
historical Rental Order Detail
  -> “查看账单并支付” link
  -> Bill Detail selects a payable line
  -> Checkout target reports payable
  -> createPaymentCharge opens Bill execution and asks the provider for prepay
```

Evidence:

- `apps/web/src/pages/CommerceOrderDetailPage.vue:122-132` always exposes the
  Bill/pay link when any Bill exists.
- `apps/web/src/pages/CommerceBillDetailPage.vue:82-95` renders a checkout CTA
  for any selected payable line.
- `apps/backend/src/domains/bill/use-cases/get-bill-detail.ts:136-143` marks a
  Rental line payable when it satisfies generic Bill conditions.
- `apps/backend/src/domains/bill/use-cases/get-bill-line-checkout-target.ts:48-61`
  has no `order.family === "RENTAL"` disablement; its projection passes the
  same generic predicate at `:112-125`.
- `apps/backend/src/domains/payment/use-cases/payment-contract.ts:201-279`
  consumes that target and can proceed to provider prepay.
- The durable rule is explicit: `docs/10-prd/behavior/rules-and-invariants.md:138-139`
  forbids new Rental payment while preserving historical reads.

### Minimal Repair Boundary

Keep historical reads as `200` and visibly read-only. Make the Bill checkout
projection ineligible for `RENTAL`, reject the payment creation command before
opening an execution slot or calling a provider, and remove/replace the Web
payment CTA for a Rental Bill. Add a scenario seeded with a historical Rental
Bill that proves no Payment execution, provider prepay, or related write.

The exact public rejection shape (`410 RENTAL_RUNTIME_RETIRED` for the payment
command versus a stable ineligible Checkout projection) should follow the
existing R0 ingress convention and be decided alongside the repair; it must not
break historical reads.

### Disposition

**Deferred by Sir from this pass.** This is a conscious scope/risk acceptance,
not a change to the durable R0 rule. No Rental source or durable-document
mutation is authorized by this disposition.

## F-02 — Settled Payment Consequence Has No Recovery Path

**Severity: high. Confirmed.**

The refactor correctly distinguishes a first settlement from a replay, but
uses that distinction to skip the downstream settlement consequence. If the
Bill settlement is committed and the subsequent RideHailing fee confirmation
throws, the durable Bill is paid yet no supported trigger retries that external
consequence.

```text
provider reports success
  -> BillLine becomes SETTLED
  -> post-settlement consequence throws
  -> retry sees ALREADY_SETTLED
  -> current code skips consequence
```

Evidence:

- `apps/backend/src/domains/payment/use-cases/payment-notifications.ts:128-136`
  invokes the consequence only on `SETTLED`.
- `apps/backend/src/domains/payment/use-cases/payment-execution.ts:79-89` returns
  `ALREADY_SETTLED` without reconciliation; at `:109-125` it likewise invokes
  the consequence only on a new settlement.
- `apps/backend/src/domains/bill/use-cases/bill-line-payment-execution.ts:146-160`
  deliberately returns `ALREADY_SETTLED` for the exact same attempt.
- The old notification path called the consequence after either a first mark
  or an already-marked line, so this is a behavioral regression rather than an
  intended new product rule.
- `apps/backend/src/domains/trade/use-cases/apply-bill-settlement-to-order.ts:39-62`
  reaches `confirmFee`; the provider operation is after durable Bill mutation.

### Minimal Repair Boundary

Reintroduce a safe recovery trigger for the exact settled attempt and prove the
failure/replay sequence. A shallow condition change is sufficient only if the
provider fee confirmation is explicitly idempotent; otherwise persist a narrow
post-settlement delivery state that distinguishes “Bill settled” from “fee
confirmed.” Do not claim exactly-once external delivery without that durable
state.

Required regression proof: make the first fee confirmation fail after Bill
settlement, then replay the same valid notification and/or the Checkout
reconciliation path; assert the recovery semantics and no duplicate Bill
settlement.

### Disposition

**Deferred by Sir to a future job-runner/outbox design.** Do not add an
unconditional `ALREADY_SETTLED` replay shortcut here; the future slice must
make the durable delivery owner, state, trigger, retry policy, and provider
idempotency contract explicit.

## F-03 — Placement Admission Feedback Can Describe the Previous PR

**Severity: medium. Confirmed; approved for repair.**

`usePlacementOrderingEntryFlow` retains its last `admissionOutcome` until the
next primary-action click. Vue Router reuses `PRPage` while only its route
parameter changes, so navigating directly from one PR to another can render a
message whose eligibility result belongs to the previous PR.

Evidence:

- `apps/web/src/domains/commerce/use-cases/usePlacementOrderingEntryFlow.ts:25-31`
  initializes the outcome once and clears it only at the next click.
- `apps/web/src/domains/commerce/ui/ButtonPlacement.vue:51-58` renders the
  stored outcome without tying it to the current Placement/PR identity.
- `apps/web/src/app/AppRoot.vue:3` renders an unkeyed `RouterView`, allowing
  route-param navigation to reuse the page component.

### Minimal Repair Boundary

Clear admission feedback whenever the stable Placement/PR context identity
changes, and add a focused unit test that changes context without remounting.
Do not make the message itself a second admission authority: the next create
attempt must still use the backend's current admission result.

### Result

**Fixed in `5-7b.3`.** `ButtonPlacement` invalidates the local flow when the
matching context or matched Placement changes. The flow uses a local request
generation, so an invalidated response cannot restore feedback, handoff state,
or navigation. Focused tests prove both no-remount feedback clearing and late
creator-response suppression.

## Reviewed, Not A Finding — Callback/Cancellation Overlap

The initial review concern that a provider cancellation callback creates a
second system attempt while a user cancellation claim is pending is not borne
out by the current source. `closeRideHailingOrderFromProviderCancellation`
(`apps/backend/src/domains/trade/services/order-termination.ts:153-171`) adopts
and approves the latest pending claim. The original cancellation completion
then accepts its own approved claim at
`apps/backend/src/domains/trade/use-cases/cancel-ride-hailing-order-from-order-detail.ts:658-675`.

This is a useful characterization case for a regression test, but it is not a
commit blocker based on the current implementation.
