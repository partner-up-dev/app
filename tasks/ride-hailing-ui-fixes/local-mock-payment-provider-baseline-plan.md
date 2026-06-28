# Local Mock Payment Provider Baseline Plan

## Objective

- make local payment checkout usable without manual Admin payment-provider
  setup
- keep the local payment-provider baseline stable across process restarts
- establish a development-only baseline that supports iterative Payment
  Checkout UI work

## Classification

- Primary route: `Constraint`
- Active mode: `Execute`

## Confirmed Truth

- current local checkout provider lookup resolves by active client id:
  - `payment-checkout.ts` uses `findActiveByClientId(input.clientId)`
  - current frontend/client path already has a stable client id: `web`
- current fake WeChatPay fixture is process-ephemeral:
  - `packages/fake-wechatpay-server/src/fixtures.ts` generates a fresh merchant
    key pair per boot
  - a seeded provider instance would drift after every fake-provider restart
    unless the fixture becomes stable first
- current local WeChat ability mocking already provides a stable dev openid
  fallback:
  - `WECHAT_ABILITY_MOCKING_ENABLED=true`
  - `WECHAT_ABILITY_MOCK_OPEN_ID`, defaulting to `dev-mock-openid`
- current scenario and current intended runtime path already use `JSAPI`
  charge mode
- development-only baseline data belongs in:
  `apps/backend/data-migrations/`
- development-only data migrations must be:
  - forward-only
  - stable local baseline only
  - environment-gated with `-- migration: environments=development`
- development-only fake-provider baseline must not use:
  - `apps/backend/drizzle/`
  - per-run scenario fixtures
  - production or real credentials

## Segment Scope

- included:
  - stable fake WeChatPay fixture source for local runtime
  - development-only provider-instance seed for client `web`
  - packet and verification updates
- excluded:
  - Payment Checkout page IA or route migration
  - backend payment contract redesign
  - scenario-specific temporary provider registration cleanup

## Proposed Address And Object

- `packages/fake-wechatpay-server/`
  - introduce a stable local fake fixture source
- `apps/backend/data-migrations/`
  - add a development-only SQL migration that seeds one active
    `WECHAT_PAY` provider instance for client `web`
- possibly `docs/40-deployment/environments.md`
  - if local baseline workflow needs a new durable note
- task packet logs
  - record the segment result and verification

## State Diff

- From:
  local payment checkout requires manual provider setup or scenario-only
  registration, and any database-seeded provider credentials would drift across
  fake-provider restarts.
- To:
  local development has a stable fake WeChatPay fixture and a development-only
  seeded active provider instance for client `web`, so checkout can resolve a
  provider out of the box.

## Blast Radius Forecast

- fake WeChatPay local runtime behavior
- local development database baseline
- payment provider instance uniqueness for active client `web`
- possible local manual checkout workflow
- scenario tests should remain unaffected if they keep registering their own
  isolated provider setup

## Invariants Check

- do not change production or staging provider behavior
- do not put environment-gated logic into schema migrations
- do not introduce real credentials into repo history
- keep `clientId = web` active-provider resolution semantics intact
- do not break current scenario provider registration paths
- keep the default recommendation aligned with the existing mainline payment
  path: `JSAPI`

## Design / Ownership Decisions

- preferred local baseline charge mode:
  - `JSAPI`
- preferred stable fake fixture strategy:
  - repo-committed fake-only fixture data
- preferred provider seed ownership:
  - development-only SQL data migration
- frontend route ownership is out of scope for this segment

## Resolved Decisions

- stable fake fixture should be stored as a committed asset inside the
  fake-provider package
- development-only provider seed should rely on runtime platform-certificate
  refresh, not pre-populate platform certificates

## Confirmed Implementation Direction

- keep `chargeMode = JSAPI`
- store stable fake-only credentials inside the fake-provider package, not in
  environment variables
- let the development-only provider seed omit platform certificates initially
  and rely on runtime refresh against the local fake provider

## Verification Plan

- static / type checks on changed backend and fake-provider files
- `pnpm db:migrate:dev`
- local fake WeChatPay server boot sanity
- local backend can resolve an active payment provider instance for client
  `web`
- if implementation touches durable docs, include a doc consistency read-back

## Implementation Steps

1. Introduce a stable fake WeChatPay fixture source that survives local
   process restarts.
2. Ensure the local fake-provider runtime reads that stable fixture by default.
3. Add a new development-only SQL data migration under
   `apps/backend/data-migrations/` that seeds one active `WECHAT_PAY` provider
   instance for `clientId = web`.
4. Keep the seeded config aligned with local fake-provider routing:
   - fake app id
   - fake mch id
   - fake apiV3 key
   - fake merchant certificate
   - local endpoint base url
   - `chargeMode = JSAPI`
5. Verify the migration can be applied through `pnpm db:migrate:dev`.
6. Verify the local checkout path can resolve an active provider for client
   `web` without manual admin setup.
7. Record implementation result and verification result in the task packet.

## Segment Start Preconditions

- explicit user start signal has been received: `开始`
- if implementation reveals that runtime platform-certificate refresh cannot
  work against the seeded fake setup, pause and update this plan before
  broadening the change

## Implementation Result

- added committed stable fake fixture asset:
  `packages/fake-wechatpay-server/src/fixtures/stable-dev-fixture.json`
- changed `packages/fake-wechatpay-server/src/fixtures.ts` to load and parse
  that committed asset instead of generating a fresh RSA key pair per process
  start
- added development-only data migration:
  `apps/backend/data-migrations/0081_dev_mock_payment_provider_baseline.sql`
- the new migration seeds one active `WECHAT_PAY` provider baseline for:
  - `clientId = web`
  - `instanceKey = dev-fake-wechatpay-web`
  - `chargeMode = JSAPI`
  - `endpointBaseUrl = https://wechatpay.partner-up.localhost`
- the new migration intentionally leaves `platformCertificates` as JSON `null`
  so runtime refresh remains the first source of truth
- the new migration disables other active `payment_provider_instances` rows for
  client `web` before activating the baseline row, so the active-client unique
  constraint stays deterministic for local development

## Verification Result

- passed:
  - `pnpm --filter @partner-up-dev/fake-wechatpay-server typecheck`
  - `pnpm --filter @partner-up-dev/fake-wechatpay-server test`
  - `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
  - `pnpm --dir apps/backend db:lint`
  - `git diff --check`
- current local database caveat:
  - `pnpm --dir apps/backend db:migrate:dev` against the existing local
    database failed before reaching `0081`
  - the failure is a pre-existing local-history issue at
    `drizzle/0061_user_telemetry_v2.sql`:
    `relation "user_telemetry_events_family_occurred_at_idx" already exists`
- isolated migration proof:
  - created a temporary verification database
  - ran `pnpm --dir apps/backend db:migrate:dev` against that temporary
    database successfully
  - confirmed the seeded row shape after migration:
    - `provider_type = WECHAT_PAY`
    - `instance_key = dev-fake-wechatpay-web`
    - `status = ACTIVE`
    - `client_id = web`
    - `chargeMode = JSAPI`
    - `endpointBaseUrl = https://wechatpay.partner-up.localhost`
    - `platformCertificates = null`
  - dropped the temporary verification database after validation
