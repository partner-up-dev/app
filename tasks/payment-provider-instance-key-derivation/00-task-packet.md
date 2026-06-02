# Payment Provider Instance Key Derivation

Date: 2026-06-02

## Objective & Hypothesis

Payment Provider Instance Admin should not ask admins to manually author the
payment provider instance key. For WeChatPay, the instance key is derived from
the stable provider identity:

```text
mch:{mchId}:app:{appId}
```

This keeps the admin workflow aligned with the Phase 4 payment design, where
`mchId + appId` is the stable provider-instance identity and credential
rotation does not change that identity.

## Guardrails Touched

- Payment provider instance identity is backend-owned.
- Admin UI may preview the derived key, but backend mutations must derive it.
- Existing provider instance `appId` and `mchId` are identity fields; admin
  edits should not silently turn one instance into another instance.
- Payment credential redaction behavior must remain unchanged.

## Verification

Completed:

- `pnpm exec vitest run --project backend-scenario apps\backend\tests\payment\admin-payment-provider-instance.scenario.test.ts`
- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm lint:backend`

Note: `pnpm --filter @partner-up-dev/frontend typecheck` is not available
because the frontend package has no `typecheck` script; frontend type checking
was covered through `vue-tsc` inside the build script.
