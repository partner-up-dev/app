# Slice 3-3 Execution Plan

## Required Information Before Editing

1. Feedback definition/answer schemas, conditional rules and unique upsert constraint.
2. Backend route auth, current status/Problem Details and response timestamps/ids.
3. PR canonical feedback projection and submitted/pending response-state semantics.
4. Web form events, draft/upload behavior, modal close/error flow and design-web component contracts.
5. Existing Backend scenario and System journey, noting that the current System test opens but does not submit.

## Subtasks

### 03A — Complete Characterization First

- Backend unit/scenario: missing instance, required/type/conditional/max-length validation and repeat upsert.
- Web unit: form draft, required/conditional fields, cancel, retry and success emission.
- System: authenticated participant opens questionnaire, fills a valid answer, submits and observes refreshed state.
- Backend probe: one response for `(instanceId, respondentUserId)` with expected answers.

### 03B — Deepen The Backend Boundary

- Controller remains auth + Zod + command mapping.
- Feedback use-case owns instance lookup, definition validation and submission semantics.
- Repository owns CRUD/upsert only; no PR eligibility or UI behavior enters the generic command.
- Preserve path, status, response fields and schema; a required migration stops the slice.

### 03C — Separate Web Command From PR Context

- Feedback mutation sends only `instanceId` and `answers` to the API.
- A context-bound workflow owns the optional PR detail invalidation and modal success/error behavior.
- Use the shared Problem Details parser; retain legacy `error` fallback only as an explicit compatibility read.
- Keep answers local. Do not silently persist sensitive questionnaire answers for OAuth replay.

### 03D — Verify The Full Journey

- Run focused Backend unit/scenario, Web unit/type/build and targeted System.
- Run full System before completion.
- Check UI has no direct RPC, no optimistic second feedback truth and no new controller→repository edge.

## Acceptance Checks

- Real POST observed in browser; successful UI state and persisted response agree.
- Repeated submission updates the same logical response.
- Failure preserves local draft and exposes a retryable error.
- PR detail invalidation/refetch is explicit and no `prId` leaks into the HTTP command payload.
- No API/schema/product behavior drift.
