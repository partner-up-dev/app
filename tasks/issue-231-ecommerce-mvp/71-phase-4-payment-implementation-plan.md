# Phase 4 Payment Implementation Plan

## Purpose

Turn the Phase 4 Payment direction into an executable implementation plan.

Phase 4 integrates WeChatPay APIv3 only, while keeping the Payment domain
provider-shaped so another provider can be added later without changing Bill,
Order, or Fulfillment invariants.

## Non-Negotiable Boundaries

- PaymentTx targets exactly one BillLine.
- Payment Checkout pays exactly one current-user-owned BillLine.
- The creator cannot pay for other participants in issue 231.
- Bill owns obligation and settlement derivation.
- Payment owns external money movement and provider state convergence.
- Order / Trade owns contract flow and explicitly orchestrates downstream
  consequences after payment settlement.
- Fulfillment must not be modeled as a generic listener on Bill or Payment.
- Do not add `payment_provider_events` in Phase 4.
- WeChatPay is the only real provider in Phase 4.
- System tests must use a fake provider adapter, not real WeChat network calls.

## Target User Topology

```text
Order Detail
  -> Bill Detail
      -> Payment Checkout for BillLine A
      -> Payment Checkout for BillLine B
      -> ...
```

Order Detail remains the contract/service page. Bill Detail is the obligation
page. Payment Checkout is the provider interaction page.

For Rental:

```text
Order created
  -> Bill created with participant CHARGE BillLines
  -> each participant pays their own BillLine
  -> Bill settlement derivation says all CHARGE lines are paid
  -> Bill notifies source Order
  -> Rental Order starts Rental Fulfillment explicitly
```

For RideHailing later:

```text
Order created
  -> RideHailing Fulfillment executes
  -> final settlement input is committed
  -> Trade prices the final settlement
  -> Bill is created
  -> each participant pays their own BillLine
```

RideHailing proves why "Bill paid starts Fulfillment" cannot be a generic rule.

## Backend Data Model Slice

Add `payment_txs`.

Recommended fields:

```ts
type PaymentProviderType = "WECHAT_PAY";
type PaymentTxType = "CHARGE" | "REFUND";

type PaymentTxStatus =
  | "INITIATED"
  | "ACTION_REQUIRED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CLOSED";

type PaymentTx = {
  id: string;
  bill_line_id: string;
  type: PaymentTxType;
  provider_instance_id: string;
  client_id?: string | null;
  status: PaymentTxStatus;
  amount_fen: number;
  currency: "CNY";
  requested_by: string;
  merchant_order_no?: string | null;
  merchant_refund_no?: string | null;
  provider_prepay_id?: string | null;
  provider_transaction_id?: string | null;
  provider_refund_id?: string | null;
  provider_status?: string | null;
  client_action?: unknown | null;
  provider_snapshot?: unknown | null;
  failure_code?: string | null;
  failure_message?: string | null;
  expires_at?: string | null;
  succeeded_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
};
```

Add `payment_provider_instances`.

Recommended fields:

```ts
type PaymentProviderInstance = {
  id: string;
  provider_type: PaymentProviderType;
  instance_key: string;
  status: "ACTIVE" | "DISABLED";
  display_name: string;
  client_id: string;
  config: unknown;
  created_at: string;
  updated_at: string;
};
```

For WeChatPay, `instance_key` should be unique on `mchid + appid`. This is the
stable provider-instance identity; certificate serials and keys can rotate
without changing the instance identity.

Each provider instance belongs to exactly one runtime `client_id`. The current
`apps/frontend` client id is `web`. If a future client surface needs a different
WeChat appid/mchid/API mode, register a separate provider instance for that
client instead of adding a binding table.

`config` is the Phase 4 source of truth for provider execution material. This
is a deliberate serverless MVP compromise, not the durable ideal. For
WeChatPay:

