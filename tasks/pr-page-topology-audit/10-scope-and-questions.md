# Scope And Questions

## Current Slice

Produce a read-only topology of current PR detail page implementation.

## In Scope

- `/pr/:id` route entrypoint.
- PR detail page direct child components.
- PR-domain UI components used by the route entrypoint.
- PR-domain query and mutation hooks used directly or indirectly by the page surface.
- Cross-process WeChat pending action replay touching PR page behavior.
- Telemetry triggered by PR page or direct PR page action sections.
- Shared UI primitives that shape the route surface.

## Out Of Scope For This Slice

- Product behavior changes.
- Component extraction implementation.
- Durable PRD or Product TDD edits.
- Visual redesign.

## Open Questions

- Which boundary erosion is most expensive for current work: route entrypoint size, cross-process side effects, cache ownership, or PR-domain component contracts?
- Should the next slice solidify a target topology first, or go directly into one narrow extraction?
- Should historical `issue-182-pr-page-ux` notes remain as history, or should stable conclusions be copied into this packet after verification?
