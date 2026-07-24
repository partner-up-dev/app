# AGENTS.md for Controllers

- Responsibility: define routes, validate input (`Zod` / `@hono/zod-validator`), call domain use-cases or controlled compatibility facades, and return JSON.
- Controllers only own HTTP and protocol conversion. They do not own domain rules.
- New business actions should call `src/domains/*/use-cases/*` first instead of turning controllers back into a service-centric entrypoint.
- Hono RPC constraints:
  - use Hono instances through `.route()` or fluent composition
  - declare request input types explicitly so the frontend can infer stable types
  - export a fully built Hono instance from the controller file, usually named `route` or `app`
- Before changing WeChat OAuth callback, state cookie, or handoff cookie behavior in `wechat.controller.ts`, read `docs/30-unit-tdd/wechat-oauth-handoff.md`; access tokens must not be moved into route query/hash or callback redirects.
- [Canonical File](./payment-provider.controller.ts)
