# 5-6A.3.4 Rehearsal

| Event / branch | Intended behaviour | Abort condition |
| --- | --- | --- |
| Provider detail is unavailable | no transaction has started; sync reports the existing provider-detail failure | any lock or persisted mutation before the failed external call |
| A concurrent callback changes binding after the pre-read | Port re-checks instance/order ids under Trade → Ride locks and rejects stale observation | trust the pre-read binding or apply it to a replacement binding |
| Provider observation regresses an active phase or arrives after terminal state | Port returns the lock-held effective phase; sync uses it for geometry/fare decisions | sync derives terminality from the stale read or raw observation alone |
| Terminal fare is not yet available | provider I/O ends; no final fare/Bill is invented | use cancel-fee preview, listing price, or a synthetic zero fare |
| First final fare is present | Port persists `finalSettlementInput` then materialises exactly one Bill under the same short transaction | provider I/O or a generic retry loop is held in the transaction |
| Later provider fare disagrees | Port returns `correctionRequired`; persisted Bill history is unchanged | silently rewrite the final fare or create adjustment/refund before D3 |
| Trade cancellation needs pre-sync | Trade uses a narrow RideHailing synchronization Port; it does not import a RideHailing root barrel or private use case | export sync through a broad commands barrel and form a runtime cycle |
