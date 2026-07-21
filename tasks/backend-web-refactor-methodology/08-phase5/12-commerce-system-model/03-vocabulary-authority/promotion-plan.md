# Durable Promotion Plan

| Proven fact | Durable destination | Promotion condition |
| --- | --- | --- |
| Product vocabulary and D1/R0 user-visible policy | PRD glossary / workflow / rules | intended behavior and browser/backend proof agree |
| Quote, Order/Attempt, execution/observation, and final-fare/Bill-settlement contracts | `ecommerce-contracts.md` | command/query/contract source cut and focused scenarios agree |
| provider ID roles and provider observation/final fare source | `ecommerce-provider-contracts.md` | adapter/callback/query/cancel round-trip proof agrees |
| authoritative storage and non-authoritative Web cache/projected state | `system-state-and-authority.md` | C0 fact ledger and landed source owner agree |
| query-cache policy/read projections | focused Product TDD contract only if it is cross-unit durable; otherwise owner-local docs/tests | request-count and regression proof agree |

Do not use C0 alone to edit durable truth. It records a proposed model and live inconsistencies; landing source and
proof determine Current state.
