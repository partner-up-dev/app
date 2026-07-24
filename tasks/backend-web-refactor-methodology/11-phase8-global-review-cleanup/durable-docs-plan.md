# Phase 8 Durable Docs Plan

## Status Through `8-5`

No durable document changes were made in the read-only baseline.

`8-1`–`8-3` demonstrated that the existing durable owner/dependency rules were
sufficient and did not require new architecture wording. `8-4` promoted the
stable User/OAuth and Notification reconciliation ownership into:

- `docs/20-product-tdd/cross-unit-contracts.md`;
- `docs/20-product-tdd/notification-contracts.md`; and
- `docs/30-unit-tdd/wechat-oauth-handoff.md`.

`8-5` confirmed that current source already matches the durable
`dispatchBinding` owner promoted by `171319de`; graph counts and import
mechanics remain task-local evidence, so no Commerce durable-doc change was
made.

## Promotion Matrix

The table records the completed disposition through `8-5` and the promotion
boundary for proposed slices:

| Slice | Durable candidate | Must remain task-local |
| --- | --- | --- |
| `8-1` | none; existing public-Port and private-edge rules were sufficient | finding counts and canonical fixture mechanics |
| `8-2` | none; existing package-contract owner rule was sufficient | consumer count and file-move ledger |
| `8-3` | none; existing adapter/model ownership guidance was sufficient | SCC/LOC/import counts |
| `8-4` | completed User/OAuth identity and Notification reconciliation ownership promotion | per-controller migration progress |
| `8-5` | none; existing Commerce and `dispatchBinding` authority wording already matched source | graph counts, query measurements and hypotheses |
| `8-6` | stable compatibility removal/current contract state; external proof requirements in deployment truth only after observation | Knip inventory and historical task status |
| `8-7` | final current unit topology and focused Unit/Product/Deployment truth | final scorecard counts |

`architecture-objectives-and-decision-rules.md` changes only if the generative
objective function or decision procedure changes. The current `8-0` evidence
does not require such a change: it demonstrates the existing rules detecting a
real contract-owner disagreement.

Phase 8 must not promote a temporary current count, external hostname, task
status or proposed cleanup mechanism as durable architecture.
