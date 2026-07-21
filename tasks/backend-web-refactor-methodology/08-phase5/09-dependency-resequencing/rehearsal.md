# Resequencing Rehearsal

| Step | Preconditions | Expected result | Abort / containment condition |
| --- | --- | --- | --- |
| `5-4` preparation | decide public mock booking boundary; seed valid Rental order/Bill | cancellation, operator decision, Bill delta, and refund behavior can be isolated from admission | a test seed is used to claim Placement/Quote coverage; stop and label it owner-local proof |
| `5-4` execution | a persisted at-most-once termination design and refund recovery boundary | no duplicate attempt, Bill line, or refund execution on repeat | a provider refund unknown outcome is silently treated as success |
| `5-5` preparation | record D3 correction identity/allocation and observation ordering | callback/poll both retain provider-detail truth with one recovery model | a callback payload is made execution truth or an existing Bill is silently overwritten |
| `5-5` execution | valid existing RideHailing order/provider binding | loss, duplicate, delayed callback, and poll converge without duplicate terminal consequence | old provider observation regresses a newer phase or compensation has no durable key |
| `5-7a` | named non-production target and safe signed-smoke authority | observed routing, body/signature handling, and negative checks are recorded separately | smoke creates a live commercial obligation or changes provider/deployment state |
| `5-2` | preceding independent slices landed; D1 remains ratified | Placement/Quote/admission implementation can use the resulting stable boundaries | 5-2 absorbs unrelated termination/reconciliation repair |
| `5-6` / `5-7b` | every named replacement and relevant external evidence complete | zero-consumer deletion and an evidence-backed Phase exit | build-only or fake-only success is used as a closure claim |
