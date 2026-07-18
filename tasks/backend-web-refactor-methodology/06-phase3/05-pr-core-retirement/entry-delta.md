# Slice 3-5 Entry Delta

## Controlled Entry

- Base commit: `690f52b0` (`3-4` exit). Its `pr-core` policy-import changes are committed incoming state and must
  be preserved while canonical PR implementation ownership moves.
- User-owned unrelated paths remain excluded: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and the
  untracked `tasks/oxc-toolchain-migration/`, `tasks/project-node-runtime/`, and
  `tasks/quality-gate-orchestration/` directories.
- No PRD, HTTP route, schema, migration, provider/OAuth choreography, CF-01, or CF-02 behavior is in this
  slice's mutation scope.

## Runtime Inventory

- `domains/pr` currently delegates to `pr-core` through its model, read-model, message, sharing and broad
  `services/index.ts` compatibility paths; this is the main source of the canonical-to-compatibility SCC.
- Runtime non-PR consumers include controllers, Admin PR management, Authoring/Discovery, Notification, Trade,
  LLM, WeCom and `PartnerRequestService`. Test/mock imports are separate migration evidence and are not proof of
  runtime ownership.
- `PartnerRequestService` remains used by Share, LLM and WeCom. Its retention/removal condition must be explicit;
  static grep cannot prove external package or deployment consumers absent.
- WeCom's natural-language creation currently passes a null identity. That conflicts with CF-01's decided
  authenticated-only persistence policy and is deliberately left untouched until `3-7`.

## Characterization Before Mutation

| Family | Existing behavior proof | First low-cost proof after a cutover |
| --- | --- | --- |
| PR lifecycle/create/join/waitlist | Backend PR scenario suites | exact affected scenario + `check:type:backend` |
| PR read/message/share | detail/share unit and PR scenarios | focused read/message unit or controller smoke |
| Trade order attachment | Commerce/ride-hailing scenarios | affected commerce scenario + import delta |
| LLM/WeCom/Share facades | controller/facade smoke where present | signature delegate test or controller smoke |
| import direction | architecture-fitness baseline | no new canonical `pr → pr-core`, no new private edge |

## Chosen Execution Shape

`05A` creates a curated canonical PR public surface and per-symbol mapping. `05B` moves runtime consumers in
families, never by raw directory move. `05C` records the thin facade compatibility window. `05D` deletes only
after independent zero-consumer evidence. Each subtask owns a folder and can be stopped without reverting another.
