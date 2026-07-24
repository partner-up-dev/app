# `8-4` Verification Log

## Completed Evidence

- Focused WeChat controller, User and Notification tests: `6 files / 36
  tests`, all passed.
- Focused PR/User/Notification seam tests: `5 files / 34 tests`, all passed.
- Backend targeted scenarios for public session, OAuth handoff, draft opacity,
  confirmation/activity reminders and POI/PR-Type meeting-point notifications:
  `7 files / 23 tests`, all passed.
- Selected System journeys for public session, PR create/edit/join and
  PR-message attention: `5 files / 9 tests`, all passed.
- Backend typecheck passed after correcting
  `PartnerRequestRepository.findById` to expose its actual nullable result.
- Architecture fitness reports `970 files / 3,678 edges / 0 unresolved / 3
  known / 0 new`; all three remaining findings are assigned Web residue for
  `8-6`. Controller-to-repository findings are zero.
- Backend SCC inventory contains only the previously assigned Commerce family:
  one four-file eager SCC and one nine-file dynamic-inclusive SCC. No
  Notification/PR or other `8-4` SCC remains.
- Direct source search confirms no controller imports or constructs a
  repository.
- Focused formatter, Oxlint, structure guard, architecture-fitness tests and
  `git diff --check` pass for the completed batches.

## Review Result

Read-only review found no blocking ownership or behavior regression.
Mutation middleware preserves stale/disabled/missing-subject error priority,
and the owner commands first load the PR and enforce draft opacity. The
characterized draft scenario covers the sensitive join-gate and message
mutation paths.

Two non-blocking residuals remain:

- a user could be disabled in the narrow interval after middleware
  authentication and before a join/waitlist identity lookup, changing only
  that concurrent failure's error priority; and
- the stable Admin POI list/by-id/by-name projections have indirect scenario
  and controller/use-case proof but no dedicated query-only unit.

Neither residual reintroduces a controller repository edge or duplicate
authority.

## Full Local Gates

The first full Backend unit/lint run exposed test-harness drift rather than a
scenario failure:

- seven legacy suites have incomplete PR-contract mocks or an import-time test
  environment leak; and
- one new operator-auth test lacks the type parameters required by the current
  Oxlint Vitest rule.

The repair extracted a side-effect-free creator-identity contract leaf so the
public PR contract surface no longer instantiates User persistence/runtime
dependencies, restored PR Type Configuration to that public surface, removed
two brittle PR-contract mocks and typed the operator-auth mocks. The seven
formerly failing suites then passed `33/33`.
The final rerun passed:

- full Backend unit: `121 files / 548 tests`;
- Backend Oxlint and structure guard;
- Backend typecheck; and
- architecture-fitness tests: `8/8`.

`8-4` is complete. Full-repository static and full Backend/System scenario
gates remain the Phase 8 integration gate after `8-5`, so they are not
duplicated between adjacent source slices.
