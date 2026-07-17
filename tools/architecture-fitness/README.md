# Architecture Fitness Reporter

This is a deterministic, report-first import-boundary probe for the Backend and Web production source trees. It
uses the TypeScript AST for imports/exports and raw RPC property access, including Vue script blocks. It does not
replace semantic architecture review and is intentionally independent of the root package/lint gate.

```bash
node tools/architecture-fitness/cli.mjs --format text
node tools/architecture-fitness/cli.mjs --format json
node tools/architecture-fitness/cli.mjs \
  --baseline tasks/backend-web-refactor-methodology/06-phase3/01-baseline-and-fitness/architecture-fitness-baseline.json \
  --check-new
node --test tools/architecture-fitness/architecture-fitness.test.mjs
```

The default report exits zero even when findings exist. `--check-new` is an opt-in future gate: it exits one only
for fingerprints not present in a reviewed baseline. The baseline stays task-local because finding inventory and
migration state are volatile; durable docs own the rules and exception protocol.

The parser resolves relative imports and Web `@/` aliases. Package imports stay outside this first slice. Every
report includes a content-based scope digest, sorted findings and unresolved in-scope import inventory; it contains
no timestamp or absolute path, so two runs over the same tree are byte-identical.

For Backend domain imports, the reporter treats only a domain root `index.ts` or an explicitly category-named
root entrypoint (`commands.ts`, `queries.ts`, `contracts.ts`, `events.ts`, or `ports.ts`) as public. A nested
`services/`, `use-cases/`, `model/`, repository, or entity path remains private.
