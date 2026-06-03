# WeChatPay Provider Config Diagnosis

Date: 2026-06-03

## Objective & Hypothesis

Diagnose and fix the runtime `ERR_OSSL_UNSUPPORTED` raised while creating a
WeChatPay charge.

Hypothesis: the active WeChatPay provider instance accepted invalid execution
material, especially `merchantCertificate.privateKeyPem`, because registration
and Admin mutations only checked non-empty strings. The first user charge then
attempted to parse the bad PEM during platform certificate bootstrap and failed
with a raw OpenSSL error.

## Guardrails Touched

- Payment provider instances remain the server-side source of truth for
  WeChatPay execution material in the current MVP.
- Merchant private keys, APIv3 keys, merchant certificates, and platform
  certificates must not be logged or returned in read APIs.
- User payment requests should not expose raw crypto implementation errors.
- Admin/configuration mutations should reject invalid payment credentials at the
  boundary before they can affect runtime checkout.

## Verification

Completed:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/payment/admin-payment-provider-instance.scenario.test.ts`
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts`
- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/payment/services/wechatpay-config-validation.test.ts`
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts -t commerce_rental_ordering_reaches_confirmed_fulfillment`
- `pnpm lint:backend`
