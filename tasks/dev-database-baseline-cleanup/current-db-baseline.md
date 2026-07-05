# Current Local Database Baseline Export

Captured from the local development database with read-only `select` queries on
2026-07-05. This is task evidence only; it is not durable product metadata.

## Counts

- Anchor Events: 4
- POIs: 7
- Anchor Event preference tags: 2
- Product SPUs: 2
- Product SKUs: 3
- Offers: 2
- Placements: 3
- Payment provider instances: 1
- Ride-hailing provider instances: 2
- Public support config keys: 5

## Anchor Event Shape

The usable local baseline has four operator-configured Anchor Events:

- `羽毛球` / `BADMINTON`
  - Location pool: `广外南体育馆羽毛球场1号场`, `广外南体育馆羽毛球场2号场`, `广外南校羽毛球馆`
  - Time pool: recurring weekdays `[1,2,3,5]` at `17:00` and `[4,6]` at `15:00`
  - Duration: 60 minutes
  - PR creation: user and admin
  - Time window editor default mode: fuzzy
- `学习冲刺` / `STUDY_SPRINT`
  - Location pool: `图书馆自习区A桌`, `图书馆自习区B`
  - Time pool: recurring weekdays `[1,2,3,5]` at `15:40`
  - Duration: 60 minutes
  - PR creation: user and admin
- `泰捣蛋试吃会` / `TAIDAODAN_FOOD_TRIAL`
  - Location pool: `广外南一饭泰捣蛋`
  - Time pool: recurring weekdays `[1,3,5]` at `18:00`
  - Duration: 30 minutes
  - Join notice and feedback questionnaire wiring are useful for manual review
    flows.
  - The exported local default note used non-baseline wording and is not carried
    forward.
- `拼车搭子` / `RIDE_HAILING`
  - Route pool includes campus-to-railway-station and city-center sample routes.
  - No concrete start rules; the PR time window editor default mode is advanced.

Scenario-owned POIs and rejected POIs are excluded from the new baseline.

## Catalog And Provider Shape

The useful local baseline is product/provider configuration only:

- Rental catalog:
  - SPU `广外南体育馆羽毛球场`
  - SKU `普通羽毛球场1小时`
  - Fixed total price: `1000` fen
  - Cancellation policy: full refund before the configured cutoff
- Ride-hailing catalog:
  - SPU `系统曹操出行`
  - SKUs `快车` and `专车`
  - SKU facts reference the active ride-hailing provider instance id
  - Vehicle type codes are numeric provider codes `3` and `5`
- Payment provider:
  - Active local web provider should appear as `微信支付`
  - Active instance key should follow the admin-derived key format
  - Endpoint should target the local portless host
- Ride-hailing provider:
  - Active provider should appear as `系统曹操`
  - Active instance key should be neutral and operator-readable
  - Endpoint and callback base URLs should target local portless hosts

## Offer And Placement Decision

The exported local database contains manually configured active offers and
placements, but the reset baseline should not create active offers or placements
for the user.

The reset baseline should keep provider and catalog records ready for manual
offer and placement creation. Because `0077` and `0081` are development-only,
their reset behavior is edited directly. Anchor Event, POI, support config, and
rental catalog rows are kept in `seeds/0001_anchor_event_bootstrap.sql`.

## Migration Boundary

- Development-only migrations `0077` and `0081` are edited directly for reset
  behavior.
- `seeds/0001_anchor_event_bootstrap.sql` owns Anchor Event, POI, support
  config, and rental catalog baseline rows that were previously seed-like or
  manually configured.
- Staging and production do not receive this baseline.
- No PRs, orders, bills, message rows, or other per-run business-instance rows
  belong in this local baseline.
