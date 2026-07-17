# Slice 05 Mental Rehearsal

## Subtask Preflight Matrix

| Subtask | Information to have in hand | Main fork / surprise | Cheapest sufficient proof |
| --- | --- | --- | --- |
| 05A curate surface | symbol/importer map + canonical behavior tests | old symbol has no narrow canonical owner | per-symbol mapping; postpone instead of widening the barrel |
| 05B migrate consumers | runtime/type/test/integration family classification | adapter payload or mocks depend on legacy path | family-level type/unit/scenario + import delta |
| 05C observe facade | dynamic/external consumer evidence + removal owner/window | static zero hides a script or package consumer | compatibility delegate + explicit sunset evidence |
| 05D remove | zero-consumer proof + full gates + restoration patch | barrel/type export still keeps reachability | small deletion diff, dead-code/import report and immediate alias rollback |

## Branches And Decisions

- **Old symbol has no canonical equivalent:** understand its owner; add a narrow adapter or postpone it. Do not
  move the entire compatibility service into the public surface.
- **Moving files creates barrel cycles:** lower pure contracts/models to a stable owner and keep index exports curated.
- **LLM/WeCom/share expects legacy payloads:** preserve mapping at that integration boundary.
- **Static grep is zero but dynamic import/external consumer is possible:** retain facade and add contract/runtime
  evidence through a defined compatibility window.
- **Tests break because mock paths moved:** update tests per consumer batch; never mass-cast or duplicate types.

## Likely Surprises

- `pr/services/index.ts` currently re-exports many low-level `pr-core` rules.
- Type-only package exports can keep files reachable even after runtime consumers move.
- Source/test kits may intentionally import internals; test language needs an owner-specific transition.

## Rollback / Forward-fix

- Each consumer can return to the alias independently.
- A mistakenly removed facade can be restored as a thin delegate without data/API rollback.
- If canonical surface grows too broad, keep the compatibility export longer and redesign the consumer contract.

## Stop Conditions

Behavior/API/schema drift, unresolved external consumer, product-contract conflict, or a new cycle that cannot be
removed without expanding the slice.
