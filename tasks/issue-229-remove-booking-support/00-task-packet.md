# Issue 229 Remove Booking Support

## Objective & Hypothesis

Remove the full Booking Support mechanism before product/order/discount work lands. The replacement product families are outside this slice; this slice should leave PR participation, user phone profile, Join Notice, reminders, messages, feedback, meeting point, waitlist, and beta-group behavior stable.

## Guardrails Touched

- PRD and cross-unit contracts for PR creation defaults, join gates, reliability, notifications, support, and admin surfaces.
- Backend schema, migrations, repositories, controllers, PR core lifecycle, admin PR workspaces, notification subscription kinds, and seeds.
- Frontend routes, admin navigation, PR detail utility actions, join-gate UI, notification subscription panels, contact support, i18n, and query keys.
- Backend and system scenario tests that previously asserted booking-contact/support-resource behavior.

## Decisions

- `BOOKING_CONTACT` join gate is deleted with Booking Support.
- `users.phone_number` stays as the user-owned phone profile fact.
- Historical booking execution and reimbursement data can be dropped by forward migration without archive.
- `/contact-support` removes the reimbursement staff entry.

## Verification

- Residual scan for Booking Support symbols outside removal migrations and this task packet: passed.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm db:lint`: passed.
- `pnpm lint:backend`: passed.
- `pnpm test:unit:backend`: passed.
- `pnpm test:unit:frontend`: passed.
- `pnpm test:scenario:backend`: passed.
- `pnpm test:scenario:system`: passed.
- `pnpm build`: passed.

## Work Log

- 2026-05-17: Started implementation after product decisions were confirmed.
- 2026-05-17: Removed backend Booking Support, Booking Contact gate, reimbursement, booking-result notification, admin execution, and support-resource surfaces.
- 2026-05-17: Removed frontend routes, pages, admin navigation, contact-support reimbursement staff entry, notification subscription item, query keys, and join-gate UI paths.
- 2026-05-17: Added forward migrations `0059_remove_booking_support.sql` and `0060_remove_booking_support_data.sql`; updated PRD, Product TDD, deployment docs, and scenario coverage.
