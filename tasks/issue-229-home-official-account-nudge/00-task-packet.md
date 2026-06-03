# Home Official Account Nudge

## Objective & Hypothesis

- Objective: remove the bookmark-page nudge introduced by `ce0a68235e00927334abcc02f8bcaee47f39a107`, keep official-account follow prompts on Anchor Event landing, add the same official-account follow nudge to Home, and record user telemetry for prompt behavior.
- Hypothesis: one shared official-account follow prompt hook can govern Home, Anchor Event landing, and post-commitment follow-ups with the existing backend-confirmed follow state plus the existing 6-hour local cooldown.

## Guardrails Touched

- PRD workflow truth: Home and Anchor Event browsing should point users to the official account rather than browser bookmark behavior.
- Product TDD: official-account follow prompt cooldown remains non-authoritative frontend state, while backend follow confirmation stays authoritative.
- Frontend route composition: Home and `/e/:eventId` assemble the shared marketing nudge without owning follow-state truth.
- Telemetry: prompt presentation and action events use the existing `trackEvent` user telemetry pipeline.

## Verification

- Completed: code and durable docs no longer reference the removed bookmark-page nudge modules.
- Completed: `pnpm --filter @partner-up-dev/frontend build` passed.
- Completed: `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
