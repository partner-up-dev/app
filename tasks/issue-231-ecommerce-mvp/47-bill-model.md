# Bill: Participant Obligation Model

## Purpose

Define the minimal Bill-domain model for issue 231.

Bill exists to own participant financial obligations after a payable event
exists. It does not own order pricing truth, payment-gateway transport, or
fulfillment execution.

## First-Principles Answer

Before choosing tables and names, the real question is:

When the system needs to answer "who still owes how much" or "who should be
refunded how much", which domain owns that truth?

The answer should be Bill.

That does **not** mean Bill must mirror Order or Payment. It means:

- Order creates the billable event
- Order/Trade decides whether a cancellation/abort consequence is valid
- Bill materializes participant obligations from that event
- Payment settles those obligations through money movement
- Fulfillment may gate whether refund obligations may be created

## Why Bill Is Necessary

If issue 231 were only single-payer prepaid rental, Order plus Payment might be
enough.

But current scope already requires:

- participant splitting
- multiple PaymentTx records per participant obligation
- usage-based RideHailing final billing after trip finish
- participant-level refund math based on actual paid amount

Those are all obligation-layer problems, not just payment-attempt problems.
That is why Bill should exist.

## Simplest Useful Topology

The prior `BillShare + RefundObligation` model works, but it is not the most
elegant minimal shape because charge and refund do not look symmetric.

The cleaner topology is:

- `Bill`
- `BillLine`

Where:

- charge obligation = `BillLine(kind=CHARGE)`
- refund obligation = `BillLine(kind=REFUND)`
- `PaymentTx` targets one `BillLine`

This keeps settlement machinery symmetric while allowing charge and refund
causes to remain different upstream.

In the forward-versus-reverse performance framing:

- `CHARGE` lines are forward-direction obligations
- `REFUND` lines are reverse-direction offset obligations

Ride-hailing pre-trip abort fee, if approved by provider, is not a special new
kind of cancellation domain. It is simply another Bill-side financial
consequence emitted by upstream termination resolution.

The key simplification here is:

- `BillLine` should not persist a structured cross-domain cause union such as
  `ORDER_SPLIT | ORDER_TERMINATION_REFUND | ORDER_TERMINATION_ABORT_FEE`
- `BillLine` should keep obligation truth plus human-readable explanation only

## Aggregate Boundary

Bill owns:

- Bill
- participant-level obligation lines
- derived settlement status over those lines

Bill does not own:

- WeChat callback verification
- raw PaymentTx lifecycle
- pricing calculation
- cancellation-policy tier selection
- fulfillment-side irreversible-action truth

So the handoff should be narrow:

- Order/Trade gives Bill a `BillSeed` when a payable charge basis is ready
- Order/Trade gives Bill a `BillTargetAmountSeed` when contract termination or
  abort has changed the equivalent buyer-side total amount
- Payment gives successful `PaymentTx` facts that already target `BillLine`

`BillTargetAmountSeed` should be read as:

- the target total amount the buyer side should effectively owe after Order has
  translated seller-side fulfilled reality into money-side equivalence

It is not a "refund seed" or "extra-charge seed". Bill compares its current
charge total with that target and materializes the delta as refund lines or
additional charge lines.

## Minimal Write Model

```ts
type BillStatus = "ACTIVE" | "VOIDED" | "CLOSED";

type ChargeSettlementStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

type RefundSettlementStatus =
  | "NONE"
  | "NO_REFUND"
  | "PENDING"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

type BillSource = {
  kind: "ORDER";
  source_id: string;
};

type BillLineKind = "CHARGE" | "REFUND";

type Bill = {
  id: string;
  status: BillStatus;
  source: BillSource;
  currency: "CNY";
  lines: BillLine[];
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
};

type BillLine = {
  id: string;
  bill_id: string;
  user_id: string;
  kind: BillLineKind;
  amount_fen: number;
  currency: "CNY";
  label: string;
  description?: string | null;
  source_line_id?: string | null;
};

type BillSeed = {
  source: BillSource;
  currency: "CNY";
  charge_lines: {
    user_id: string;
    amount_fen: number;
  }[];
};

type BillTargetAmountSeed = {
  source_order_id: string;
  source_attempt_id: string;
  currency: "CNY";
  target_charge_total_fen: number;
};
```

