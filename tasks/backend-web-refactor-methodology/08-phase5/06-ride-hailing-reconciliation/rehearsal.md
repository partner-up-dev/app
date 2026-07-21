# 5-5 Rehearsal

| Failure or race | Required behavior |
| --- | --- |
| lost callback, later Order Detail poll | poll triggers the same safe provider reconciliation |
| duplicate/delayed callback | no phase regression or duplicate Bill consequence |
| callback provider-detail query fails | no callback-payload state mutation; observable retry policy applies |
| terminal provider phase without authoritative final amount | retain no-final-bill state and await a later natural sync |
| terminal non-zero cancellation settlement | same final-settlement/bill model, never preview reuse |
| later correction after final Bill | preserve an explicit correction-needed seam/state; never silently rewrite settled history or invent adjustment/refund behavior here |

Before implementation, state which writes share a transaction and which are retried independently.
