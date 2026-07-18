# 06A Entry Inventory — Types-only Package Surface

## Rebased 2026-07-17

`3-5` has exited: `domains/pr-core` and the private `PartnerRequestService` facade no longer exist, and
`domains/pr` is stable as the canonical PR owner.

The current package publishes only `@partner-up-dev/backend` through `src/index.ts`. The Backend root remains
the sole `AppType` origin for the two transport constructors:

- `apps/web/src/lib/rpc.ts`
- `apps/web/src/lib/admin-rpc.ts`

The new `@partner-up-dev/backend/contracts` subpath is deliberately **types-only**. Its source contains explicit
`export type` declarations only; package exports provide no runtime condition.

## Included Stable Types

| Owner | Types | Reason |
| --- | --- | --- |
| Feedback questionnaire contract | `FeedbackQuestionnaireAnswers`, `FeedbackQuestionnaireDefinition` | Zod input/value contract used by Web feedback UI |
| PR join-gate contract | `PRJoinGateConfig`, `PRJoinGateConfigItem`, `PRJoinGateSource`, `PRJoinNoticeGateConfig` | Stable authoring/interaction value contract |
| PR authoring value/input contract | `CoordinatePair`, `CreatePRStructuredStatus`, `PartnerRequestFields`, `PRAllowEditAfterReady`, `PRRoute`, `PRRoutePoint`, `PRStatus`, `PRStatusManual`, `PRTimeWindow`, `VisibilityStatus`, `WeekdayLabel` | Public Zod-derived value/input types; schemas themselves remain private |
| Upload contract | `ImageUploadPurpose` | Stable value union; only its type is exported |

## Explicitly Excluded

| Symbol | Reason / next owner decision |
| --- | --- |
| `PRId` | Currently `PartnerRequest["id"]`, hence persistence-row-derived. It remains a root compatibility export until the PR owner declares an independent value contract. |
| `OrderingOfferDetail` | Currently exposes Merchandising persistence projections. It remains a root compatibility export pending a Commerce-owned projection. |
| `AppType` | The intentional typed HTTP seam; remains root-only and transport-owned. |
| Runtime schemas/constants | A types-only subpath must not make schemas, validators, entities, repositories or service code a Web runtime dependency. |

## Resolution Boundaries

Web TypeScript and both Vitest resolver configurations receive an explicit `contracts` mapping before the root
package mapping. This prevents a subpath from being accidentally rewritten as `src/index.ts/contracts` during
tests. The production package export follows the existing source-types pattern and intentionally has no runtime
entry.

## Low-cost Proof Plan

1. A task-local TypeScript probe extends the Web resolver configuration and imports selected symbols via the
   package subpath.
2. A transpilation probe confirms the entrypoint emits no runtime imports/exports.
3. Backend/Web typecheck and build prove package and resolver reachability before 06B starts.
