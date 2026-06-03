# Current State And Contradictions

## Current Implemented Shape

- PR Page renders `PRCommercePlacementAction` inside the Utility Actions row.
- `PRCommercePlacementAction` calls `useCommercePlacement(prId, "BUTTON")`.
- The frontend query calls:
  - `GET /api/commerce/placements?context=pr&contextId=:prId&type=BUTTON`
- Backend controller calls `resolveCommercePlacementForPr({ prId,
  viewerUserId })`.
- `resolveCommercePlacementForPr`:
  - reads PR by id;
  - gates visibility to active PR participants;
  - builds a PR-specific placement rule context;
  - queries active placements by `slotKey = "PR_UTILITY_ACTIONS_BUTTON"`;
  - applies JSON Logic matching;
  - filters to `target.kind === "OFFER"`;
  - checks target Offer is active;
  - looks for an existing non-terminal PR-attached order;
  - returns either `ORDER` target with `/orders/:orderId` or `ORDERING`
    target with `/ordering/from-placement?...`.

## Current Durable/Task Claims

- `issue-231` already says Placement route/read surfaces are Placement-owned
  and PR detail is only the page composition surface.
- `issue-231` also says Placement matching is not surface-based and Placement
  itself is not PR-bound.
- Existing docs still preserve older target semantics:
  - Button Placement is rendered inside PR Page Utility Actions.
  - Placement target is backend-authored.
  - frontend must not infer whether an order already exists.
  - PR-context visibility says active participants can see PR-attached order
    targets and PR-context placements.

## Contradictions To Resolve

- The API path is Commerce-owned even though the owner should be Placement.
- The resolver name and implementation are PR-specific.
- The request passes `context=pr&contextId=...` instead of a caller-owned
  matching context.
- The response returns click target/navigation, mixing Placement matching with
  PR order lookup and Ordering entry selection.
- `slotKey` encodes a render container, but the proposed model wants the
  mounted PlacementSlot to request by `type` only.
- `pr_attached_orders` models PR-order linkage as a separate table, while the
  proposed state makes PR own `orders uuid[]`.
