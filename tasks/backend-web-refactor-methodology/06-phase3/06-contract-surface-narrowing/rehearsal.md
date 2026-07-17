# Slice 3-6 Mental Rehearsal

## Subtask Preflight Matrix

| Subtask | Information to have in hand | Main fork / surprise | Cheapest sufficient proof |
| --- | --- | --- | --- |
| 06A types-only surface | all Backend imports + package exports/build behavior | stable value type is actually an internal row | explicit export review + Backend/Web type/build |
| 06B inferred aliases | handwritten shapes + adapter inference points | Hono inference creates a cycle or leaks client mechanics | adapter-local inferred alias tests; temporary type-only facade |
| 06C migrate batches | domain-family import graph + target gates | Admin/Commerce composite is not stable enough | one family at a time; consumer count/typecheck/System delta |

## Branches And Decisions

- **Hono inference requires the root client type:** keep it inside the adapter and export an inferred alias; do not
  expose the client or invent a manual response.
- **A Web UI genuinely needs a stable value object:** export it from the types-only contract surface, not an entity row.
- **Contract alias creates a type cycle:** retain a temporary type-only re-export and migrate the lower-level owner first.
- **Backend response changes during migration:** treat it as a cross-unit contract change and update both units/tests,
  not as a casting problem.
- **A separate contracts package looks attractive:** defer until a second independent client or measured build
  bottleneck proves the additional package authority is worth its cost.

## Likely Surprises

- Static graphs may count type-only edges as runtime edges.
- Admin and Commerce may rely on broad composite types that are not stable contracts.
- Package `exports` changes can affect editors/typecheck even when runtime output is unchanged.
- Callback/BI compatibility code may still need direct typed route access.

## Rollback / Forward-fix

- Restore type-only root exports or compatibility aliases without changing runtime/API.
- Migrate domain families independently; do not require a repository-wide atomic type cutover.
- If the subpath proves shallow or unstable, retain `AppType` isolation and postpone the value-type move.
