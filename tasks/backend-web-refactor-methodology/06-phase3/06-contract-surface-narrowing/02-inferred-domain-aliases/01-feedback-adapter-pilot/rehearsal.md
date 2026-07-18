# 06B Feedback adapter pilot — rehearsal

## Intended sequence

1. Confirm 06A's `@partner-up-dev/backend/contracts` entry resolves in Web type/build configuration.
2. Move Feedback questionnaire value-type imports in model/UI/tests to the contracts entry.
3. In the command adapter, infer the route request JSON and success response from
   `client.api.feedback[":instanceId"].$post`.
4. Preserve the numeric domain `instanceId` and its string path conversion, credentials, error handling, and JSON
   payload exactly.
5. Run the three focused Feedback unit files, Web type/build checks, and `git diff --check`.

## Fork checks

- If Hono inference exposes a cycle or makes the existing answers shape incompatible, stop without changing the
  Backend route/schema or adding a duplicate DTO.
- If inference changes the HTTP payload or response behavior, stop and report a cross-unit contract change.
- No universal API wrapper or runtime contracts dependency is permitted in this pilot.

## Expected proof

The only raw `client`/Hono inference references under `apps/web/src/domains/feedback/**` are in the submit command;
all stable value-type imports resolve from `@partner-up-dev/backend/contracts`.