```ts
type WeChatPayProviderInstanceConfig = {
  adapterMode: "WECHAT_PAY_API_V3";
  appId: string;
  mchId: string;
  chargeMode: "JSAPI" | "H5";
  apiV3Key: string;
  merchantCertificate: {
    serialNo: string;
    privateKeyPem: string;
    certificatePem?: string | null;
  };
  platformCertificates?: Array<{
    serialNo: string;
    certificatePem: string;
    effectiveTime?: string | null;
    expireTime?: string | null;
  }> | null;
};
```

When `platformCertificates` is null or empty, runtime code downloads WeChatPay
platform certificates with the merchant credential, persists the refreshed
instance config, and then verifies notifications with the persisted certificate
set. Merchant private keys, APIv3 keys, and platform certificates are never
returned by normal read APIs.

`client_id` means the runtime client surface, not the end user.

- `web`
- `wechat_miniapp`
- `mobile_h5_web`
- `android`
- `ios`

The recommended admin/configuration behavior is a single registration command:

```text
RegisterPaymentProviderInstance(
  provider_type,
  client_id,
  instance_config
)
```

That command creates or reuses the provider instance and declares the owning
client id in the same operation. This avoids a half-configured provider
instance that no client can route to.

For Phase 4, this should be a backend script/config command rather than a broad
Payment Admin UI. Payment Admin remains deferred.

Indexes and constraints:

- primary key on `id`
- index on `bill_line_id`
- index on `provider_instance_id`
- unique index on `(provider_type, instance_key)` for provider instances
- unique partial index on active `payment_provider_instances.client_id`
- unique index on `(provider_instance_id, merchant_order_no)` where not null
- unique index on `(provider_instance_id, merchant_refund_no)` where not null
- index on `(status, updated_at)` for pending reconciliation
- index on `bill_lines.refund_of_bill_line_id` for refund-to-charge-line
  traceability

Do not use a DB constraint alone to express "only one active payment per
BillLine". Keep that as service logic so retry behavior can remain explicit:

- if BillLine is already settled, reject new charge payment
- if there is an active non-terminal charge PaymentTx, reuse it
- if the latest attempt is terminal failed/closed, allow a new attempt
- if there is already a successful charge PaymentTx covering the line amount,
  reject duplicate payment

Refund preparation:

- Phase 4 should set `BillLine.refundOfBillLineId` for refund lines when
  possible.
- Refund PaymentTx targets the refund BillLine.
- The refund flow uses `refundOfBillLineId` to find the successful original
  charge PaymentTx required by the provider refund API.
- PaymentTx does not also store refund-to-charge linkage. BillLine owns that
  relation as the SSoT.
- If a legacy refund line lacks `refundOfBillLineId`, reject provider refund
  creation and leave it for manual remediation.

## Payment Provider Port

Keep provider logic behind a Payment-domain port.

```ts
type CreateChargePrepayInput = {
  providerInstanceId: string;
  merchantOrderNo: string;
  amountFen: number;
  currency: "CNY";
  description: string;
  payerOpenId: string;
  notifyUrl: string;
  expiresAt: Date;
};

type ChargePrepayResult = {
  providerPrepayId: string;
  providerStatus: string;
  clientAction: unknown;
  providerSnapshot: unknown;
};

type PaymentProviderPort = {
  createChargePrepay(input: CreateChargePrepayInput): Promise<ChargePrepayResult>;
  queryCharge(input: QueryChargeInput): Promise<NormalizedChargeStatus>;
  createRefund(input: CreateRefundInput): Promise<NormalizedRefundStatus>;
  queryRefund(input: QueryRefundInput): Promise<NormalizedRefundStatus>;
  parseChargeNotification(input: RawProviderNotification): Promise<NormalizedChargeStatus>;
  parseRefundNotification(input: RawProviderNotification): Promise<NormalizedRefundStatus>;
};
```

The application layer consumes only normalized provider results:

- `PENDING`
- `SUCCEEDED`
- `FAILED`
- `CLOSED`

Provider-specific payloads stay inside adapter snapshots and should not leak
into Bill or Order models.

## Client Routing Slice

Provider selection happens before the provider adapter is called:

```text
client_id
  -> active payment_provider_instances.client_id
  -> provider adapter method
```

Rules:

- frontend passes `client_id` through the RPC-layer `x-client-id` header; query
  and mutation payloads must not carry it
