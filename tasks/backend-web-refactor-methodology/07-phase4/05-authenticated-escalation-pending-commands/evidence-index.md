# 4-4 Evidence Index

- `apps/web/src/lib/rpc.ts`: current global response handling and token rotation.
- `apps/web/src/shared/api/auth-required-policy.ts`: current classifier/redirect coupling.
- `apps/web/src/processes/wechat/auth-error.ts`: WeChat login/bind branching.
- `apps/web/src/processes/wechat/oauth-login.ts`: single-flight and delayed navigation.
- `apps/web/src/processes/wechat/pending-wechat-action.ts`: stored action schema and TTL.
- `apps/web/src/domains/pr/use-cases/usePRPendingWeChatReplay.ts`: registry/handler readiness/consumption.
- `apps/web/src/domains/pr/queries/usePRActions.ts` and `usePRPublish.ts`: existing continuation writers.
- `apps/web/src/app/AppRoot.vue`: appropriate app-level process wiring point.
- `apps/backend/src/controllers/partner-request.controller.ts`: authenticated mutation guard.
- `docs/20-product-tdd/cross-unit-contracts.md`, `pr-lifecycle-contracts.md`, and
  `docs/30-unit-tdd/wechat-oauth-handoff.md`: durable contract owners.
- [`04-escalation-journey-proof/harness-blocker.md`](./04-escalation-journey-proof/harness-blocker.md): exact
  System-harness host/cookie limitation and the non-forged lower-proof boundary.
