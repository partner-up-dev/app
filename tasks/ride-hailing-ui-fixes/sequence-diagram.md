# RideHailing Choice-Set Order Sequence

## Model Decisions

- RideHailing Ordering uses a multi-select vehicle SKU list.
- Order creation records an unresolved choice-set item: the user authorizes a
  candidate SKU set and sees the candidate set price range.
- RideHailing Order lifecycle dispatch resolves exactly one final SKU after the
  choice-set item is created.
- Provider dispatch stays inside the create-order transaction for this slice.
- Provider instance is SKU-bound product fact; RideHailing order creation does
  not pre-bind `ride_hailing_orders.providerInstanceId`.
- Post-dispatch provider binding lives only in the choice-set resolution
  snapshot.
- The resolved SKU may be outside the original candidate set when provider
  reality requires it, such as free vehicle upgrades.
- Resolution outside the candidate set must be explicit in the snapshot:
  provider source, resolved SKU / provider car type, and reason.
- Bill is created from the resolved SKU quote / provider final settlement
  amount, not from the unresolved candidate range.
- Dispatch policy starts with the cheapest quoted candidate.
- Provider dispatch failure cancels the order.
- Provider create failure is not retried against the next cheapest candidate,
  another vehicle type, or another provider.
- Provider create failure returns a cancelled order id plus failure reason to
  Ordering Page. Ordering Page shows a failure dialog and does not navigate to
  Order Detail.
- Provider substitution outside candidates bills final settlement as-is.
- Order Detail is not redesigned in this slice; it keeps the current legacy
  selected-vehicle display.

## Target Sequence

```mermaid
sequenceDiagram
  autonumber
  participant UI as Ordering UI
  participant Order as Trade Order
  participant RH as RideHailing Order Lifecycle
  participant Provider as RideHailing Provider
  participant Bill as Bill
  participant Payment as Payment

  UI->>Order: POST /ordering/evaluate<br/>items[CHOICE_SET].candidateSkuIds + route
  Order->>RH: quote candidate SKU set
  RH->>Provider: estimate per candidate SKU
  Provider-->>RH: quote list
  RH-->>Order: candidate quotes
  Order-->>UI: price range + selectable candidates<br/>create_order allowed?

  UI->>Order: POST /orders<br/>items[CHOICE_SET].candidateSkuIds
  Order->>Order: create trade_order<br/>item.kind = CHOICE_SET<br/>resolution = null
  Order->>RH: create ride_hailing_order<br/>executionPhase = INITIATING<br/>no provider pre-binding
  RH->>RH: start dispatch inside create-order<br/>choose cheapest quoted candidate
  RH->>RH: read provider instance from selected SKU facts
  RH->>Provider: createRide with selected candidate car type
  alt provider create accepted
    Provider-->>RH: providerOrderId + accepted/resolved car type
    RH->>Order: resolve choice-set item<br/>resolved SKU or provider car type snapshot
    RH->>RH: executionPhase = DISPATCHING/ACCEPTED
    Order-->>UI: orderId
  else provider create fails
    RH->>Order: cancel order<br/>dispatch failure reason
    RH->>RH: executionPhase = FAILED/CANCELLED
    Order-->>UI: cancelled order id + failure reason
    UI->>UI: show ordering-failed dialog<br/>stay on Ordering Page
  end

  UI->>Order: open Order Detail
  Order-->>UI: existing selected-vehicle projection<br/>from resolved choice-set

  Provider-->>RH: status callbacks<br/>accepted / in_trip / finished
  RH->>RH: update execution phase<br/>driver / vehicle snapshots

  Provider-->>RH: final settlement amount
  RH->>RH: commit finalSettlementInput
  RH->>Bill: create final bill from resolved SKU / settlement
  Bill->>Bill: split final charge lines
  Bill-->>Order: bill available on order detail

  UI->>Bill: open bill/payment action
  Bill->>Payment: create payment execution for bill line
  Payment-->>Bill: settlement callback/query result
  Bill->>Order: settlement consequence if complete
  Order-->>UI: order paid/completed state
```

## Snapshot Shape Sketch

```ts
type ChoiceSetOrderItemSnapshot = {
  itemId: string;
  kind: "CHOICE_SET";
  productType: "RIDE_HAILING";
  candidates: Array<{
    sku: SkuSnapshot;
    quoteSnapshot: {
      amountFen: number;
      currency: "CNY";
      quotedAt: string;
      expiresAt?: string | null;
    };
  }>;
  resolution: null | {
    sku?: SkuSnapshot | null;
    providerVehicleTypeCode?: string | null;
    providerInstanceId?: number | null;
    providerType?: string | null;
    providerOrderId?: string | null;
    quoteSnapshot?: {
      amountFen: number;
      currency: "CNY";
      resolvedAt: string;
    } | null;
    source: "PROVIDER_ACCEPTED" | "DISPATCH_POLICY";
    candidateRelation: "IN_CANDIDATES" | "PROVIDER_UPGRADE" | "PROVIDER_SUBSTITUTION";
    reason?: string | null;
  };
  quantity: 1;
};
```

## Command Shape Sketch

```ts
type CreateOrderItemInput =
  | {
      kind?: "FIXED";
      skuId: number;
      quantity?: number | null;
    }
  | {
      kind: "CHOICE_SET";
      productType: "RIDE_HAILING";
      candidateSkuIds: number[];
      quantity?: 1 | null;
    };
```

## Current Implementation Mismatch

- Current RideHailing create-order synchronously calls provider `createRide`.
  The synchronous timing remains acceptable for this slice, but the target must
  first create a `CHOICE_SET` item and then resolve it during RideHailing
  dispatch.
- Current `trade_orders.items` stores one concrete SKU snapshot immediately.
- Current `ride_hailing_orders` stores provider binding and execution phase but
  target provider binding should live only in choice-set resolution.
- Current `ride_hailing_orders.provider_instance_id` is create-time required,
  but target provider instance ownership should be SKU-bound and resolved during
  dispatch.
- Current final Bill is created after provider final settlement input; this
  aligns with the target billing timing and should be preserved.
