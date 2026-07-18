# 05C Compatibility Window Evidence

## Facade Entry State

`apps/backend/src/services/PartnerRequestService.ts` was a signature-preserving delegate with three internal
runtime consumers:

| Former consumer | Canonical replacement | Preserved behavior |
| --- | --- | --- |
| `ShareService` | `pr/queries#getPR` | The same `PublicPR` is mapped to the existing share input. |
| `llm.controller` | `pr/queries#getPR` | Caption input remains the same public PR projection. |
| `wecom.controller` | `pr/commands#createPRFromNaturalLanguage` | The existing null-identity input is deliberately unchanged until CF-01 (`3-7`). |

## Removal Evidence

- The facade compiled as a thin delegate to `pr/commands`, `pr/queries` and `pr/contracts` after all direct
  consumers moved; `pnpm check:type:backend` passed at that point.
- The Backend package exports only `.` (`src/index.ts`), not a service subpath. Source-wide static inventory found
  no dynamic/package consumer after the three internal imports moved.
- It is therefore safe to remove the private source facade in this slice; no product, HTTP or provider behavior is
  changed. CF-01 remains explicitly owned by `3-7`.

## Restoration Path

If an unobserved deployment script needs the legacy class, restore a one-file delegate that imports only the named
canonical category entrypoints. Do not recreate PR business logic or reintroduce `pr-core` implementation files.
