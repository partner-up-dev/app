# Phase 4A: Unit TDD Audit

## Objective

Audit `docs/30-unit-tdd/` after the PRD and Product TDD cleanup batches, with the local `AGENTS.md` audit running in parallel.

The Unit TDD question is narrow:

- does this layer still have a clear owner model?
- is it too sparse, too broad, stale, or duplicated against Product TDD / local AGENTS?
- what cleanup should be proposed before durable mutation?

## Inventory

Current Unit TDD files:

```text
docs/30-unit-tdd/index.md
docs/30-unit-tdd/wechat-oauth-handoff.md
```

Current layer shape:

- `index.md` defines Unit TDD as optional hard-unit truth only.
- `wechat-oauth-handoff.md` is the only active hard-unit doc.
- No broad frontend/backend package manuals exist in this layer.

## Findings

### F4U-001: Path Convention Drift Between Unit TDD Index And AGENTS References

Evidence:

- `docs/30-unit-tdd/index.md` links the active hard-unit doc as `./wechat-oauth-handoff.md`.
- `apps/backend/AGENTS.md` and `apps/frontend/AGENTS.md` both tell agents to read `docs/30-unit-tdd/<unit>/*.md`.

Why it matters:

- The actual layer is flat today, while app-level AGENTS imply a folder-per-unit convention.
- This is small but creates lookup friction exactly when a hard-unit doc is supposed to be opened quickly.

Candidate cleanup:

- Either normalize references to `docs/30-unit-tdd/<unit>.md`, or move the active file into a folder convention such as `docs/30-unit-tdd/wechat-oauth-handoff/index.md`.
- Prefer the smallest change unless multiple hard-unit docs are about to be added.

### F4U-002: WeChat OAuth Handoff Is Correctly Placed But Should Be The Canonical Deep Owner

Evidence:

- Product TDD owns the cross-unit session contract in `docs/20-product-tdd/cross-unit-contracts.md`.
- `docs/30-unit-tdd/wechat-oauth-handoff.md` owns the fragile local browser/backend handoff choreography.
- `apps/backend/src/controllers/AGENTS.md` and `apps/frontend/src/processes/wechat/AGENTS.md` correctly route local edits to the Unit TDD doc.

Why it matters:

- The split is healthy: Product TDD states the cross-unit invariant, Unit TDD preserves the local failure-prone sequence.
- The risk is future duplication. Local AGENTS should remain pointers plus immediate hazards, not re-explain the full choreography.

Candidate cleanup:

- Keep `wechat-oauth-handoff.md` as the canonical deep owner.
- In local AGENTS, keep only trigger conditions and non-negotiable hazards, with a link to the Unit TDD doc.

### F4U-003: Unit TDD Has No Candidate Index For When To Create The Next Hard-Unit Doc

Evidence:

- `index.md` explains the layer rule but does not list candidate triggers seen elsewhere.
- Local AGENTS currently carry some durable local contracts directly, especially frontend event Form Mode and shared UI primitive selection.

Why it matters:

- Without creation triggers, AGENTS.md files can become the default home for fragile local truth.
- This weakens the intended separation: AGENTS for local operating constraints, Unit TDD for hard-unit design memory.

Candidate cleanup:

- Add a compact "creation triggers" section to `docs/30-unit-tdd/index.md`, for example:
  - multi-file local choreography with failure semantics
  - hard-to-rediscover sequencing constraints
  - local state authority that must not move up to Product TDD
  - repeated local AGENTS content that is too deep for an edit-time warning

### F4U-004: No Immediate Need To Create Broad Backend Or Frontend Unit TDD Manuals

Evidence:

- Backend and frontend root AGENTS already carry operational guidance.
- Product TDD now owns cross-unit contracts more explicitly after Batch 4.
- Existing Unit TDD index explicitly says broad frontend/backend package folders were removed as over-broad.

Why it matters:

- Reintroducing broad unit manuals would duplicate app-level AGENTS and Product TDD.
- The current sparse Unit TDD shape is acceptable if the index makes hard-unit creation rules clearer.

Candidate cleanup:

- Do not create `backend/` or `frontend/` Unit TDD folders as part of this governance cleanup.
- Create Unit TDD only for named fragile units with a concrete owner and verification expectation.

## Recommended Batch Shape

This audit does not require a large durable mutation.

Recommended later cleanup batch:

1. Normalize Unit TDD path convention in app-level AGENTS or in the Unit TDD filesystem.
2. Add hard-unit creation triggers to `docs/30-unit-tdd/index.md`.
3. Keep WeChat OAuth handoff as-is except for path updates if a folder convention is chosen.

## Verification Performed

Commands run:

```bash
rg --files docs/30-unit-tdd
find docs/30-unit-tdd -type f -maxdepth 3 -print0 | xargs -0 wc -l | sort -n
rg -n 'docs/30-unit-tdd|wechat-oauth-handoff|Unit TDD|hard-unit' AGENTS.md apps docs/30-unit-tdd docs/20-product-tdd -g '*.md'
rg -n 'OAuth|handoff|wechatOAuthHandoff|AUTHENTICATED_REQUIRED|x-access-token|signed cookie|returnTo' docs/20-product-tdd docs/30-unit-tdd apps/**/AGENTS.md
```

Audit-only outcome:

- No durable Unit TDD files were modified during this audit.
- Findings are task-local and should become a cleanup batch only after user approval.

## Post-Audit Execution Notes

Batch 5 executed the critical Unit TDD content recovery:

- F4U-001 resolved by aligning app-level AGENTS references to the current flat Unit TDD file convention.
- F4U-002 preserved: WeChat OAuth handoff remains the canonical deep owner and precise local AGENTS pointers were left unchanged.
- F4U-003 resolved by adding Unit TDD creation triggers, non-triggers, candidate backlog, and topology re-evaluation criteria to `docs/30-unit-tdd/index.md`.
- F4U-004 preserved: no broad backend/frontend Unit TDD manuals were created.

New Unit TDD docs created:

- `docs/30-unit-tdd/frontend-event-form-mode.md`
- `docs/30-unit-tdd/frontend-shared-ui-primitives.md`
- `docs/30-unit-tdd/backend-migration-ledger.md`
