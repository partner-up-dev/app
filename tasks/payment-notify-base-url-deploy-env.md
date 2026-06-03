# Payment Notify Base URL Deploy Environment

Date: 2026-06-03

## Objective & Hypothesis

Expose `PAYMENT_NOTIFY_BASE_URL` through the backend FC deployment pipeline.

Hypothesis: WeChatPay charge creation reached notification URL generation in
runtime, but the FC function did not receive `PAYMENT_NOTIFY_BASE_URL` because
the GitHub workflow and `s.yaml` did not pass it through.

## Guardrails Touched

- Payment notifications are unauthenticated provider callbacks and require a
  public backend API origin.
- `PAYMENT_NOTIFY_BASE_URL` is non-secret deployment configuration and belongs
  in GitHub Environment variables, not secrets.
- CI should fail before deploy when required backend runtime configuration is
  missing.

## Verification

Completed:

- `bash scripts/ci/fc/validate_backend_env.sh runtime` with representative
  environment variables

Attempted:

- `npx -y @serverless-devs/s@3.1.10 verify -t apps/backend/s.yaml` reached
  template validation and failed on the pre-existing `tags` key/value casing
  schema, unrelated to `PAYMENT_NOTIFY_BASE_URL`.
