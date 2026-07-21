# 5-3 Verification Log

## Passed Focused Proof

| Proof | Result | What it establishes |
| --- | --- | --- |
| `pnpm check:type:backend` | Pass | Bill, Payment, Trade, and controller cutovers remain type-correct. |
| `pnpm check:type:web` | Pass | Checkout's resume/reconciliation state composes with the inferred RPC contract. |
| `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/payment/payment-provider-ssot.scenario.test.ts` | Pass | Conflict rejection, terminal clearing, same-provider retry, stale attempt non-settlement, and current-attempt success. |
| `pnpm exec vitest run --project frontend-unit apps/web/src/domains/payment/use-cases/checkout-attempt-resume.test.ts` | Pass | Session hint scope/validation and backend-status reconciliation decisions. |
| `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/domains/bill/services/payable-bill-lines.test.ts` | Pass | Bill's local payable-window rule still accepts the structural order context. |
| `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts -t "commerce_ride_hailing_ordering_reaches_order_detail_for_active_pr"` | Pass | Bill Detail → Checkout → signed fake-WeChat callback → backend reconciliation → Bill Detail. |
| `pnpm check:lint:backend && pnpm check:lint:web` | Pass | Owner-surface and UI checks accept the cutover. |
| `git diff --check` | Pass | No whitespace errors in the task change set. |

## Import Cutover Inventory

- Payment Checkout code no longer imports `BillLineRepository`; its execution
  reads and mutations go through Bill category surfaces.
- The Payment settlement consequence no longer imports the deep Trade use case;
  it calls `trade/commands`.
- The Bill payable rule no longer imports `trade/model`; it uses a local
  structural payment-window context, while Checkout receives that fact through
  Trade's curated billing query.
- `Payment/create-refund-execution.ts` still uses `BillLineRepository`. That
  is a refund-flow compatibility edge outside this Checkout slice and remains
  for its owning termination/refund work; it is not evidence that Checkout
  continues to bypass Bill.

## Formatting Scope

All source files changed by 5-3 were formatted with `oxfmt`. The repository's
changed-file-wide `pnpm check:format` still reports unrelated pre-existing
working-tree formatting findings, so it is not claimed as a clean whole-tree
gate for this slice.