- backend validates `client_id` against server-owned active provider instances
- `client_id` selects provider instance only
- `client_id` never selects amount, BillLine, payer, or order truth
- PaymentTx freezes `client_id` and `provider_instance_id`
- if no active provider instance exists for the client, checkout should fail
  with a configuration error
- the DB must allow at most one active provider instance per client id

Example provider-instance registrations:

| client_id | provider_type | instance key | WeChat API |
| --- | --- | --- | --- |
| `web` | `WECHAT_PAY` | `mchid:appid(official account)` | provider config `chargeMode=JSAPI` |
| `mobile_h5_web` | `WECHAT_PAY` | `mchid:appid(web/h5)` | provider config `chargeMode=H5` |

This keeps WeChat API mode out of Bill, Order, and PaymentTx. Payment Checkout
routes by provider instance; JSAPI/H5 are provider-instance execution
configuration, not first-class commerce channels. Native QR is explicitly out of
Phase 4 scope.

## Secret And Credential Configuration Slice

Provider instances are business/runtime configuration and, for this serverless
MVP, also carry the WeChatPay execution credential material. The preferred
security posture would be an external secret manager or
encrypted-at-application-boundary storage, but Phase 4 makes an explicit
simplicity tradeoff:

- store WeChatPay merchant private key PEM and APIv3 key directly in
  `payment_provider_instances.config`
- store WeChatPay platform certificates in the same config row after explicit
  registration or runtime certificate refresh
- do not add a separate SecretResolver in Phase 4
- rely on DB encryption-at-rest, strict database access control, and application
  redaction discipline
- treat DB read access as payment-signing authority
- frontend never receives provider credential material
- logs must never include credential values

Recommended Phase 4 source of truth:

- use config-driven registration
- an operator/deploy script reads a typed config file or env-backed config
- the script idempotently upserts `payment_provider_instances`
- application runtime reads provider-instance config when calling the provider
  adapter
- if `platformCertificates` is absent, runtime downloads WeChatPay platform
  certificates and persists the refreshed config before verifying callbacks

This is a deliberate MVP compromise, not a durable ideal. The accepted risk is:

- a database compromise can expose payment signing and callback decryption
  material
- database backups now carry payment credential material
- production database access must be limited and audited accordingly
- every API/read model/admin response must redact credential fields

Do not mutate DB automatically on every app boot in Phase 4. Prefer an explicit
registration command such as:

```text
pnpm --filter @partner-up-dev/backend payment:register-provider ./secure/payment-provider.wechat-pay.json
```

The command should be idempotent and safe to re-run during deploy.

Credential handling rules:

- never commit real merchant private keys, APIv3 keys, or platform certificates
  into the repository
- never include credential values in application logs, problem details,
  telemetry, PaymentTx snapshots, or provider snapshots
- registration command output must print only ids/fingerprints, never raw
  credential values
- normal read APIs must not return credential fields
- if an admin/config read API is added later, it must return only masked
  summaries and fingerprints
- tests and system scenarios must use fake credentials only

Example registration payload:

```json
{
  "providerType": "WECHAT_PAY",
  "instanceKey": "mch:1900000001:app:wx123",
  "displayName": "WeChat Official Account Pay",
  "clientId": "web",
  "config": {
    "adapterMode": "WECHAT_PAY_API_V3",
    "appId": "wx123",
    "mchId": "1900000001",
    "chargeMode": "JSAPI",
    "apiV3Key": "32-byte-api-v3-key",
    "merchantCertificate": {
      "serialNo": "7777777777777777777777777777777777777777",
      "privateKeyPem": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----",
      "certificatePem": "-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----"
    },
    "platformCertificates": null
  }
}
```

Callback URL rule:

- include `providerInstanceId` in the notify URL path as a selector
- fixed charge callback path is
  `/api/payment/wechat-pay/:providerInstanceId/notify/charge`
- fixed refund callback path is
  `/api/payment/wechat-pay/:providerInstanceId/notify/refund`
