# Admin Surface Contracts

This file owns cross-unit contracts for operator/admin surfaces whose behavior
must stay coherent across frontend workspaces and backend admin APIs.

## 1. PR Type And Discovery Configuration

- Current PR Type Configuration is selected directly by `PR.type` and may be
  persisted through the existing configuration store. It owns only the current
  type policy and payload schema; it has no lifecycle, scenario identity,
  configuration version, revision, effective time, or PR-side reference.
- View rollout keeps the current `FORM`, `CARD`, and `LIST` ratios over one
  PR Discovery/Authoring contract. The current default vector is
  `FORM=50`, `CARD=50`, `LIST=0`; configured overrides remain unchanged.
  Ratio `0` excludes a view from weighted selection; an all-zero override
  resolves to `LIST`. Assignment history and rebucketing state are not
  persisted.
- Admin edits current type discovery/authoring policy through the service's
  typed configuration commands. The command must validate type uniqueness and
  reject unrelated lifecycle fields.
- Type-owned preference tags and moderation state remain separate from the
  generic configuration blob when they need independent review. Published
  tags feed PR Discovery; pending submissions never become public implicitly.
- Admin edits type-specific start rules, duration, lead time, and optional
  description copy. PR Authoring projects these values as concrete future
  start suggestions; custom time entry remains ordinary PR input.
- Admin selects a questionnaire template for future PR materialization. Existing
  PRs keep their mounted questionnaire instance until an explicit PR-specific
  override.

## 2. PR Admin Contract

- `DELETE /api/admin/prs/:id` is an admin-only hard-delete command for one PR.
  Backend deletes the PR root and relies on PR-owned cascade constraints to
  remove Partner rows, messages, and notification records. Frontend must show
  explicit destructive confirmation and refresh admin PR caches after success.
- `PATCH /api/admin/prs/:id/feedback-questionnaire-instance` replaces one PR's
  mounted questionnaire pointer and leaves general PR content and prior
  response records under their owning persistence rules.
- Frontend PR management exposes separate PR basic and PR message views backed
  by section-level use cases and existing admin endpoints.

## 3. POI And Support Admin Contract

- Frontend POI management exposes section-level surfaces for POI maintenance
  and pending-application review.
- POI basic maintenance uses the existing upsert endpoint for gallery,
  per-window capacity, meeting-point, and availability-rule state.
- POI review uses publish and reject commands. Shared POI edit drafts stay in
  one editor state owner so server refreshes cannot overwrite unsaved edits.
- Platform-support and official-account assets, preference moderation, and
  analytics controls retain their own owners. Type community presentation and
  route applications remain available through their precise PR Discovery and
  PR Authoring support owners rather than a PR-type god object.

## 4. Commerce Admin Surface References

Detailed ecommerce and RideHailing admin contracts belong to
`ecommerce-contracts.md`. This file keeps only the admin navigation/workspace
boundary for provider instances and order administration.

## 5. Admin Shell Contract

- Frontend Admin pages use a shared two-column operator shell.
- The left column owns global Admin navigation plus route-context modules for
  PR type selection, PR filters, POI selection, and questionnaire-template
  selection.
- The right workspace owns the page header and active business section.
