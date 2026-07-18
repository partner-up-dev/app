# 05B — Runtime Consumer Cutover

## Objective

Move production consumers from `pr-core`/legacy PR service paths to the curated canonical PR surface in small
families, preserving behavior and leaving test-kit migration until each corresponding runtime family is stable.

## Status

Complete. Controllers, domain consumers, integrations and test kits now resolve through the curated canonical PR
surface; no `pr-core` import remains in the scoped source/test inventory.

## Planned Order

1. Canonical PR's own model/read/message/share adapters.
2. PR controllers plus Admin/Authoring/Discovery consumers.
3. Notification and Trade consumers.
4. LLM, Share and WeCom adapters, while retaining the explicit facade window.

## Guardrails

- One family per diff/review unit; no HTTP/schema/product change.
- A renamed export is not proof: retain the old decision boundary and select the affected scenario from
  `../entry-delta.md`.
- WeCom null-identity creation remains frozen for `3-7`; this subtask may route through a facade but may not
  normalize or persist a different identity behavior.

## Verification

- Before/after import count and architecture-fitness delta per family.
- Focused unit/scenario at each high-risk command family; backend type/build after each coherent batch.
- Targeted System only when a changed consumer crosses Browser → HTTP → Backend behavior.