- treat it only as a routing hint, not as trust proof
- still verify WeChat signature before trusting the body
- after decrypting/normalizing, resolve PaymentTx by
  `provider_instance_id + merchant_order_no` or
  `provider_instance_id + merchant_refund_no`

Credential rotation rule:

- update the provider instance config through the registration command when the
  merchant credential changes
- PaymentTx freezes `providerInstanceId`, not a separate credential id
- pending PaymentTx rows continue to resolve through the same provider instance
- platform certificate refresh is safe to do at runtime because platform
  certificates verify WeChatPay callbacks and are not frontend-visible

Risk of persisting raw secrets:

The preferred answer is still not to persist raw secrets. Phase 4 intentionally
chooses the simpler serverless path and accepts the increased blast radius. The
implementation must make that risk explicit in comments, migration review, and
deployment notes.

## WeChatPay Adapter Slice

Implement `WeChatPayProviderAdapter`.

The adapter should wrap a mature WeChatPay APIv3 library where practical. Do
not hand-roll request signing, callback signature verification, resource
  decryption, or provider-specific request shapes unless a library gap is proven
and isolated behind tests.

Library selection rules:

- must support APIv3 request signing
- must support callback signature verification and AES-GCM resource decryption
- must support JSAPI / Mini Program, H5, query, close, refund, and
  refund query or expose enough primitives to cover them safely
- must accept in-memory private key / APIv3 key material, because serverless
  credentials are loaded from DB rows rather than file paths
- must be wrapped behind `PaymentProviderPort`; no library types should leak
  into Bill, Order, Fulfillment, or frontend contracts
- must be pinned exactly in `package.json` / lockfile, not added with a loose
  latest range

Initial candidates to spike:

- `wechatpay-axios-plugin`
  - broader and more actively published than many alternatives
  - depends on `axios`
  - only acceptable if axios is pinned/overridden to a known clean version and
    lockfile checks reject known malicious versions
- `wechatpay-node-v3` / `wxpay-v3`
  - avoid axios, but appear less actively maintained
  - acceptable only if they cover callback verification/decryption and can work
    with in-memory key material

Current repo note:

- the existing codebase does not currently depend on axios
- adding axios only as a transitive SDK dependency should be treated as a
  deliberate supply-chain decision
- if the selected SDK uses axios, add a root `pnpm.overrides` pin and CI check
  that rejects:
  - `axios@1.14.1`
  - `axios@0.30.4`
  - unexpected `plain-crypto-js` in the resolved dependency tree
- current npm registry check on 2026-05-30 showed axios latest as `1.16.1`;
  use an exact reviewed version at implementation time, not a caret range

Required capabilities:

- APIv3 request signing.
- provider-instance-specific prepay creation.
- frontend invocation payload signing.
- payment order query.
- payment close.
- refund creation.
- refund query.
- payment notification signature verification.
- notification resource decryption.
- normalized status mapping.

Runtime configuration:

- `WECHAT_PAY_ENABLED`
- `PAYMENT_NOTIFY_BASE_URL`
- provider-instance config stores `appId`, `mchId`, `chargeMode`, `apiV3Key`,
  `merchantCertificate`, and optional `platformCertificates`

Payer identity rule:

- JSAPI / Mini Program payer openid must match the selected provider instance
  appid.
- Current repo already stores official-account `users.openId`.
- Phase 4 should require a bound WeChat openid before
  `web` checkout when `web` is mapped to a WeChat JSAPI provider instance.
- If the selected provider instance appid differs from the appid that produced
  stored openids, checkout must fail clearly instead of attempting payment.
- Mini Program payment may need a different appid/openid record. If the repo
  does not yet store miniapp openids, `wechat_miniapp` should remain
  configured-disabled.

WeChat channel correction:

- WeChat-internal webpage / Official Account and Mini Program payments both use
  JSAPI-style prepay and `prepay_id`.
- ordinary browser H5 payment should use WeChat H5/MWEB flow and `h5_url`.
- Native QR payment is not in Phase 4 and must not be added unless a real
  product surface needs it.

Local and scenario testing:

- Add a fake provider adapter selected by test/runtime config.
- Fake adapter returns deterministic `clientAction` and supports explicit
  callback/query success transitions.
