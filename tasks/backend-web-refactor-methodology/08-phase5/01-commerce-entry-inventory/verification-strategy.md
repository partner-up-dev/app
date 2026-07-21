# Entry Inventory Verification Strategy

| Candidate observation | Cheapest evidence | Escalation only if needed |
| --- | --- | --- |
| Owner/public-surface drift | curated-entrypoint and import-family inventory | dependency graph report with positive/negative fixtures |
| Contract/source mismatch | one durable clause traced to controller, domain command/query, and Web adapter | focused unit test or scenario read before proposing a repair |
| User journey coverage | existing Commerce System scenarios and their helpers | one targeted browser run after a slice is authorised |
| Persistence/transaction behavior | existing Backend unit or backend scenario evidence | isolated scenario with real database only for a proposed mutation |
| Provider/callback/runtime dependency | current adapter/config inspection and durable provider contract | explicit external-evidence subtask; never infer it from local code |

No full-repository gate is required merely to complete a read-only inventory. Each future executable slice must name
its focused proof first, then add the narrowest appropriate type/build/scenario gates.
