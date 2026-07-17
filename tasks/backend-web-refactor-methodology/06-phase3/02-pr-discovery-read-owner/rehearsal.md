# Slice 02 Mental Rehearsal

## Subtask Preflight Matrix

| Subtask | Information to have in hand | Main fork / surprise | Cheapest sufficient proof |
| --- | --- | --- | --- |
| 02A characterize | router/query/watch/`defineExpose` flow + durable precedence | undocumented watcher or timeout owns behavior | focused workflow/component characterization |
| 02B one workflow | query lifetimes, keys, props/events and design contracts | shared owner duplicates requests or becomes a query bag | one route instance + narrow VM contract test |
| 02C remove duplicate | exact read-hook and command-path call sites | read state is coupled to create/auth state | focused diff proves commands untouched; hook owners count to one |
| 02D verify/measure | gate entrypoints + request baseline | pre-existing timing/noise looks like regression | Web gates + targeted/full System + before/after request observation |

## Expected Sequence

```text
Router query
  -> one PR Discovery read workflow
  -> catalog/type/view/directory query adapters
  -> plain read view model + actions
  -> Page shell and Panel presentation
```

Candidate/create/auth continues through the current Panel command path and ordinary PR create command.

## Branches And Decisions

- **Workflow interface becomes a bag of query objects:** map to a cohesive view model; do not leak cache mechanics.
- **Interface becomes too wide:** first consolidate catalog/type detail and route/view state, leaving directory as an
  explicit follow-up inside the same packet; do not create multiple competing workflows.
- **Sharing query lifetime causes duplicate requests:** retain the old adapter temporarily and characterize query
  key/enabled timing before choosing a different ownership mechanism.
- **URL semantics need to change:** stop and update the PR Discovery durable contract before implementation.
- **A change reaches create/auth replay:** revert that part; route to CF-01/OAuth planning rather than expanding scope.

## Likely Surprises

- Child `defineExpose` currently supplies mode/error/page placement to the Page.
- Watchers can produce route replace loops or stale selection after type change.
- Catalog randomization must occur once per received catalog, not per render/consumer.
- Failed scoped pages must still escape to the unscoped catalog.
- Design package props/slots may be involved indirectly; load the design-web skill before changing component
  composition, and preserve existing package components rather than adding wrappers.

## Rollback / Forward-fix

- Restore Page/Panel hook ownership while retaining characterization tests.
- Keep a compatibility adapter if only part of the read model can migrate safely.
- No Backend/DB rollback exists; any API drift is a stop condition, not something to compensate in Web.