- Browser scenarios must not depend on public WeChat callbacks.

## Backend Application Services

### Bill Detail

`GetBillDetailService`

- Input: `billId`, `viewerUserId`.
- Authorize viewer through BillLine ownership or source Order participation.
- Return Bill, BillLines, per-line settlement derivation, current user's
  actionable lines, and source Order summary.
- Include only display-safe PaymentTx summaries.

`GetBillByOrderService`

- Input: `orderId`, `viewerUserId`.
- Resolve the current Bill for an Order and return the Bill Detail projection
  or a redirect-safe bill id.

### Payment Checkout

`GetPaymentCheckoutService`

- Input: `billLineId`, `viewerUserId`.
- Verify BillLine belongs to viewer.
- Verify Bill is active.
- Verify line is payable:
  - `CHARGE` line
  - amount not already settled
  - source Order still allows payment
- Return authoritative checkout basis and any active PaymentTx.

`CreateOrReuseProviderChargeService`

- Input: `billLineId`, `viewerUserId`, `clientId`.
- Verify the same checkout constraints.
- Resolve provider instance from `clientId`.
- Resolve payer identity required by the selected provider instance / charge
  mode.
- Reuse active non-terminal PaymentTx when present.
- Otherwise create PaymentTx with stable merchant order number.
- Call selected provider adapter.
- Store provider prepay/payment id and frontend `clientAction`.
- Return PaymentTx checkout projection.

`SyncPaymentTxService`

- Input: `paymentTxId`, `viewerUserId`.
- Authorize through target BillLine ownership or source Order access.
- If terminal, return current state.
- Query provider for pending charge/refund tx.
- Apply normalized provider status idempotently.
- If a CHARGE tx succeeds, call payment-settlement consequence service.

`HandleWeChatPayChargeNotificationService`

- Input: raw headers/body from unauthenticated provider callback route.
- Verify signature and decrypt notification.
- Resolve PaymentTx by merchant order number.
- Apply status idempotently.
- If a CHARGE tx succeeds, call the same payment-settlement consequence
  service used by `SyncPaymentTxService`.
- Return provider-required success response only after local convergence
  succeeds or safely no-ops.

### Settlement Consequence

`ApplyPaymentSettlementConsequenceService` and `ApplyBillSettlementToOrder`

- Input: successful PaymentTx id.
- Payment convergence loads the successful PaymentTx and asks Bill to re-derive
  whether the source Bill is fully settled.
- Bill settlement then notifies the source Order through Trade.
- Order/Trade decides family-specific consequences:
  - if source Order is Rental and all charge lines are settled, call
    `StartRentalFulfillmentAfterPrepaidBillSettledService`
  - create Rental Fulfillment only if absent
  - do not mark RideHailing Fulfillment from payment success

This preserves the topology: Payment converges money movement, Bill derives
obligation settlement, Order owns contract consequences, and Fulfillment does
not passively listen to payment.

### Refund

`CreateRefundPaymentTxForRefundLineService`

- Input: refund BillLine id.
- Verify `BillLine.kind = REFUND`.
- Resolve original successful charge PaymentTx through
  `BillLine.refundOfBillLineId`.
- Create or reuse refund PaymentTx.
- Call WeChat refund API.
- Store normalized refund status and provider snapshot.

`SyncRefundPaymentTxService`

- Query provider refund state and idempotently converge local PaymentTx status.

Triggering refund:

- When Rental cancellation creates refund BillLines, Trade/application service
  should enqueue or directly invoke refund PaymentTx creation for eligible
  lines.
- Bill Detail should display refund progress, but user checkout should not be
  required for refunds.

## HTTP API Slice

Authenticated user APIs:

- `GET /api/commerce/orders/:orderId/bill`
  - resolves source Order's current Bill for navigation
- `GET /api/commerce/bills/:billId`
  - Bill Detail projection
- `GET /api/commerce/bill-lines/:billLineId/checkout`
  - Payment Checkout projection
- `POST /api/commerce/bill-lines/:billLineId/charges`
  - create or reuse current-user charge PaymentTx using `x-client-id`
