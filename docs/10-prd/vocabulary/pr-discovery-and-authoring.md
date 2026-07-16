# PR Discovery Vocabulary

These terms are scoped to `/prd` discovery and PR Authoring. The filename is
retained for link stability; no business Event object is defined here.

| Chinese Term | English Label | Context Boundary | Meaning |
| --- | --- | --- | --- |
| 搭子请求发现 | `PR Discovery` | Pre-commitment discovery | The journey that resolves a `PR.type`, criteria, and candidate presentation before a user joins or creates a PR. |
| 表单模式 | `Form Mode` | Discovery view | A view where the user selects place, start time, and preferences before the system recommends existing PR candidates. |
| 卡片模式 | `Card Mode` | Discovery view | A swipe/deck view over grouped joinable PR candidates and transient creation suggestions. |
| 列表模式 | `List Mode` | Discovery view | A date-grouped view over current/future PR records, bounded closed history, and transient creation suggestions. |
| 发现创建选择 | `PR Discovery Create Selection` | Transient authoring input | Type, time, place, and preference input used by ordinary PR Authoring, including authentication replay; it is not a PR and has no durable identity. |
| 地点兴趣点 | `POI` | Location semantic carrier | The semantic carrier for PR locations, gallery or venue context, per-time-window capacity, location availability, and user-submitted location applications. |
| 地点申请 | `POI Location Application` | Missing-location submission | A user-submitted missing-location request that creates a pending POI for operator review. It is POI-owned and independent of any one PR. |
| 时间建议 | `Time Suggestion` | Authoring input | A current type or PR Discovery suggestion for a concrete PR time window; persisted PRs own their resolved windows. |
