# 4-5 Verification Strategy

## Low-Cost Order

1. Pure route guard: anonymous WeChat eligibility starts exactly one login after bootstrap and aborts the eligible
   navigation; authenticated, non-WeChat, pending-handoff, concurrent, and superseded-navigation cases do not widen
   behavior.
2. App bootstrap: registration proof confirms the process is installed once before the router begins navigation.
3. Full Web unit suite catches route and component regressions.
4. Facade inventory plus Backend type/build proves safe local deletion if eligible.
5. Root lint/type/build/diff hygiene follows source mutation.

## Candidate Commands

```text
pnpm exec vitest run --project frontend-unit apps/web/src/processes/wechat/route-wechat-auto-login.test.ts
pnpm test:unit:web
pnpm check:type
pnpm check:lint
pnpm check:build
git diff --check
```

The Browser-to-Backend callback journey is not reclassified here: the 4-4 canonical-host limitation remains its
honest environment boundary.

The initial focused suite omitted the superseded-navigation case and therefore cannot close Phase 4 by itself. The
completion-review candidate repair adds it as the first required proof.