- `GET /api/commerce/payments/:paymentTxId`
  - read PaymentTx projection
- `POST /api/commerce/payments/:paymentTxId/sync`
  - query provider for pending state and apply idempotently

Unauthenticated provider callback APIs:

- `POST /api/payment/wechat-pay/:providerInstanceId/notify/charge`
- `POST /api/payment/wechat-pay/:providerInstanceId/notify/refund`

Callback routes must not use user auth middleware. They must verify WeChat
signature before trusting body contents.

## Frontend Slice

### Order Detail

Replace the Phase 3 mock payment button with:

- Bill summary
- link to Bill Detail
- payment state derived from Bill Detail projection where needed
- no provider checkout logic

### Bill Detail Page

Route:

- `/bills/:billId`

Displays:

- source order summary
- Bill status and effective total
- participant BillLines
- each line's settlement status
- current user's payable charge line CTA
- refund line progress
- back links to Order Detail

Actions:

- pay current user's unpaid charge line
- no pay button for other participants
- no creator-pay-all affordance

### Payment Checkout Page

Route:

- `/bill-lines/:billLineId/checkout`

Displays:

- one BillLine basis
- source order summary
- amount
- current PaymentTx state
- WeChat-only payment action
- non-WeChat-browser guidance

Flow:

1. Load checkout projection.
2. User taps pay.
3. Frontend RPC layer sends `x-client-id: web`.
4. Create/reuse provider-backed PaymentTx for that client id.
5. Invoke the client action returned by backend:
   - `WeixinJSBridge` for Official Account web
   - redirect/open provider URL for H5-like flows
   - fake provider action for deterministic scenarios
6. Regardless of frontend callback result, poll/sync PaymentTx.
7. On terminal success/failure/closed, show result and return links.

Frontend must treat backend PaymentTx state as authoritative. The
`WeixinJSBridge` callback is only a hint to start syncing.

## System Scenario Slice

Update the Rental browser scenario from fake single-button payment to
BillLine-scoped payment.

Required black-box path:

1. Creator creates Rental order from READY PR.
2. Creator lands on Order Detail and opens Bill Detail.
3. Bill Detail shows two participant charge BillLines.
4. Creator can pay only creator's own line.
5. Creator completes fake WeChatPay checkout.
6. Bill Detail still shows Bill not fully paid because another participant line
   is unpaid.
7. Joiner opens the same PR, follows existing-order target to Order Detail,
   opens Bill Detail, and pays joiner's own line.
8. After both lines are paid, Order Detail shows Rental Fulfillment waiting for
   booking confirmation.
9. Fake operator confirmation completes the reservation path.

Cancellation/refund scenario:

1. Create and fully pay Rental order with two participant lines.
2. Creator requests cancellation.
3. Cancellation creates refund BillLines with `refundOfBillLineId`.
4. Refund PaymentTx is created through fake WeChatPay refund adapter.
5. Bill Detail shows refund progress and then refunded status.

Backend scenario tests:

- duplicated payment callback converges once
- query success followed by callback success is idempotent
- callback success followed by query success is idempotent
- current user cannot create PaymentTx for another user's BillLine
- successful payment does not mutate BillLine amount
- Rental Fulfillment is created once after all charge lines settle
- partial Bill settlement does not start Rental Fulfillment
- refund line requires original successful charge PaymentTx

Unit tests:

- PaymentTx state machine terminal transitions
- Bill settlement derivation from PaymentTx rows
- client id routing to provider instance
- WeChat adapter request signing shape through fake clock/nonce inputs
- WeChat notification parser with fixture headers/body
- refund source-line lookup behavior

## Implementation Order

1. Add PaymentTx entity, migration, repository, and domain model tests.
2. Add Bill settlement derivation service that consumes successful PaymentTx
   summaries.
3. Add Bill Detail backend projection and frontend page.
4. Add Payment Checkout backend projection and frontend page.
5. Add PaymentProviderInstance, PaymentProviderPort, fake adapter, and WeChat
   adapter skeleton behind configuration.
