# Browser A exit evidence

Date: 2026-07-18

Implementation evidence:

- One injected `usePRCreateAuthGate` is used by structured, full-page NL, inline NL, and Discovery create owners.
- Anonymous commands await auth bootstrap, open the shared disclosure, and return before either create mutation.
- Disclosure copy states login requirement, browser-memory loss boundary, no server save, and cancel preservation;
  confirm/cancel/root IDs are stable. Confirm is the only OAuth entry point and no create replay/payload is retained.
- Structured server Save Draft affordance and stale draft copy are removed.
- Create commands now have a single Create path: structured creation no longer auto-publishes a DRAFT response, and
  NL/inline results always use the authenticated `?entry=create` route. The obsolete `CreateSubmissionMode` seam is
  removed; edit-time draft publishing remains outside this create boundary.
- `PR_DISCOVERY_CREATE` is removed from pending action storage and Discovery replay; Join/Waitlist/Exit/Confirm/
  Publish variants remain.

Validation:

```text
pnpm exec vitest run --project frontend-unit \
  apps/web/src/domains/pr/use-cases/usePRCreateAuthGate.test.ts \
  apps/web/src/processes/wechat/pending-wechat-action.test.ts \
  apps/web/src/processes/wechat/oauth-login.test.ts \
  apps/web/src/shared/api/auth-required-policy.test.ts \
  apps/web/src/domains/pr/ui/PRDiscoveryPanel.test.ts
=> 5 files, 9 tests passed

pnpm check:type:web
=> passed

pnpm check:lint:web
=> passed; naming audit reported two existing RideHailing*Content findings

pnpm check:build:web
=> passed (vue-tsc + Vite; 895 modules transformed)

timeout 70s pnpm exec vitest run --project system-scenario \
  tests/scenario/pr/pr-create.scenario.test.ts \
  -t 'pr_create_form_requires_authentication_before_create' --reporter=verbose
=> passed (1 targeted test; 2 file tests skipped)
```

The targeted scenario includes a 250 ms observation window after disclosure visibility and proves Browser A
disclosure/zero create POST/cancel state retention. Full cross-unit proof and authenticated end-to-end matrix remain
a 07E responsibility.
