# Current State

## Route And Entry Model

The user-visible Ordering Page is currently mounted at `/order/new`, route name `order-new`. The route component is `OrderingFromPlacementPage.vue`.

The page does not fetch its entry context from URL params. It reads `sessionStorage["partner-up.ordering-entry"]`, shaped as:

- `source.offerId`
- `offerDetail`
- optional `prId`
- `bindings`

The PR detail placement flow creates this entry payload before routing to `/order/new`.

## Page Topology

```text
------------------------------------------------+
| FullScreenPageScaffold                         |
|                                                |
|  header slot                                   |
|  + PageHeader                                  |
|    - back                                      |
|    - title: 确认预订                           |
|    - action: 客服                              |
|    - subtitle: 确认内容后创建订单              |
|                                                |
|  content slot                                  |
|  + ordering-page__body                         |
|    - missing input error OR                    |
|    - RentalOrderingContent OR                  |
|    - RideHailingOrderingContent                |
|                                                |
|  footer slot                                   |
|  + bottom bar                                  |
|    - price / range summary                     |
|    - create order button                       |
|  + warning/error notices                       |
|  + optional rental price details               |
+------------------------------------------------+
```

The body is `overflow: auto`; the footer is outside the body and remains fixed in the scaffold's vertical layout.

## Rental Content Topology

```text
RentalOrderingContent
  SurfaceCard: 场地服务
    product name
    selling points

  SurfaceCard: 已从 PR 锁定
    facts grid: 人数 / 开始 / 结束

  SurfaceCard: 选择 SKU
    SKU ChoiceCard list
    cancellation policy block

  SurfaceCard: 登记信息
    contact phone input
    registrant name inputs

  SurfaceCard outline: notice blocks
```

On mobile, the locked facts grid collapses from three columns to one column.

## RideHailing Content Topology

```text
RideHailingOrderingContent
  map-like route section
    route polyline
    origin callout
    destination callout

  SurfaceCard
    departure time button
    riders button
    contact button

  optional sticky drawer
    departure OR riders OR contact

  vehicle ChoiceCard list
```

On mobile, the three action buttons collapse from three columns to one column.

## Current Runtime Behavior Seen

With a mock Rental entry payload:

- top of the page shows the header and first cards correctly
- locked time displays in local browser timezone
- footer immediately occupies the lower viewport and can visually cover lower body content
- when order input is incomplete, the warning notice is rendered below the footer bar
- with no backend evaluation connected in the mock-only screenshot path, price remains `待确认`

With a mock RideHailing entry payload:

- the route map renders as a decorative generated map surface, not a real map
- origin and destination callouts appear inside the map area
- vehicle cards render, but quote values are `待确认` without backend evaluation
- the bottom bar competes with the lower vehicle list in the first viewport