## Why This Is Simpler

This model removes the artificial split between:

- "charge share"
- "refund obligation"

They are both participant obligations with:

- a user
- an amount
- a settlement lifecycle
- successful PaymentTx applications

The real asymmetry is only their upstream cause:

- charge lines come from order split
- refund lines come from cancellation/refund consequence

That asymmetry should stay visible in upstream services and user-facing line
copy, but BillLine schema itself can stay unified.

There are two important simplifications available in current issue-231 scope:

- do not add a separate `BillApplication` table yet
- let `PaymentTx` point directly to one `BillLine`
- let Bill derive settlement from successful PaymentTx rows targeting its lines
- do not make `BillLine` persist a structured upstream-cause union; keep
  `label` and optional `description` instead

This is the smallest topology that still preserves clean boundaries.

## Why Bill Owns Settlement Status

`Bill owns settlement status` means **Bill owns the derivation semantics**, not
necessarily that there must be one manually maintained status column or a
Bill-owned application table.

Purpose:

- Payment knows whether a money movement succeeded
- Bill knows whether a business obligation is satisfied

Without Bill owning settlement derivation, the system cannot answer reliably:

- who still owes money
- whether the whole bill is partially paid or fully paid
- whether refund responsibility still remains open

So the clean split is:

- Payment: "money moved and targeted BillLine X"
- Bill: "given the successful money movements on my lines, which obligations
  are settled"

## Topology

### Charge Side

`Order` -> `BillSeed` -> `Bill` adds `CHARGE` lines -> successful charge
`PaymentTx` rows target those lines

### Adjustment Side

Order-translated termination/abort consequence -> `BillTargetAmountSeed` ->
`Bill` compares current charge total with target total -> `Bill` adds `REFUND`
or extra `CHARGE` lines -> successful `PaymentTx` rows target those lines

This is the minimal topology that still supports:

- multi-payer billing
- usage-based final billing
- participant-level refund math

Current cardinality decision for issue 231:

- `1 Bill -> N BillLine`
- `1 Bill -> N PaymentTx`
- `1 BillLine -> N PaymentTx`
- `1 PaymentTx -> exactly 1 BillLine`

This allows:

- retry payments against the same charge line
- multiple successful partial payments against one charge line if needed
- multiple refund attempts against one refund line if needed

If a future scope needs one PaymentTx to settle multiple BillLines in one
operation, reintroduce an explicit allocation/application join model then. It
is not required for the current issue.

## Exact Reconciliation Rule

`ReconcileBillToTargetAmountService` should use this concrete rule in issue 231:

1. Compute the current effective total as:
   - `sum(CHARGE lines) - sum(REFUND lines)`
2. Compare that effective total with `target_charge_total_fen`.
3. If the target is lower:
   - create new `REFUND` lines for the delta
4. If the target is higher:
   - create new `CHARGE` lines for the delta
5. Allocate that delta across participants by the original charge-line
   distribution, not by current refund-line distribution.
6. When proportional allocation leaves remainder fen:
   - distribute remainder deterministically by larger fractional remainder
   - break ties by stable user id ordering

This keeps Bill-side reconciliation:

- deterministic
- aligned with the original split basis
- independent from Payment timing

## Relation To Order

Bill is created from Order, but should not structurally mirror Order.

Bill needs only:

- `source.kind = ORDER`
- `source.source_id = order_id`
- `currency`
- participant charge lines

It does not need:

- order family
- offer snapshot
- item-level merchandising facts
- price explanations
- fulfillment payload

Those remain in Order or other owners.

## Split Rule To Bill Lines

Charge-line generation is deterministic from:

- `order.pricing_snapshot.total_fen`
- `order.participants`
- `order.split_rule_snapshot`

But once materialized, Bill should hold only the resulting `charge_lines`.

The split-rule snapshot itself should be canonical rather than UI-mode-shaped.

Recommended rules:

- `RELATIVE`
  - each share carries `percent_bps`
  - sum must equal `10000`
  - equal split is only a helper-expanded relative rule, not the stored shape
- `ABSOLUTE`
  - each share carries `amount_fen`
  - sum must equal the total billable amount

This is cleaner because `AA_EQUAL` and similar names are convenience input
modes, not durable cross-domain truth.

