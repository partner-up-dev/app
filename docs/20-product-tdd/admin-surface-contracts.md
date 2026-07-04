# Admin Surface Contracts

This file owns cross-unit contracts for operator/admin surfaces whose behavior must stay coherent across frontend route workspaces and backend admin APIs.

## 1. Configuration And Metadata Admin Contract

- Event-owned landing rollout config is persisted through the infra `config` table while Anchor Event owns the namespace, payload schema, parse / serialize rules, and admin contract.
- Product-side rollout control is expressed through per-mode landing ratio override plus assignment revision. Modes with ratio `0` are excluded from weighted assignment, and an all-zero override resolves to `FORM`.
- Admin edits event-owned landing rollout config through `GET /api/admin/events/:eventId/landing-config` and `PUT /api/admin/events/:eventId/landing-config`.
- Event-owned preset preference tags and their moderation state are persisted through dedicated Anchor Event tables instead of config blobs. Admin reads them through `GET /api/admin/events/:eventId/preference-tags`, replaces published tags through `PUT /api/admin/events/:eventId/preference-tags/published`, and moderates pending tags through `POST /api/admin/events/:eventId/preference-tags/:tagId/publish|reject`.
- Admin edits Anchor Event time-window description copy through `timePoolConfig.startRules[].description`; the admin workspace preview returns the materialized description for each generated time window.
- Admin edits the Anchor Event PR time-window editor default mode as event-owned assisted-create UI policy. The value affects empty initial editor state across FORM, CARD_RICH, and LIST assisted PR creation; existing selected time-window state still wins over the configured default.
- Admin selects the Anchor Event feedback questionnaire template pointer through Anchor Event management. That pointer affects future PR materialization for PRs whose type resolves to the Anchor Event. Existing PRs keep their mounted questionnaire instance until a PR-specific pointer override changes it.

## 2. PR Admin Contract

- `DELETE /api/admin/prs/:id` is an admin-only hard-delete command for one PR. Backend deletes the `partner_requests` root row and relies on PR-owned cascade constraints to remove Partner rows, messages, and notification records. Frontend must show an explicit destructive confirmation before sending this command and refresh Admin PR workspace caches after success.
- `PATCH /api/admin/prs/:id/feedback-questionnaire-instance` is the admin-only PR feedback override command. It replaces the PR's mounted feedback questionnaire instance pointer and leaves general PR content, Anchor Event template selection, and prior response records under their owning persistence rules.
- Frontend Admin PR management exposes separate PR basic and PR messages views backed by section-level use-case surfaces. PR basic uses existing PR content, status, visibility, feedback-questionnaire, create, and delete admin endpoints. PR messages use existing PR message list, create, edit, and delete admin endpoints.

## 3. POI And Anchor Event Admin Contract

- Frontend Admin Anchor Event management exposes section-level use-case surfaces for basic info, locations, time policy, tags, and other event-owned settings.
- A section-level frontend use-case may initially merge the current backend workspace event with the section draft and submit the existing full-object Anchor Event mutation. Future backend endpoint splits should preserve the section-level frontend contract while moving persistence granularity closer to the edited business surface.
- Frontend Admin POI management exposes section-level use-case surfaces for POI basic maintenance and POI review.
- POI basic uses the existing POI upsert admin endpoint for gallery, per-window capacity, meeting-point, and availability-rule state.
- POI review uses publish and reject commands.
- Shared POI edit drafts should stay in one editor state owner so server refreshes do not overwrite unsaved local edits.

## 4. Commerce Admin Surface References

Detailed ecommerce and RideHailing admin contracts belong to `ecommerce-contracts.md`.

This file keeps only the admin navigation/workspace boundary:

- Frontend Admin RideHailing management exposes separate provider-instance and order-admin views.
- Provider Instance uses the existing ride-hailing provider-instance admin endpoints.
- Order Admin uses the dedicated ride-hailing order workspace read plus the admin ride-hailing cancel command and stays route-local to the RideHailing admin group.

## 5. Admin Shell Contract

- Frontend Admin pages use a shared two-column operator shell.
- The left column owns global Admin navigation plus route-context modules shared across second-level views, including Anchor Event selection, PR filters, POI selection, and feedback questionnaire template selection.
- The right workspace owns the page header and active second-level business section content.
