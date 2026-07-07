# AGENTS.md for Frontend Queries

This top-level directory is retired.

Do not add new query hooks here.

## Placement Rules

- Domain-owned query hooks belong under `src/domains/<domain>/queries/*`.
- Cross-domain or platform-owned query hooks belong under a shared owner such as:
  - `src/shared/config/queries/*`
  - `src/shared/poi/queries/*`
  - `src/shared/wechat/queries/*`

## Query Norms

- Do not call `client.api...` directly in components for read paths.
- Wrap backend access in `useQuery` / `useMutation`.
- Query keys must come from `src/shared/api/query-keys`.
- Prefer inferred Hono RPC response types over handwritten DTOs.

If you think a new query has no clear owner, stop and decide the owner first. Do not use this folder as a fallback.
