# Placement Key Models

## Current Code Models

```ts
type PlacementType = "BUTTON";
```

Placement type selects the rendering/creative family. Current only implemented
type is Button.

```ts
type PlacementSlotKey = "PR_UTILITY_ACTIONS_BUTTON";
```

Current slot key encodes the render container. Target direction removes this
from the entire Placement domain and lets the mounted PlacementSlot request by
type.

```ts
type PlacementMatchingRuleJson = RulesLogic;
```

JSON Logic-compatible persisted rule. It is evaluated against a normalized
matching context.

```ts
type ButtonPlacementCreative = {
  ctaLabel: string;
  description?: string | null;
};
```

Target Button creative payload. `description` renders as subtle text under the
action button when present.

```ts
type PlacementTarget =
  | { kind: "OFFER"; offerId: number }
  | { kind: "ORDER"; orderId: number };
```

Current model permits target union. In practice, stored Placement targets are
Offer-oriented, while runtime projection currently converts to `ORDERING` or
`ORDER`. Target direction removes `target` as the runtime/navigation concept
from Placement. Placement Instance should have a direct Offer association
needed for downstream click orchestration.

```ts
type PlacementBindingRule = {
  fieldKey: string;
  contextPath: string;
  lock: true;
};
```

Placement-owned binding metadata maps fields required by downstream Ordering
to values from the supplied matching context. Bound fields are locked by
invariant.

```ts
type PlacementInstance = {
  id: number;
  placementType: PlacementType;
  offerId: number;
  matchingRule: PlacementMatchingRuleJson;
  priority: number;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  creative: ButtonPlacementCreative;
  bindingRules: PlacementBindingRule[];
};
```

Target aggregate-ish shape for a configured Placement record. The current code
does not expose `offerId` at this level because it hides the association inside
`target: { kind: "OFFER", offerId }`; that was a modeling mistake caused by
treating click target resolution as a Placement responsibility.

## Current Database Model

`placements` currently stores:

- `id`
- `status`
- `placement_type`
- currently `slot_key`, target remove
- `matching_rule`
- `priority`
- `effective_from`
- `effective_to`
- `creative`
- currently `target`, target replace with direct `offer_id` / Offer association
- `binding_rules`
- `created_at`
- `updated_at`

Current index:

- `(slot_key, status, priority)`

Target impact if `slotKey` is removed:

- replace slot-key query/index with `placement_type + status + priority`
- confirm whether one mounted ButtonPlacement may receive multiple matches or
  only the top-priority instance

Target impact if `target` is removed:

- replace persisted target JSON with an explicit Offer association;
- keep navigation and existing-order resolution out of Placement matching;
- admin Placement editing chooses the associated Offer, not a target union.

## Adjacent Models

`Offer` remains the sellable campaign/commerce source:

- `productType`
- `spuIds`
- `pricingRules`
- term/version timing

`ProductSpu` remains the source of product type and ordering/order/fulfillment
family derivation.

`ProductSku` remains the concrete sellable variant and base pricing/cancellation
truth.
