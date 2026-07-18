# 07C policy and canonical seams — task packet

## Scope

Implement the pure DRAFT access policy and wire every ordinary canonical PR ingress listed in the 07C execution
preflight. Preserve raw repository/admin/analytics reads and leave failed-create cleanup untouched.

## Ownership

- Backend PR domain services/commands/queries/read-models/message seams, partner-request/LLM controllers and ShareService.
- Pure policy unit test under `apps/backend/src/domains/pr/services/`.
- No scenario tests, admin behavior, schemas, Web, durable docs, or cleanup implementation.

## Exit criteria

Policy enforces owner-only DRAFT read/content/status/publish, opaque 404 for creatorless/other/anonymous/service actors,
and opaque 404 for all participant-flow operations. Non-DRAFT is a no-op; admin remains on its dedicated surface.
