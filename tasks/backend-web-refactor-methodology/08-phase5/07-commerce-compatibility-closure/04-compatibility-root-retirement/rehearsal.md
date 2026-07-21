# Rehearsal — Compatibility-Root Retirement

## Expected Sequence

```text
consumer imports category entrypoint
    -> owner implementation

no consumer imports legacy root index
    -> delete only legacy index files
    -> type/build proves no unresolved module path
```

## Branches And Stops

| Observation | Interpretation | Action |
| --- | --- | --- |
| A consumer resolves to a legacy root | The surface is still live. | Keep that root; move the consumer through a named category only if its behavior is in scope. |
| `tsc` or build reports an unresolved root after deletion | The structural scan missed a static reachability path. | Restore the affected root assessment; locate and classify the consumer before retrying. |
| Focused behavior scenario fails with no module error | Deletion exposed accidental execution coupling. | Stop; preserve the behavioral failure for its owner slice rather than restoring a wildcard API blindly. |

## Low-Cost Proof

The deletion itself is five files. Import-resolution plus type/build catches
module reachability; three already-owned focused scenarios cover the
CreateOrderAttempt, callback/final-Bill, and Order Detail paths without adding
a new product fixture.
