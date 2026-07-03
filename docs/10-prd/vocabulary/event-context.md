# Event-Context Vocabulary

These terms are scoped to Anchor Event discovery and event-assisted PR creation. They should not redefine the core `PR` object.

| Chinese Term | English Label | Context Boundary | Meaning |
| --- | --- | --- | --- |
| 锚点活动 | `Anchor Event` | Event context, not PR identity | An operator-maintained event context for discovery, assisted PR creation, event-owned defaults, time-pool behavior, and event-specific support surfaces. It is not the same object as `PR.type`. |
| 表单模式 | `Form Mode` | Anchor Event landing mode | An event landing mode where the user selects place, start time, and preferences before the system reveals matched or candidate PRs. |
| 虚拟搭子请求 | `Dummy PR` | Browser-side event opportunity before materialization | A transient event browse item derived from future event create windows, enabled place options, and preset preferences. It becomes a real PR only after the user triggers detail intent. |
| 地点兴趣点 | `POI` | Location semantic carrier | The semantic carrier for event locations, related gallery or venue context, per-time-window capacity, location-owned availability windows, and user-submitted location application lifecycle. |
| 地点申请 | `POI Location Application` | Missing-location submission | A user-submitted missing-location request that creates a pending POI for operator review. It is POI-owned and independent of any one Anchor Event. |
| 时间池 | `Time Pool` | Anchor Event availability context | Event-owned time availability used by event browsing and assisted creation. PRs still persist their own resolved time windows. |
