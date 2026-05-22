# Implementation Log

Date: 2026-05-21

## Completed

- Added Product TDD for user behavior telemetry principles:
  - user behavior, business fact data, and program behavior are separate signal families;
  - user behavior is an append-only event stream, not a reporting table;
  - context is expressed through event flow and projections, not copied onto every event;
  - identity context currently uses `auth.session.created` only;
  - `journey_id` is mandatory and transported through `x-journey-id`.
- Added BI Domain TDD:
  - PR lifecycle metrics query business fact data / current PR statuses;
  - PR lifecycle cohorts use PR `created_at` plus the PR time-window `endAt`;
  - user behavior BI uses enriched events / projections.
- Migrated frontend telemetry transport to the v2 RawUserEvent envelope.
- Added canonical event-name coverage for registered families that intentionally keep underscores, such as `pr.primary_cta.*` and `pr.secondary_action.*`.
- Added central RPC `x-journey-id` propagation.
- Confirmed the current journey generation mechanism:
  - frontend-generated UUID;
  - tab-scoped `sessionStorage`;
  - lazy creation on first telemetry event;
  - reuse until 30 minutes of inactivity;
  - new tab means independent journey;
  - backend does not generate orphan user journeys when `x-journey-id` is missing or invalid.
- Removed command `correlationId` / `x-correlation-id` from PR create, join, waitlist, event-assisted create, and form-mode recommendation flows.
- Added `auth.session.created` emission with anonymous id and authenticated user hash only in that identity context event.
- Added backend-confirmed `pr.created`, `pr.joined`, `pr.waitlisted`, and `pr.closed` user-result events, sourced from request `journey_id`.
- Migrated Anchor Event funnel BI reader from v1 segment table dependence to event-stream reconstruction:
  - v2 path: distinct `anchor_event.landing.viewed` context event id plus same `journey_id`, same `eventId`, and latest context by `occurred_at`;
  - migration path: `segment.started` plus `legacy_segment_id`.
- Updated PR join success close flow to preserve the `entry=join` route state required by scenario and analytics verification.
- Added regression coverage for repeated landing contexts inside one journey and frontend canonical event-name mapping.

## Remaining Follow-Ups

- `route.left` and `journey.ended` remain registered lifecycle context events, but current BI verification does not require emitting them.
- Dedicated enriched projection tables remain future work; the current reader reconstructs directly from the v2 ledger.
- More BI surfaces beyond the existing Anchor Event funnel still need issue-specific implementation.

## 2026-05-22 Minimal Projection Slice

- Added query-level `dim_event` projection from the unique Event Registry.
- Added query-level `event_enriched` reader over `user_telemetry_events`:
  - route context is reconstructed from nearest prior `route.entered` in the same journey;
  - identity context is reconstructed from nearest prior `auth.session.created` in the same journey;
  - missing route or auth context is surfaced as `context_unknown`.
- Added `/api/analytics/pr-join-funnel` using the enriched projection.
- Added the first PR join dashboard projection over:
  - `pr.primary_cta.impression`;
  - `pr.primary_cta.click`;
  - `pr.join.result`;
  - `pr.joined`.
- Updated `/admin/analytics` with a minimal PR join funnel panel and context-completeness footnote.
- Committed this slice as `2666bcb6 feat(analytics): add query-level user event projection`.

## 2026-05-22 PR Create Funnel Slice

- Added `/api/analytics/pr-create-funnel` using the same enriched projection.
- Added PR create dashboard projection over:
  - `home.create.entry.click`;
  - Anchor Event assisted-create entry events;
  - `pr.create.result`;
  - `anchor_event.assisted_create.result`;
  - `pr.created`.
- Added PR create path breakdown for `form`, `event_assisted`, `natural_language`, and `unknown` from backend-confirmed `pr.created` payloads.
- Updated `/admin/analytics` with a minimal PR create funnel panel.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --dir . exec vitest run --project backend-unit apps/backend/src/infra/analytics/pr-join-funnel.model.test.ts` passed.
- `pnpm --dir . exec vitest run --project backend-unit apps/backend/src/infra/analytics/pr-create-funnel.model.test.ts apps/backend/src/infra/analytics/pr-join-funnel.model.test.ts` passed.
- `pnpm lint:backend` passed.
- `pnpm build:backend` passed.
- `pnpm --dir . exec vitest run --project backend-unit apps/backend/src/infra/analytics/anchor-event-funnel.model.test.ts apps/backend/src/infra/telemetry/request-journey-context.test.ts apps/backend/src/infra/telemetry/user-event-registry.test.ts` passed.
- `pnpm --dir . exec vitest run --project frontend-unit apps/frontend/src/shared/telemetry/track.test.ts` passed.
- `pnpm test:unit:backend` passed.
- `pnpm test:unit:frontend` passed.
- `pnpm lint:backend` passed.
- `pnpm db:lint` passed.
- `pnpm --dir . exec vitest run --project system-scenario tests/scenario/anchor-event/anchor-event-analytics-funnel.scenario.test.ts` passed.