## Settlement Derivation

Settlement is derived from successful PaymentTx rows targeting Bill lines, not
from raw PaymentTx existence alone.

Recommended derivations:

- `charge_settlement_status`
  - `UNPAID`: no successful applications on charge lines
  - `PARTIALLY_PAID`: some, but not all, charge amount applied
  - `PAID`: all charge-line amounts fully applied
- `refund_settlement_status`
  - `NONE`: no refund line exists
  - `NO_REFUND`: refund decision led to no refundable amount
  - `PENDING`: refund lines exist but are not fully applied
  - `PARTIALLY_REFUNDED`: some refund applied, still outstanding
  - `REFUNDED`: all refund-line amounts fully applied

`Bill.status` itself should remain narrow:

- `ACTIVE`
- `VOIDED`
- `CLOSED`

## Refund Line Creation

Bill should not itself decide whether cancellation is allowed.

That decision belongs upstream to Order/Trade/Fulfillment using frozen policy
snapshots and operational facts.

Bill receives only a narrow `BillTargetAmountSeed`, then:

1. derives the current effective charge total from existing charge-side bill
   lines
2. compares current charge total with `target_charge_total_fen`
3. if target is lower, creates `REFUND` lines for the difference
4. if target is higher, creates extra `CHARGE` lines for the difference
5. later applies successful PaymentTx results onto those lines

This is the cleanest separation:

- upstream decides service-side termination outcome and translates it into the
  equivalent buyer-side total amount
- Bill translates the gap between current total and target total into
  participant money obligations

For Rental, the preferred current direction is:

- Order termination attempt persists only `effect_kind = POLICY_REFUND`
- Order/Trade derives the target total amount from the frozen order policy
  snapshot plus the termination attempt `requested_at`
- Bill receives only that target total through `BillTargetAmountSeed`

## Key Invariants

- sum of `CHARGE` line amounts must equal the billable charge basis
- payment failure must not mutate line amounts
- refund line amount must not exceed the settled customer-paid basis it comes
  from
- one PaymentTx must target exactly one BillLine in current issue-231 scope
- a Bill can be voided only when no irreversible settlement work remains
- in issue 231, one billable charge basis should create at most one primary
  active Bill

## Aggregate Methods

Recommended Bill aggregate methods:

- `deriveChargeSettlementStatus()`
- `deriveRefundSettlementStatus()`
- `voidIfAllowed(at)`
- `closeIfResolved(at)`

## Application Services

Recommended Bill-domain services:

- `CreateBillFromSeedService`
  - consume narrow `BillSeed`
  - create charge lines
  - create Bill
- `ReconcileBillToTargetAmountService`
  - consume `BillTargetAmountSeed`
  - create refund or extra charge lines so Bill converges to the target total
- `DeriveBillSettlementService`
  - read successful PaymentTx rows targeting Bill lines
  - derive charge/refund settlement projections
- `VoidBillIfAllowedService`
  - void only when settlement state permits

## Time Sequence

### Rental (Prepaid)

1. Order is created with frozen pricing
2. Order/Trade emits `BillSeed`
3. Bill is created immediately with charge lines
4. PaymentTx charge attempts happen
5. successful charge applications settle charge lines
6. Bill becomes fully paid
7. Fulfillment begins
8. if later cancellation is allowed, upstream emits `BillTargetAmountSeed`
9. Bill creates refund lines so the bill converges to the target total
10. successful refund PaymentTx applications settle refund lines

### Ride Hailing (Postpaid)

1. Order is created from quote snapshot
2. no Bill yet, because quote is not the final payable amount
3. trip executes
4. trip ends and final billable amount is committed
5. Order/settlement side emits `BillSeed`
6. Bill is created with charge lines
7. PaymentTx charge attempts happen
8. successful charge applications settle charge lines

## Current Scope Notes

### Rental

- create Bill immediately after Order creation
- refund lines are in scope because rental cancellation policy is already
  designed

### Ride Hailing

- solve real final billing timing
- do not pretend quote-time amount is final payable amount
- create Bill only after final trip settlement amount is committed

## Non-Goals

Do not add in issue 231:

- merchant settlement
- deposit accounting
- provider-side payout logic
- participant self-service exit economics
- generalized accounting ledger behavior
