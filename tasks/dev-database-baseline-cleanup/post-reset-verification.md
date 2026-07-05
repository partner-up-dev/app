# Post-Reset Verification

Captured after `pnpm db:reset:dev` on 2026-07-05.

## Command Result

- `pnpm db:lint`: passed
- `pnpm db:reset:dev`: passed
- Development migration ledger includes:
  - `data:0077_dev_ride_hailing_caocao_fixture.sql`
  - `data:0081_dev_mock_payment_provider_baseline.sql`
- Seeds applied:
  - `seeds/0001_anchor_event_bootstrap.sql`
  - `seeds/0002_admin_user_bootstrap.sql`

## Counts

- Anchor Events: 4
- POIs: 6
- Anchor Event preference tags: 5
- Product SPUs: 2
- Product SKUs: 3
- Offers: 0
- Placements: 0
- Payment provider instances: 1
- Ride-hailing provider instances: 1
- Users: 2
- Public support config keys: 5

## Baseline Records

Anchor Events:

- `羽毛球` / `BADMINTON`
- `学习冲刺` / `STUDY_SPRINT`
- `泰捣蛋试吃会` / `TAIDAODAN_FOOD_TRIAL`
- `拼车搭子` / `RIDE_HAILING`

POIs:

- `广外南体育馆羽毛球场1号场`
- `广外南体育馆羽毛球场2号场`
- `广外南校羽毛球馆`
- `图书馆自习区A桌`
- `图书馆自习区B`
- `广外南一饭泰捣蛋`

Catalog:

- `系统曹操出行`
  - `快车`, vehicle type code `3`
  - `专车`, vehicle type code `5`
- `广外南体育馆羽毛球场`
  - `普通羽毛球场1小时`, fixed total `1000` fen

Providers:

- Payment: `微信支付`, `mch:1900000001:app:wx_partnerup_local_web`,
  `https://wechatpay.partner-up.localhost`
- Ride-hailing: `系统曹操`, `caocao-openapi-primary`,
  `https://caocao.partner-up.localhost`

Seed accounts:

- `运营管理员`: `service`, `analytics`
- `数据分析员`: `analytics`

## Review Notes

- The reset baseline leaves `offers` and `placements` empty, so operator/manual
  configuration can start from catalog records.
- `0077` no longer creates the old active ride button placement or the
  unreferenced ride offer.
- The reset baseline contains no scenario-owned POIs or rejected POIs.
