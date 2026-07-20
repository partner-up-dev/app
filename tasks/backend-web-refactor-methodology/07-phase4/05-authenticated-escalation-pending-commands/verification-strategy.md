# 4-4 Verification Strategy

## Low-Cost Order

1. Pure classifier and RPC reporting: recognised code only; token rotation stays unchanged; no direct OAuth import.
2. Process coordinator: fallback schedules once, command claim cancels it, duplicate claim stays single-flight.
3. Storage/dispatcher: schema migration, TTL, readiness, one matching PR, clear-before-handler, no reinsertion.
4. PR adapters: write-before-claim; waitlist bool reaches resumed gate; create remains absent.
5. One Browser-to-Backend mocked OAuth/handoff continuation journey.

## Candidate Commands

```text
pnpm exec vitest run --project frontend-unit <focused 4-4 files>
pnpm test:scenario:system -- tests/scenario/pr/<4-4-journey>.scenario.test.ts
pnpm check:type
pnpm check:lint
pnpm check:build
git diff --check
```

The actual scenario command may be narrowed only if the repository runner supports its standard project selection;
record the exact invocation and limitation in the verification log.
