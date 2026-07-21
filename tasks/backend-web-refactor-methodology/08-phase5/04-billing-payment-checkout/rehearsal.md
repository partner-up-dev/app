# 5-3 Rehearsal

| Branch | Authority | Expected result |
| --- | --- | --- |
| select provider with no execution slot | Payment | create/resume one provider execution for BillLine |
| already-bound unfinished provider | BillLine slot + Payment query | reject a different provider; resume/query the bound one |
| payment client reports success | provider query/callback then Bill | reconcile; client return alone does not settle |
| client closed/failed/unknown | Payment client UX, then provider/Bill reconciliation | explicit retryable state; no false settlement |
| callback and polling race | Payment consequence + BillLine settlement | one idempotent settlement consequence |
| provider reference constraints differ from route reference | canonical tuple | two documented projections, not two attempts |

If a return state has no user-visible product rule after D2, stop before UI implementation.
