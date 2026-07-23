# Official CaoCao Fee-Confirmation Contract Review

Reviewed on 2026-07-23 from CaoCao Open Platform's public first-party
documentation. This supersedes the repository fake/OpenAPI fixture as the
contract source for `6-4`.

## Established Facts

- [`2.12 确认费用`](https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/2.12confirmFee.html)
  defines `POST /v2/common/feeConfirm`.
- `order_id` is required. `allowance_amount` and `cao_allowance_amount` are
  optional amounts in fen. The current product has no subsidy decision, so the
  narrow current request omits both fields; it does not invent zero values or
  add local allowance ownership.
- The
  [`FAQ`](https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/1.9FAQ.html)
  states that fee confirmation is called only after CaoCao settlement while the
  order is status `5` (waiting for payment).
- The
  [order status/event reference](https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/1.5orderProperties.html)
  identifies status `5` as waiting for payment and status `7` as paid/waiting
  for evaluation.
- [`queryOrderDetailV2`](https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/2.9queryOrderDetail.html)
  exposes the current order status and payment time. It is available for
  diagnosis/reconciliation but is not required as an extra happy-path fetch.
- The
  [general error-code table](https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/1.6errorCode.html)
  lists `411` as a repeated-order call. The public documentation does not make
  a fee-confirm-specific idempotency or lost-response retry guarantee.

## Decision Consequences

Sir explicitly accepts the risk of invoking an already-applied provider effect
again after a lost response. Therefore the missing fee-confirm-specific
idempotency guarantee is recorded, but it is not an implementation gate.

The target adapter sends `order_id` only. A transient handler failure may use
the generic Job retry policy. No RideHailing `UNKNOWN` state, confirmation
generation, operator reconciliation workflow, or provider-effect receipt is
introduced for this risk.

The public docs are sufficient for request shape and order-state preconditions.
No production database, FC log, jump function, or live customer-order mutation
is needed to establish these semantics.
