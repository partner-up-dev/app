# `8-2` Implementation Rehearsal

## Critical Forks

- **A type is pure but colocated with a table:** move the value schema/type to
  the semantic owner and import it from the entity; do not duplicate it.
- **A type is inferred from active Registry literals:** expose a type-only
  owner projection while Registry remains the runtime SSoT.
- **A consumer needs a persistence-only detail:** do not promote it; either
  keep that consumer on HTTP inference or define an independent semantic
  contract with an owner.
- **Moving Zod schemas creates a cycle:** place the schema in the owner
  `contracts` category and make entity/use-case code depend on it; do not add a
  new aggregate barrel.
- **TypeScript accepts a structurally similar duplicate:** reject it unless
  compile-time equality and one runtime validation owner are proven.

## Edit Batches

1. Feedback and PR contracts;
2. Storage and Telemetry contracts;
3. package facade and structural guard;
4. cross-unit verification.
