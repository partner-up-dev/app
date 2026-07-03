# Commerce And Support Vocabulary

These terms are scoped to PR-attached fulfillment, support, feedback, and ordering contexts. They do not turn PartnerUp into a generic ecommerce or support platform.

| Chinese Term | English Label | Context Boundary | Meaning |
| --- | --- | --- | --- |
| 商品投放 | `Placement` | Commerce entry in collaboration context | A system-authored commerce entry surface rendered in a collaboration context, such as a PR detail utility action. It owns matching and creative, not price or order lifecycle. |
| 商品报价列表 | `Offer Listing` | Pre-order listing surface | The priced, context-specific list of offerable products or candidates shown during ordering. |
| 报价 | `Quote` | Listing-to-order freshness boundary | A server-issued freshness and authorization token for a listed commerce item. Create-order uses quote identity instead of trusting browser-copied product or price facts. |
| 候选集合 | `Choice Set` | Multi-candidate order authorization | A commerce order item shape where the user authorizes multiple acceptable candidates and fulfillment resolves one final product or provider vehicle. |
| 网约车 | `RideHailing` | Route-based commerce product | The commerce product type for route-based ride ordering, where available vehicles and prices depend on route and departure time. |
| 反馈问卷 | `Feedback Questionnaire` | Mounted feedback capability | A reusable questionnaire template or mounted instance that can be attached to PR or event context for post-event feedback. |
| 运营支持 | `Operator Support` | Product support and maintenance loop | Operator-visible support or maintenance action that keeps collaboration workflows operable without becoming a generic community-management surface. |
