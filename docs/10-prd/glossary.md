# Glossary

Business vocabulary stays here. The file is written in English, but the product-owned Chinese terms remain preserved as the canonical labels where needed.

| Chinese Term | English Label | Meaning |
| --- | --- | --- |
| 搭子请求 | `PR` (`PartnerRequest`) | The core one-off collaboration object that can be created, joined, shared, revisited, and concluded. |
| 搭子位 | `Partner Slot` | The shared participation slot model used by `PR`. |
| 匿名用户 UUID | `Anonymous User UUID` | The lightweight local continuity identifier used to restore anonymous visitor identity across revisits. |
| 协作触发器 | `Collaboration Trigger` | The product thesis that collaboration should start from a lightweight shareable carrier rather than a heavy platform workflow. |
| 地点兴趣点 | `POI` | The semantic carrier for event locations, related gallery or venue context, per-time-window capacity, location-owned availability windows, and user-submitted location application lifecycle. |
| 锚点活动 | `Anchor Event` | An operator-maintained event context for discovery, assisted PR creation, event-owned defaults, time-pool behavior, and event-specific support surfaces. It is not the same object as `PR.type`. |
| 搭子请求类型 | `PR.type` | A PR-owned classification string. It may resolve a PR into an Anchor Event context, but it remains a PR field rather than the Anchor Event's user-facing label. |
| 商品投放 | `Placement` | A backend-authored commerce entry surface rendered in a collaboration context, such as a PR detail utility action. It owns matching and creative, not price or order lifecycle. |
| 商品报价列表 | `Offer Listing` | The priced, context-specific list of offerable products or candidates shown during ordering. |
| 报价 | `Quote` | A server-issued freshness and authorization token for a listed commerce item. Create-order uses quote identity instead of trusting browser-copied product or price facts. |
| 候选集合 | `Choice Set` | A commerce order item shape where the user authorizes multiple acceptable candidates and fulfillment resolves one final product or provider vehicle. |
| 网约车 | `RideHailing` | The commerce product type for route-based ride ordering, where available vehicles and prices depend on route and departure time. |
