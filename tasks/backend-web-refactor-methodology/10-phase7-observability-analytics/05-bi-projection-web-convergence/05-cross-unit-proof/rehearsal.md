# `7-4E` Rehearsal

1. Reuse the scenario-managed database/server lifecycle; do not start ad-hoc
   duplicate dev services.
2. Use a unique journey/session and fixed interaction so unrelated telemetry
   cannot satisfy the assertions.
3. Poll a semantic persistence condition with a bounded timeout rather than
   sleeping.
4. Assert the accepted ledger first, then the fact row, then API/UI behavior;
   this localizes collection, projection and rendering failures.
5. Assert SPM on the fact's nearest route context.
6. Do not add a source panel merely to make the end-to-end test visually
   complete.
7. Navigate all three Analytics routes once to catch stale route imports and
   unintended eager queries.
8. Run scoped reference searches before expensive full gates.
9. Promote only stable authority/owner rules to durable docs; keep migration
   names and test run results task-local.

If the browser event cannot be made deterministic without changing product
behavior, use an existing stable Discovery interaction and assert its current
semantics. Do not add a test-only product branch.
