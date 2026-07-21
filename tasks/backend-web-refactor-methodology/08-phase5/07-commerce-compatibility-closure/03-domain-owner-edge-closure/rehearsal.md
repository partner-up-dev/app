# 5-6A.3 Rehearsal

| Situation | Intended response | Stop / fallback |
| --- | --- | --- |
| A consumed symbol reads only owner facts and has no side effect | expose it from the owner's canonical `queries` or pure `contracts` surface | if it requires a repository row or caller-specific policy, keep analysing; do not expose the row |
| A consumed symbol changes owner truth | expose an explicit command with an owner-owned input/result | if the caller is trying to write a second owner's state directly, redesign the interaction rather than export the repository |
| Trade must invoke a provider adapter owned by RideHailing | expose a narrowly typed Port or RideHailing command, preserving provider I/O outside DB locks | no generic provider facade and no transaction-held I/O |
| A legacy Rental path still imports a root | migrate only its dependency boundary; keep its 410 runtime retirement and historical read posture | do not reactivate Rental behaviour merely to make a scenario convenient |
| A fixture helper has production callers | give it a production-semantic command name and contract | do not hide a production command in a test kit |
| A fixture helper has no production callers | keep it under an owner-local test seam | do not publish it through Commands just to delete a barrel |
| Category re-export creates entity/model → use-case direction | move the DTO/type to a pure model/contracts module or retain the entity's direct pure-model import | do not accept a type-only cycle as architectural success |
| AST shows no source consumers for a root | still check system tests, package type exports, and textual/dynamic backstops before deletion | deletion remains a separate 5-6A.4 action |
