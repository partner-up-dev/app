# Slice 3-4 Execution Plan

## Required Information Before Editing

1. Complete runtime/type/test inventory of `PRTypeConfigRepository` consumers.
2. Field-by-field classification: current policy, creation snapshot, presentation, Admin-only metadata.
3. Missing-config/fallback/error semantics for Discovery, Authoring and Lifecycle.
4. Transaction/executor needs and query cardinality for catalog/directory/create flows.
5. Current Admin routes/auth and 0086/0087 migration state.

## Subtasks

### 04A — Design The Neutral Public Contract

- Define stable read projections and named reads for public catalog, type detail, authoring policy and lifecycle policy.
- Avoid returning raw Drizzle rows or a universal “get config and decide yourself” object where narrower projections suffice.
- Keep persistence adapter internal to the owner.

### 04B — Migrate Read Consumers In Risk Order

1. Discovery catalog/type/read services.
2. Authoring options, preference submissions and route applications.
3. PR lifecycle policy/materialization/meeting-point/frequency/expansion consumers.
4. Admin workspace reads.

Each family gets an independent diff, targeted tests and direct-import count update.

### 04C — Clarify Mutation Ownership

- Admin HTTP/application surfaces may compose operator workspace, but PR Type Config commands own config validation/write semantics.
- Discovery/Authoring/Lifecycle cannot mutate configuration.
- Side effects, if discovered, stay in an explicit transaction/application owner rather than leaking into reads.

### 04D — Prove Snapshot Versus Current Policy

- Add tests that creation-owned defaults materialize once.
- Prove later config edits do not rewrite existing PR snapshots.
- Prove current discovery/authoring/participation policies read the latest config only when their contract says so.

## Verification

- Focused type-config, discovery, authoring and PR lifecycle units/scenarios after each consumer family.
- `rg PRTypeConfigRepository apps/backend/src/domains` trends down to owner adapter/approved Admin exceptions.
- Backend type/build/structure and targeted/full System.
- No migration diff; if schema changes appear, stop and route through the migration ledger.
- Compare catalog/directory/create query counts before/after.
