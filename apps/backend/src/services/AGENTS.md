# AGENTS.md for `src/services`

This directory is not the default home for new domain business logic.

## Role

- `src/services/` currently exists for legacy facades and integration-oriented services that have not yet been moved into domain or infra owners.
- New domain lifecycle behavior should usually go to `src/domains/*/use-cases/*` or `src/domains/*/services/*`.
- Do not introduce a new generic service layer here just because a controller needs somewhere convenient to call.

## Placement Rules

- Use `src/services/` only when the code is truly a legacy compatibility facade or a service that does not fit a clearer domain / infra owner yet.
- If the logic owns business transitions, eligibility, or state semantics, it belongs under a domain owner instead.
- If the logic is cross-cutting infrastructure such as events, jobs, or analytics, it belongs under `src/infra/*`.

## Guardrails

- Keep facades thin when they delegate to domain use-cases.
- Do not let `src/services/` become a second orchestration center that duplicates domain ownership.
- When touching files here, check whether the clearer long-term owner should instead be `src/domains/*` or `src/infra/*`.
