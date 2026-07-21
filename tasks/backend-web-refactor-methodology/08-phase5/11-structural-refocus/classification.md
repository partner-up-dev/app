# Work Classification

| Class | Included work | Why it belongs / does not belong in Phase 5 core |
| --- | --- | --- |
| A — structural owner convergence | `5-2` backend-authored Placement entry outcome; Bill unpaid-eligibility query; RideHailing quote contract; `5-4` Rental runtime retirement; `5-5` provider observation/Trade/Bill collaboration surfaces; `5-6A` core public-surface closure | Each removes a demonstrated deep implementation edge, duplicate authority, or a false active owner. |
| B — minimum boundary safety gate | D1 entry outcome proof; PR/Offer concurrent uniqueness; create-attempt idempotency; durable processing after unknown provider create; `5-3` attempt/provider CAS; `5-5` monotonic observation and terminal-consequence guard | These prevent a new surface from producing duplicate external effects, duplicate facts, or a state regression. They are not optional polish. |
| C — deferred product / reliability work | Rental termination/refund/booking design; D3 settlement adjustment/refund; generic provider retry, outbox, or backoff; full operator recovery UX; Admin read-composition redesign | These introduce product policy, operating process, or a new reliability capability beyond the demonstrated surface replacement. They need their own owner, decision, and proof. |
| E — external evidence | `5-7a` payment notify and CaoCao callback topology; `5-7b` Phase review | Local source and fakes cannot establish deployed/provider facts. Evidence is essential, but it is neither a source refactor nor a defect fix. |

## Consequence For Large Files

`create-order.ts` and `useCommerce.ts` are signals to inspect owner span, not independent split targets. Keep Trade's
public create-order orchestration deep; extract only the demonstrated Bill query, PR admission mechanism, RideHailing
create-attempt port, and product-local branch commands. Keep Web's existing query-adapter separation; do not split a
composable solely because it is long when pages already make zero raw Commerce RPC calls.
