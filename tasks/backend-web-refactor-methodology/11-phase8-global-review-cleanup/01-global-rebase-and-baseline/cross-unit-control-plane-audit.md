# `8-0` Cross-unit And Control-plane Audit

## Cross-unit Contract Gap At `8-0`

`apps/backend/src/contracts.ts` correctly uses explicit type-only exports, but
its sources violate the stronger durable owner rule:

- three export groups come from `src/entities/*`;
- `ImageUploadPurpose` comes from an image-storage service; and
- active telemetry types come from the telemetry Registry implementation.

The durable architecture explicitly forbids entity rows, services,
infrastructure aliases and persistence-derived convenience types on
`@partner-up-dev/backend/contracts`. Some exported values are pure Zod-derived
types colocated with tables rather than Drizzle rows, but the colocated
implementation file still owns both meanings. This is an active source/target
gap, not a wording defect.

The package subpath has 44 Web/System consumer files. A later migration should
preserve its public symbol names while moving their definitions to the
Feedback, PR, Storage and Telemetry owners. This keeps fan-out stable while
removing implementation-derived authority.

Execution annotation on 2026-07-23: `8-2` completed that migration without
changing the package subpath or its 21 exported symbol names. The recursive
facade guard now rejects entity, repository, service, adapter and Registry
implementation dependencies. See
[`../03-contract-owner-convergence/verification-log.md`](../03-contract-owner-convergence/verification-log.md).

## Historical And External Evidence Drift

| Conflict | Current truth | Disposition |
| --- | --- | --- |
| a Phase 4 completion packet still says commit pending | Git and root roadmap prove the Phase 4 commits | preserve historical packet context; reconcile current indexes only |
| Phase 7 entry evidence describes a durable SLS conflict | current durable observability truth was corrected by Phase 7 | mark the old evidence as historical; do not revive SLS work |
| Phase 5 `5-7a` expects edge-log correlation | Phase 7 removed pseudo-observability and the callback router now emits no log | redesign external proof around operator edge/network capture plus signed Backend receipt |
| Phase 4 rollout/provider topology | source cannot prove deployed origin, callback authority or provider console state | remain external evidence |
| `dispatchBinding` durable/source mismatch | historical `8-0` observation; `8-5` traced current writers/readers and confirmed source/storage/durable agreement | closed without source, schema or durable mutation; commit `171319de` owns the earlier promotion |
| `notification_deliveries` remains in source/schema | intentional inert compatibility audit | future professional-O11y/data-retention task; exclude Phase 8 |

No console/structured logger should be reintroduced to make the old `5-7a`
procedure executable.

## Migration Provenance

The custom migration runner owns checksums in `app_migrations`, and the current
SQL series reaches `0096`. Drizzle's `_journal.json` contains only historical
entries `0000` and `0008`, while CI runs `db:generate` and fails on generated
artifact drift.

`8-0` did not run the mutating generator. Journal/provenance consistency is an
independent controlled verification candidate; it is not evidence of a
production database mismatch and must not absorb the separate local `0088`
application incident.

## Report-first Gates

Both canonical report-first commands exit zero:

| Command | Result | Interpretation |
| --- | --- | --- |
| `pnpm check:dead-code` | 37 unused files, 1 unused dependency, 3 unused devDependency groups, 2 unlisted dependencies, 3 unlisted binary groups, 130 unused exports, 113 unused exported types, 3 duplicate exports | inventory only; Uno config noise is also present |
| `pnpm check:security` | no Semgrep finding | no security cleanup slice inferred |

Knip corroborates that `canonical.controller.ts` and the two Web compatibility
re-export roots are unused, but the complete report is not broad deletion
authorization.

The pnpm project-level auth-setting warning and the protected Node/Oxc/quality
gate task packets belong to independent toolchain/configuration work.

## Explicit Phase 8 Exclusions

- provider-console, deployed-origin and signed-callback external proof;
- professional program observability;
- `notification_deliveries` retention/retirement;
- Rental product/data reclamation and final-fare product policy;
- unmeasured Viewer Bill 1+N or Admin read optimization;
- broad dead-code or barrel deletion;
- migration generation or database mutation; and
- protected root Node/pnpm/Oxc/quality-gate work.
