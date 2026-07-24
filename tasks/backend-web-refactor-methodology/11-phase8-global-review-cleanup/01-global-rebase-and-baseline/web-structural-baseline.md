# `8-0` Web Structural Baseline

## Scope And Calibration

The comparable scope is production `*.ts`, `*.tsx` and `*.vue` under
`apps/web/src`, excluding `*.test.*` and `*.spec.*`.

| Snapshot | Production files | LOC |
| --- | ---: | ---: |
| Phase 3 reviewed baseline (`c634d9b6`) | 404 | 74,000 |
| Phase 8 `8-0` (`cf6cd736`) | 432 | 73,998 |

The near-zero LOC delta with 28 additional files is consistent with domain,
process and Analytics decomposition rather than code growth. Pages fell by
about 940 LOC while domain/process modules grew. This is a locality signal,
not performance proof.

## Fitness Findings

There are no new Web architecture-fitness findings. Ten reviewed findings
remain:

- seven `model -> query` reverse dependencies;
- two named page raw-RPC findings; and
- one UI-primitive-to-query finding.

The seven reverse dependencies are:

| Model family | Query owner imported |
| --- | --- |
| five Admin Commerce pricing/product editor models | `admin-commerce/queries/useAdminCommerce.ts` |
| Admin PR-type configuration editor | `admin/queries/useAdminPRTypeConfigs.ts` |
| Commerce ordering content | `commerce/queries/useCommerce.ts` |

The current query files mix endpoint invocation with request/response type
ownership. The target is not to copy those HTTP shapes into handwritten DTOs:
pure editor/domain values stay model/contract-owned, while query adapters map
them to Backend-inferred request types and own cache/transport effects.

The two page findings are:

- `BIEntryPage.vue:67 -> adminClient.api.auth.admin.login`, which has no named
  compatibility reason and is a candidate workflow/adapter move; and
- `WeChatOAuthCallbackPage.vue:92 -> client.api.wechat.oauth.callback`, which is
  a ratified direct-callback compatibility seam and is not a defect by itself.

`PRPreviewCard.vue:25 -> usePRDetail` sits under `ui/primitives` while fetching
server state. The later slice must either pass an owned projection into a pure
primitive or move the fetching wrapper to the correct composite/workflow
level; merely renaming the directory is not a fix.

## Cycles And Transport

- The only Web production SCC is a type-only two-file cycle:
  `pr-discovery-creation-suggestion.ts <->
  pr-discovery-types.ts`. A small shared candidate/value extraction can remove
  it without changing behavior.
- Ordinary RPC calls are predominantly owned by query/command adapters.
- Three Share use-case calls still invoke RPC directly:
  WeChat description generation, WeChat thumbnail cache, and Xiaohongshu
  poster cache. They are bounded endpoint-owner cleanup candidates.
- Shared WeChat JSSDK signature fetching is platform integration; it should
  move only if a focused shared adapter makes the boundary deeper.
- Raw `fetch` used by the Admin RideHailing fake-provider operator surface and
  the Xiaohongshu external image path is not automatically an application API
  violation.

## Authority Checks

- Public user session authority is one Pinia store at
  `shared/auth/useUserSessionStore.ts`; `stores/userSessionStore.ts` is a
  one-line legacy re-export.
- Admin session is a separate authority.
- Ordering handoff state is explicitly browser-session handoff state, not a
  server-cache duplicate.
- Page-level QueryClient mutation is localized; no second general server-cache
  authority was found.
- The router still has 43 path records and 16 role-protected records. Phase 7
  replaced one Analytics monolith with three focused pages without route
  sprawl.

## Diagnostic, Not Authorization

Large pages and query modules identify places to sample owner span:
Study Sprint, Me, Admin RideHailing, Ordering, Admin Commerce queries and
Commerce queries. Their LOC does not authorize splitting them. The Phase 8
priority is the explicit dependency-direction and endpoint-owner evidence
above.

Knip also reports unused UI/use-case files and legacy roots. Those findings
remain report-first until an owner and behavior/reference proof exists.
