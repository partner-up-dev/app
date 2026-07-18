# 06D Exit Evidence — Root Compatibility Retirement

## Retirement result

The package root no longer exports the 18 safe types already owned by the explicit
`@partner-up-dev/backend/contracts` subpath:

- Feedback: `FeedbackQuestionnaireAnswers`, `FeedbackQuestionnaireDefinition`.
- Join gate: `PRJoinGateConfig`, `PRJoinGateConfigItem`, `PRJoinGateSource`, `PRJoinNoticeGateConfig`.
- PR value/input: `CoordinatePair`, `CreatePRStructuredStatus`, `PartnerRequestFields`,
  `PRAllowEditAfterReady`, `PRRoute`, `PRRoutePoint`, `PRStatus`, `PRStatusManual`, `PRTimeWindow`,
  `VisibilityStatus`, `WeekdayLabel`.
- Upload: `ImageUploadPurpose`.

`AppType` remains the root transport seam; `PRId` and `OrderingOfferDetail` remain explicit compatibility exports.
All runtime schemas/constants and every root export outside this approved set were retained. The Web component guidance
now directs stable value/input imports to `/contracts` and names the permitted root exceptions.

## Consumer and boundary proof

- Fresh source/test/script import census found zero root consumers for every retired type, including no inline
  `import("@partner-up-dev/backend").T` edge or runtime import.
- Final root import consumers are only `AppType` (2 transport adapters), `PRId` (34 explicit type-only compatibility
  edges), and `OrderingOfferDetail` (1 explicit Commerce type-only compatibility edge).
- `apps/backend/src/contracts.ts` remains an explicit `export type`-only surface. The package is private and workspace/
  deployment metadata contains no separate source-level consumer; the export-only restoration path is recorded in
  [`restoration-patch.md`](restoration-patch.md).

## Verification

| Check | Result |
| --- | --- |
| `pnpm check:type:backend` | PASS |
| `pnpm check:type:web` | PASS |
| `pnpm check:build:backend` | PASS |
| `pnpm check:build:web` | PASS |
| `pnpm test:scenario:all` | PASS — Backend scenario: 22 files / 74 tests; System scenario: 8 files / 42 tests |
| `git diff --check` | PASS |
| Architecture fitness delta | PASS — 37 known / 0 new / 88 stale-known (`--check-new`) |

No route, HTTP response, runtime schema, database, product, CF-01, or CF-02 behavior changed in this retirement.
