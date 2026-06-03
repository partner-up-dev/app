# UI/UX Problem Map

## Summary Claim

The current Ordering Page is a functional test surface, not a production-grade ordering experience. The main issue is not any single card style. The page lacks an intentional checkout information architecture and has weak spatial contracts between scrollable content, summary, validation, and primary action.

## P0 UX Problems

1. Footer/content collision

The bottom action region is outside the scroll body and visually competes with the body. In screenshots, the footer overlays or crowds the lower content. This makes the user feel the page is clipped, especially on mobile.

2. Primary action state is unclear

The disabled create button can sit next to `待确认`, while the blocking reason appears below the footer. The user must infer whether the problem is price evaluation, missing input, backend availability, or validation.

3. The page does not behave like a coherent checkout review

Rental splits product, PR-locked facts, SKU selection, registrant inputs, policies, notices, price, and validation into separate surfaces without a clear priority order. RideHailing shows a map-like surface first but does not make the booking decision hierarchy obvious.

4. Critical locked PR facts are visually weak

Rental facts are technically present, but they read like generic form facts rather than the immutable source of what the user is about to buy. The page title `确认预订` does not surface enough semantic context.

5. RideHailing map is decorative but claims checkout prominence

The map area dominates the first viewport but is not interactive, not a real map, and does not expose distance, route confidence, provider estimate status, or pickup/dropoff editing. It consumes attention without carrying enough decision value.

6. Order UI exposes PR coupling as a first-class section

The Rental surface currently labels core service facts as `已从 PR 锁定`. That is an ownership leak. Ordering may be entered from PR placement, but the Order page should speak in order, service, and product language rather than presenting itself as PR-owned state.

## P1 UX Problems

1. SKU selection lacks comparison affordance

The Rental SKU cards show name, count, duration, and price, but the chosen state is only border emphasis. There is no concise "selected package" confirmation or explanation of why options are available.

2. Registrant form appears late and disconnected

The user reaches required input after product and SKU surfaces. The footer can already show disabled create state before the user has encountered all required fields.

3. Warning placement is structurally weak

Warnings are footer children after the bottom bar. This makes validation feel like an appendix, not part of the user's active task.

4. RideHailing settings are generic buttons

`10:00出发`, `同乘人`, and `联系方式` are equal-weight rows, but contact phone is a hard requirement while riders and departure can be locked from PR context. The UI does not express this difference.

5. Drawer behavior is under-specified

The RideHailing drawer is sticky inside the scroll content rather than a clear modal/bottom-sheet interaction. It may collide conceptually with the page footer.

## P2 UX Problems

1. Visual hierarchy is too card-heavy

Every concept becomes a card or card-like block. The result feels like stacked admin/test UI rather than a focused ordering page.

2. Product media is absent

Rental has no product photo or venue visual. RideHailing uses a generated map-like graphic, but the visual is not actual service evidence.

3. Locale/time clarity can be improved

The mock displayed `01/01 18:00` for a UTC payload. This is technically local-time formatting, but the ordering page should make timezone/product-local time expectations explicit if commerce depends on it.

## Topology Interpretation

```text
Current mental model:
  component inventory -> stacked cards -> footer CTA

Needed mental model:
  order promise -> locked facts -> user-controlled choices -> readiness -> submit
```

## Non-Goals Until Confirmed

- Do not replace commerce backend contracts.
- Do not redesign Order Detail in the same slice.
- Do not change PR placement matching or existing-order routing.
- Do not add a second fake or commerce-local map implementation. Real map work should reuse or enhance the existing shared map / route map stack.
