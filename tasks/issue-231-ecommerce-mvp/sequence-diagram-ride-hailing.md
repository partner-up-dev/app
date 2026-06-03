Scope note: this diagram captures the ride-hailing subset that is in scope for
the current issue. Real provider dispatch, driver monitoring, actual-cost
callback, final payment after trip, and provider settlement are future
RideHailing provider fulfillment work and are intentionally not part of this
diagram.

```mermaid
flowchart TD
    A["Anchor Event Form Mode<br/>地点<br/>时间<br/>CTA：加入 / 创建"] --> B["PR Page"]

    B --> C{"PR Context 是否匹配<br/>Ride Hailing Placement Instance？"}
    C -- "匹配，且类型为 Button" --> D["Utility Actions 独立行显示 Button Placement<br/>文案：打车（8折）"]
    C -- "不满足" --> B

    D --> E["点击 Button Placement"]

    E --> F{"该 Offer<br/>在当前 PR 下是否已有订单？"}
    F -- "已有订单" --> OD["Order Detail"]
    F -- "没有订单" --> OF["Offer Detail"]

    OF --> OC["Offer Detail 按 Offer SPU list<br/>组装 Ordering(s)"]
    OC --> SKU["SKU 类型：Ride Hailing"]

    SKU --> RHO["Ride Hailing Ordering 组件<br/>路线地图<br/>车型选择<br/>乘车人<br/>时间<br/>价格预估<br/>下单 CTA"]

    RHO --> Detail["价格旁功能：查看明细"]
    RHO --> Check{"是否允许下单？"}

    Check -- "PR 已处于 READY<br/>且下单人是 PR 创建者" --> CreateOrder["创建 Ride Hailing Order Foundation"]
    Check -- "条件不满足" --> Disabled["禁用下单 / 提示不可下单"]

    CreateOrder --> AttachPR["同事务请求 PR Domain 附加订单"]
    AttachPR -- "PR 非 READY" --> Rollback["拒绝附加<br/>订单创建事务回滚"]
    AttachPR -- "PR READY" --> Snapshot["保存 Quote Snapshot<br/>路线 / 时间 / 车型 / 预估价 / 优惠规则"]
    Snapshot --> PendingFuture["订单详情展示<br/>Quote Snapshot<br/>RideHailing Fulfillment boundary<br/>真实网约车履约待未来实现"]
    PendingFuture --> OD

    CreateOrder -. "用户取消" .-> Cancel["订单取消"]
    Cancel --> OD
```

## Future RideHailing Provider Fulfillment Reference

The previous target flow included provider dispatch, waiting for driver
acceptance, driver/vehicle/location updates, passenger boarding, trip start/end,
actual route/mileage/time callback, discount application, final bill, payment,
and provider-side cancellations.

Those steps are useful product context, but they are out of scope for issue 231
unless a later issue explicitly pulls real ride-hailing fulfillment back in.