6. Implement WeChat charge prepay for the first enabled client/provider and
   checkout polling/sync.
7. Implement callback route and idempotent charge convergence.
8. Add explicit payment-settlement consequence orchestration for Rental
   Fulfillment start.
9. Replace Phase 3 mock payment UI and update Rental browser scenario to
   multi-participant BillLine payment.
10. Implement refund PaymentTx for refund BillLines created by cancellation.
11. Add refund callback/query convergence and refund browser/backend coverage.
12. Remove or quarantine obsolete mock payment endpoints from user-facing flow.

## Exit Criteria

- Order Detail no longer contains the mock payment action.
- Bill Detail exists and is reachable from Order Detail.
- Payment Checkout exists and is scoped to one BillLine.
- A participant can pay only their own BillLine.
- The first enabled WeChatPay client/provider instance works behind provider
  port.
- Provider instance registry can route a client id to a
  WeChat provider instance.
- Provider instance config stores the WeChatPay private key, APIv3 key, and
  platform certificates directly in DB as a deliberate serverless MVP
  compromise.
- Credential values are redacted from all normal reads, logs, problem details,
  PaymentTx snapshots, and provider snapshots.
- WeChatPay SDK dependency is selected through a spike and pinned exactly; if
  axios is pulled in, known malicious versions are blocked by overrides/CI.
- Fake provider enables deterministic system scenarios.
- Payment callback and query paths are both idempotent.
- Rental Fulfillment starts exactly once after all prepaid charge lines are
  settled.
- Paid Rental cancellation creates refund PaymentTx records and converges
  refund state.
- Backend typecheck, frontend typecheck, backend lint, payment unit tests, and
  updated Rental system scenario pass.

## Global Phase 4 Review

Current design satisfies the main Phase 4 requirements:

- WeChatPay is the only real provider, but provider type and provider instance
  stay explicit for future providers and future client surfaces.
- Payment targets BillLine, not Bill or Order.
- Each participant pays their own line; creator paying for other participants
  is intentionally out of scope.
- Bill owns obligation and settlement derivation.
- Payment owns provider money movement and callback/query convergence.
- Trade/application service explicitly applies payment consequences; Fulfillment
  is not a passive payment listener.
- Rental prepaid and RideHailing usage-paid timing stay different.
- Bill Detail and Payment Checkout are explicit pages instead of hiding
  BillLine-scoped payment inside Order Detail.
- Provider-event history table is intentionally deferred.
- Credential storage is simplified for serverless by storing raw WeChatPay
  credential material in provider-instance config, with explicit redaction and
  blast-radius guardrails.
- A mature WeChatPay SDK should be used behind the adapter; axios is accepted
  only with exact pinning and supply-chain checks.

Implementation can start with these confirmed decisions:

- First production `client_id` is `web`, because the current `apps/frontend`
  runtime client surface is `web`. It maps to a WeChat provider instance; that
  instance decides its API execution through `chargeMode=JSAPI` because the
  current repo already stores official-account `users.openId`.
  `mobile_h5_web` can be configured later as a separate client surface with
  `chargeMode=H5`.
- WeChatPay SDK choice is `wechatpay-axios-plugin@0.9.6`.
  It supports in-memory PEM/key material, JSAPI/H5/query/refund API
  surface, signing helpers, and APIv3 AES-GCM decrypt helpers. Because it uses
  axios, backend pins direct `axios@1.16.1`, root `pnpm.overrides` forces the
  same version transitively, and `pnpm lint:payment-supply-chain` rejects known
  compromised axios versions and unexpected `plain-crypto-js`.
- Merchant order number / refund number format.
  Must be generated server-side, unique within provider instance, and stable
  for retries. It should include environment/app prefix plus PaymentTx id or a
  compact unique suffix.
- Payment expiration behavior.
  Align WeChat prepay expiration with the order unpaid window where possible.
  Expired provider orders should move PaymentTx to `CLOSED` and allow a new
  attempt if the BillLine remains payable.
- Callback failure behavior.
  If provider callback verification succeeds but local convergence fails, return
  provider failure so WeChat retries. Browser polling/query sync must be able to
  recover the same PaymentTx state later.
