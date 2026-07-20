# 4-5 Route-Entry Auth And Facade Closure

## Status

Execute was authorized by Sir on 2026-07-19. Local implementation, focused proof, facade closure, and durable
promotion are complete. Sir confirmed the product promise: an anonymous visitor who enters `/bills` in WeChat starts
OAuth at route entry. The later [Phase-completion review](../07-completion-review/00-task-packet.md) repaired and
verified the stale-navigation guard defect plus the active-OAuth `openid` boundary defect; its facade-closure evidence
remains valid. This packet owns the declared-route restoration and bounded legacy-facade audit; it does not reopen
4-3.4 provider/callback topology or 4-4 command continuation semantics.

## Objective

Restore route-entry WeChat OAuth through one app-level router-entry process, with a route declaring its opt-in via
`wechatAutoLoginPolicy: "route"`. The process must run before the opted-in route component can mount, so a protected
first read cannot race ahead of the declared route-entry login. It must make reuse cheap for later eligible routes
without duplicating OAuth logic in pages. Resolve the legacy Backend WeChat facades only when repository and
runtime-entry evidence makes deletion safe.

## Non-Negotiable Invariants

- `/bills` retains anonymous browsing outside WeChat, but an anonymous WeChat visitor begins OAuth before its
  protected viewer-bill read becomes the primary interaction.
- One router-entry process, registered once before normal router navigation, owns bootstrap wait, handoff deferral,
  environment detection, attempted-route continuity, and use of the existing OAuth single flight. Pages and domain
  queries do not call route-entry OAuth.
- A route opts in explicitly with `wechatAutoLoginPolicy: "route"`; `skip` and absent policy are not broadened from
  remembered behavior or backend auth requirements alone.
- Route auto-login defers while a handoff nonce is pending and waits for public auth bootstrap. It does not change
  return-target, cookie, nonce, callback, or provider configuration.
- A route guard superseded while it awaits bootstrap must not write attempted-route state or initiate OAuth. The
  completion review establishes this with a router `beforeEach` epoch plus post-bootstrap check.
- Legacy facade deletion requires zero in-repository source/script/entrypoint consumers and no public package export.
  Unknown external operational use is recorded rather than guessed.

## Scope And Ownership

| Subtask | Owns | Does not own |
| --- | --- | --- |
| 4-5.1 Route-entry process | router guard registration before app navigation, reusable guard, focused process proof | page-local OAuth, new route opt-ins beyond declared `/bills` |
| 4-5.2 Product and route proof | `/bills` promise, route-meta evidence, focused behavioral proof | provider/cross-origin production claim |
| 4-5.3 Facade closure | local consumer/entrypoint audit and deletion or retained-exception record | unobserved external deployment changes |
| 4-5.4 Promotion and closure | compact PRD/TDD/architecture truth, packet exit, Phase 4 handoff | Phase 5 Commerce refactor |

## Protected State

Do not edit, stage, or claim the independent root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, or
`tasks/oxc-toolchain-migration/`, `tasks/project-node-runtime/`, and `tasks/quality-gate-orchestration/` work.

## Packet Index

- [Entry evidence](./01-entry-evidence.md)
- [Decision record](./02-decision-record.md)
- [Subtask map](./03-subtask-map.md)
- [Execution plan](./execution-plan.md)
- [Mental rehearsal](./rehearsal.md)
- [Verification strategy](./verification-strategy.md)
- [Durable-document plan](./durable-docs-plan.md)
- [Evidence index](./evidence-index.md)
- [Verification log](./verification-log.md)
- [Exit evidence](./exit-evidence.md)
