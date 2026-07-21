# 5-6A.3.2 Rehearsal

| Situation | Expected behavior | Failure / containment |
| --- | --- | --- |
| provider create rejects | Trade can identify the owner contract and retain the existing ordering failure path | no blanket `unknown` handling or retry is introduced |
| provider accepts but create response is lost | durable `PROCESSING`, no blind create retry | existing CreateOrderAttempt scenario remains green |
| user previews/cancels while callback races | Trade invokes Ride sync command, then maintains Trade→Ride lock order for cancellation completion | concurrent cancellation scenario catches duplicate effect/regression |
| browser polls a bound active Ride | browser calls explicit reconcile; Detail stays local | web reconciliation test catches a provider call from Detail |
| port factory changes category only | endpoint/config/adapter selection remains byte-for-byte behaviorally equivalent | fake CaoCao callback/create scenarios catch adapter contract drift |
