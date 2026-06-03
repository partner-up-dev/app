# Placement Rental Decoupling

## Objective & Hypothesis

Fix the over-coupling introduced around Placement, binding rules, and Rental
Ordering.

Hypothesis: Placement can remain the owner of persisted `bindingRules`, but the
rules must be generic `fieldKey <- contextPath` mappings. Product-family
specific requirements belong to the definition-time binding contract derived
from the target Offer/Product config and to the downstream Ordering consumer.

## Guardrails Touched

- Placement owner: candidate resolution must use `slotKey + matchingRule +
  matching context`.
- Offer owner: target Offer establishes product family and binding contract at
  Placement definition time.
- Trade/Ordering owner: product-family Ordering validates and consumes the
  resolved bound context.
- PR projection: PR may provide matching context and perform PR + Offer
  non-terminal Order lookup, but Placement itself must not depend on PR.

## Target State

- `PlacementBindingRule` remains a Placement model field.
- `PlacementBindingRule.fieldKey` and `contextPath` are generic strings.
- Runtime Placement matching does not inspect ProductType.
- Runtime binding resolution only applies persisted rules to the supplied
  matching context.
- Rental-specific requirements (`participantCount`, `serviceStartAt`,
  `serviceEndAt`) are validated as a Rental Ordering binding contract, not as
  Placement model enums.

## Verification

- Placement binding unit tests cover generic path resolution and contract
  validation.
- Rental ordering scenario still passes.
- Backend/frontend typechecks still pass.

## Result

- Implemented.
- Placement binding rules are generic.
- Rental-specific binding contract is derived from target Offer ProductType at
  Placement definition time.
- Runtime PR placement projection still performs PR + Offer non-terminal Order
  lookup, but Placement candidate resolution itself does not inspect Offer or
  ProductType.
