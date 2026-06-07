# Input Route: Artifact

## Trigger

Use when the requested deliverable is a bounded artifact such as a script, one-off analysis, migration helper, task packet, or structured output.

## Primary Owner

- `tasks/`
- the local work surface when the artifact belongs next to code or tooling

## Mode Relationship

- Common overlays: `Execute`, sometimes `Explore`
- `Solidify` is optional and only needed when durable knowledge appears

## Forbidden

- Do not promote one-off tactics into durable architecture by default.
- Do not leave verification implicit.

## Read-Do Steps

1. Define the artifact output shape and completion proof.
2. Implement the smallest artifact that satisfies the request.
3. Keep assumptions, scratch material, evidence, and disposal rules inside the task-local workspace unless reuse becomes real.
4. Review whether any reusable lesson deserves promotion into durable docs.

## Exit Criteria

- The requested artifact exists and matches the expected output.
- Verification is complete.
- Any promotion candidate is explicit.
