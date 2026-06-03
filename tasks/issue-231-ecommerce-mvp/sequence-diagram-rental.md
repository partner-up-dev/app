Scope note: this diagram is the reference rental flow for the current issue.
The Placement Instance in this slice has Button type and is rendered in the PR
Page Utility Actions Button Placement row.

```mermaid
flowchart TD
    A["Anchor Event Form Mode<br/>地点<br/>时间<br/>CTA：加入 / 创建"] --> B["PR Page"]

    B --> C{"PR Context 是否匹配<br/>Rental Placement Instance？"}
    C -- "匹配，且类型为 Button" --> D["Utility Actions 独立行显示 Button Placement<br/>文案：预订场地"]
    C -- "不满足" --> B

    D --> E["点击 Button Placement"]

    E --> F{"该 Offer<br/>在当前 PR 下是否已有订单？"}
    F -- "已有订单" --> OD["Order Detail"]
    F -- "没有订单" --> OF["Offer Detail"]

    OF --> OC["Offer Detail 按 Offer SPU list<br/>组装 Ordering(s)"]
    OC --> SKU["SKU 类型：场地租赁 Rental"]

    SKU --> RO["Rental Ordering 组件<br/>场地 / 区域<br/>时间<br/>人数<br/>价格预估<br/>下单 CTA"]

    RO --> Detail["价格旁功能：查看明细"]
    RO --> Check{"是否允许下单？"}

    Check -- "PR 已处于 READY<br/>且下单人是 PR 创建者" --> CreateOrder["创建 Rental Order"]
    Check -- "条件不满足" --> Disabled["禁用下单 / 提示不可下单"]

    CreateOrder --> AttachPR["同事务请求 PR Domain 附加订单"]
    AttachPR -- "PR 非 READY" --> Rollback["拒绝附加<br/>订单创建事务回滚"]
    AttachPR -- "PR READY" --> Bill["创建账单"]
    Bill --> PayNotice["通知支付 / 进行支付"]
    PayNotice --> Paid["账单支付完成"]

    Paid --> ManualBooking["人工联系客服预订"]
    ManualBooking --> BookingResult{"预订结果"}

    BookingResult -- "成功" --> Success["更新订单状态<br/>预约成功"]
    BookingResult -- "失败 / 取消订单" --> Refund["退款"]

    Success --> Notify["通知订单参与者"]
    Success --> Guide["订单上提示入场指引"]

    Refund --> Closed["订单结束 / 取消"]
    Notify --> OD
    Guide --> OD
```
