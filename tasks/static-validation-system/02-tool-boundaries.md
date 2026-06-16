# Tool Boundaries

## Ownership Table

| Tool | Owns | Does Not Own |
| --- | --- | --- |
| Biome | Formatting, changed-file generic lint, low-noise generic JS/TS rules. | Repo-specific policy semantics, lockfile reasoning, full UI naming audit. |
| ast-grep | Custom structural code rules, starting with backend HTTPException bans. | Dataflow/security analysis or repo-wide dependency reasoning. |
| Knip | Dead files, unused exports/types, dependency and binary drift. | Semantic proof that a reported symbol is safe to delete. |
| Semgrep | Security and dangerous API pattern reports. | Build/type correctness and dependency reachability. |
| Repo scripts | Token governance, UI naming, Problem Details, DB lint, payment lockfile checks. | Generic formatting and broad dead-code/security scanning. |

## DB Boundary

- `drizzle-kit check` verifies Drizzle migration history consistency.
- Custom `db:lint` still owns repo-specific migration/seed policy: `data-migrations/`, `seeds/`, global numeric prefixes, and `CONCURRENTLY` transaction headers.

## Versions Introduced

- `@biomejs/biome`: `2.5.0`
- `@ast-grep/cli`: `0.43.0`
- `knip`: `6.17.1`
- Semgrep: `1.166.0` in CI and local PDM global install.
