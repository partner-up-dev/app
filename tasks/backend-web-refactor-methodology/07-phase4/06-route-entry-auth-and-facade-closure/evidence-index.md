# 4-5 Evidence Index

- `apps/web/src/app/create-app.ts`: app bootstrap registers the route guard before first navigation.
- `apps/web/src/app/router.ts` and `apps/web/src/types/router-meta.d.ts`: declarative route policy.
- `apps/web/src/processes/wechat/route-wechat-auto-login.ts`: reusable route-entry decision and guard.
- `apps/web/src/processes/wechat/oauth-login.ts`, `oauth-handoff.ts`, and `WeChatOAuthHandoffGate.vue`: shared
  navigation/handoff invariants.
- `apps/web/src/pages/CommerceBillsPage.vue`, `apps/web/src/domains/commerce/queries/useCommerce.ts`, and
  `apps/backend/src/controllers/commerce.controller.ts`: protected viewer-bill read.
- `apps/backend/src/services/WeChatAuthSessionService.ts` and `WeChatLoginService.ts`: facade candidates.
- `apps/backend/package.json`, `apps/backend/tsup.config.ts`, `apps/backend/src/index.ts`, CI, and FC config:
  local runtime/entrypoint consumer boundary.
- `docs/10-prd/behavior/rules-and-invariants.md`, `docs/30-unit-tdd/wechat-oauth-handoff.md`, and
  `apps/web/src/ARCHITECTURE.md`: durable owners.