- Refund trigger timing.
  Current recommendation is direct application-service invocation after refund
  BillLines are created, with idempotent retry through sync/query. Do not add a
  payment job queue unless direct invocation proves unreliable.
- Credential read surface.
  No normal API should return raw credential values. Registration can write raw
  values; readback should only show masked fingerprints.

These are implementation details, not new domain abstractions. Phase 4
implementation has started with PaymentTx/BillLine checkout, Bill Detail,
Payment Checkout, fake WeChatPay scenario adapter, and a WeChatPay APIv3 adapter
behind `PaymentProviderPort`.

## Implementation Progress

Implemented on 2026-05-30:

- Added Payment provider instance and BillLine-scoped PaymentTx persistence.
- Added explicit provider registration script:
  `pnpm --filter @partner-up-dev/backend payment:register-provider <config.json>`.
- Added `PaymentProviderPort` with fake WeChatPay and WeChatPay APIv3 adapters.
- Added charge creation/query, payment notification parsing, refund creation,
  refund query, and refund notification parsing behind the adapter boundary.
- Added unauthenticated WeChat callback routes for payment and refund
  notifications.
- Added Bill Detail and Payment Checkout backend projections/APIs.
- Added Bill Detail and Payment Checkout frontend pages.
- Added `x-client-id` as an RPC-layer frontend header; checkout mutations do
  not carry client id in JSON payloads.
- Payment Checkout invokes backend-returned client actions:
  WeChat bridge through `WeixinJSBridge`, redirect URL for H5-like flows, and
  fake provider action through scenario-only sync.
- Removed user-facing mock payment from Order Detail; payment now flows through
  Bill Detail and Payment Checkout.
- Added explicit settlement consequence topology: successful CHARGE PaymentTx
  asks Bill to re-derive settlement; Bill notifies Order/Trade; Order starts
  Rental Fulfillment only after all charge BillLines settle.
- Rental cancellation now creates refund BillLines with `refundOfBillLineId` and
  directly creates refund PaymentTx records for eligible successful original
  charges.
- Paid Rental cancellation updates Rental Fulfillment to cancelled when a
  fulfillment record already exists.
- Added supply-chain guard:
  `pnpm lint:payment-supply-chain` pins axios to `1.16.1` and rejects known
  compromised axios versions plus unexpected `plain-crypto-js`.
- Extended the Rental system scenario to cover BillLine-scoped payment,
  partial/full settlement, fulfillment start after all lines are paid, unpaid
  cancellation, and paid cancellation with successful fake refund PaymentTx.
- Removed WeChatPay Native from Phase 4, removed PaymentTx channel entirely,
  modeled money direction as `PaymentTx.type`, and moved JSAPI/H5 to WeChat
  provider `chargeMode` plus backend-returned client actions.
- Corrected settlement consequence topology: Bill settlement notifies Order;
  Order/Trade starts Rental Fulfillment.
- Corrected the final Payment SSoT topology: removed
  `PaymentClientProviderBinding`, moved `clientId` onto
  `PaymentProviderInstance`, removed the old active credential pointer, removed
  PaymentTx `billId` and source-payment links, and made BillLine
  `refundOfBillLineId` the single refund-to-charge-line relation.
- Corrected WeChatPay credential topology: removed the separate credential
  table; `PaymentProviderInstance.config` now stores `apiV3Key`,
  `merchantCertificate`, and optional `platformCertificates`. Runtime code
  downloads and persists platform certificates when they are absent.

Verification completed on 2026-05-30:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend exec vue-tsc --noEmit`
- `pnpm test:unit:backend`
- `pnpm test:unit:frontend`
- `pnpm --filter @partner-up-dev/backend db:lint`
- `pnpm lint`
- `pnpm lint:payment-supply-chain`
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`

## Explicit Deferred Work

- Payment Admin.
- Creator pays for all participants.
- Non-WeChatPay payment providers.
- Payment provider event history table.
- Merchant settlement, deposits, and provider payout accounting.
- Enabling extra client/provider instances beyond the first production client.
- Offline/manual payment.
