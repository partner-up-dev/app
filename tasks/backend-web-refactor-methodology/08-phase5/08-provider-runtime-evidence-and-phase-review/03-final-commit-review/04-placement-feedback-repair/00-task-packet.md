# 5-7b.3 — Placement Admission Feedback Repair

## Status

**Complete and locally verified.** Sir approved this narrow Web repair. F-01
Rental payment and F-02 RideHailing post-settlement fee confirmation remain
explicit, separate deferrals; they are not source work in this packet.

## Objective And Hypothesis

Ensure the local Placement admission feedback belongs only to the currently
rendered matching context. A route/context change must clear old feedback, and
an old asynchronous admission response must not write feedback, an ordering
handoff, or navigation into the new context.

Hypothesis: `matchingContext` plus the matched Placement id is the correct
local identity seam. Watching those values in `ButtonPlacement` and invalidating
the use-case flow by generation is enough; no new PR prop, frontend admission
rule, backend endpoint, cache authority, or route-level remount is needed.

## Owners And Scope

| Concern | Owner | Allowed change |
| --- | --- | --- |
| transient admission result/request lifetime | `usePlacementOrderingEntryFlow` | reset/invalidation API plus generation guard |
| rendered-context boundary | `ButtonPlacement` | watch matching context and matched Placement id |
| backend eligibility | existing Placement ordering-entry endpoint | no change; remains authoritative |
| PR route/context construction | `PRPage` | no change unless verification disproves the existing identity seam |

## Rehearsed Interaction

```text
PR A context + Placement A
  -> user gets NON_CREATOR feedback
  -> route/context becomes PR B (component remains mounted)
  -> ButtonPlacement invalidates local flow
  -> old feedback disappears
  -> a late PR A response is discarded
  -> only a new PR B click can write PR B feedback/handoff/navigation
```

## Guardrails

- Do not parse `prId`, creator status, or eligibility in Web to invent a second
  admission authority.
- Do not add a generic request framework, router key, or component remount as a
  workaround for one feature-local state lifetime.
- A context change while a request is in flight must not permit the old result
  to mutate the new rendered context.
- Preserve existing success outcomes and direct navigation behavior when the
  context is still current.
- Do not touch Rental, payment recovery, provider, backend, durable PRD/TDD,
  or runtime topology in this slice.

## Files And Verification

- `apps/web/src/domains/commerce/use-cases/usePlacementOrderingEntryFlow.ts`
- `apps/web/src/domains/commerce/ui/ButtonPlacement.vue`
- `apps/web/src/domains/commerce/use-cases/usePlacementOrderingEntryFlow.test.ts`
- new `apps/web/src/domains/commerce/ui/ButtonPlacement.test.ts`

Run the focused two-file Web unit suite, then Web type/lint for the changed
surface. See [`rehearsal.md`](./rehearsal.md) for branches and assertions, and
[`verification-log.md`](./verification-log.md) for the completed result.

## Durable-Doc Effect

None expected. The stable rule is unchanged: the backend owns admission; this
slice only makes a local non-authoritative message obey its context lifetime.
