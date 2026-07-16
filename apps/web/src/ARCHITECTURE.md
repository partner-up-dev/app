# Frontend Architecture

## Purpose

This frontend uses a domain-first structure.

The goal is to keep three axes orthogonal:

- domain ownership
- technical responsibility
- UI composition depth

If a folder mixes those axes at the same level, boundary erosion follows quickly.

## Top-Level Semantics

### `src/app`

Owns application wiring only.

Examples:

- app bootstrapping
- router wiring
- provider setup
- app-level configuration

### `src/shared`

Owns cross-domain code with no single business owner.

Examples:

- generic UI primitives
- styling infrastructure
- browser/platform utilities
- analytics transport
- generic storage and URL helpers

`shared` must not own domain-specific business semantics.

### `src/domains`

Owns business modules by domain.

Examples:

- `domains/pr` (including Discovery and time-window policy surfaces)
- `domains/share`
- `domains/admin`
- `domains/auth`

Inside a domain, subfolders encode responsibility, not convenience.

Suggested subfolders:

- `model`
- `queries`
- `commands`
- `use-cases`
- `routing`
- `ui/surfaces`
- `ui/sections`
- `ui/composites`
- `ui/primitives`
- `adapters`

### `src/processes`

Owns cross-domain or platform workflows.

Examples:

- OAuth bootstrap
- session bootstrap
- other app-level workflows

### `src/pages`

Owns route entrypoints only.

Pages compose domain UI and app/shared infrastructure. They do not own reusable business logic.

## Boundary Rules

### Ownership

- If a module name uses domain language, it should live under that domain.
- If a module is a true primitive, it may live under `shared/ui`.
- Convenience wrappers for one surface are not shared primitives.

### Dependency Direction

Preferred direction:

1. `app`, `pages`, `processes`
2. `domains`
3. `shared`

Within a domain:

1. `ui/surfaces` -> `ui/sections`, `ui/composites`, `use-cases`, `queries`, `model`
2. `ui/sections` -> `ui/composites`, `use-cases`, `queries`, `model`
3. `ui/composites` -> `ui/primitives`, `model`
4. `ui/primitives` -> `model` only when domain-owned
5. `use-cases` -> `queries`, `commands`, `model`, `shared`
6. `queries` / `commands` -> transport and shared infrastructure
7. `model` -> domain logic and generic shared helpers only

Forbidden:

- `shared` importing domain modules
- UI primitives importing query modules
- model modules importing Vue SFCs
- query modules importing page/widget modules

## Classification Rules

### Shared Primitive

A shared primitive must satisfy all:

1. reusable across multiple domains or screens
2. stable API
3. no domain-specific copy, state model, or workflow assumptions
4. no dependence on query result types

`Button` can be shared. `SubmitButton` is usually a usage pattern, not a primitive.

### Domain UI

Domain UI belongs to the business area that gives it meaning.

Examples:

- PR hero header
- PR facts card
- PR Discovery surface
- PR time-window policy picker

### Use Case

A use case orchestrates a workflow.

Examples:

- join/exit PR
- PR creation flow
- share flow

### Server-Derived Stateful View Model

If UI state depends on temporal rules, policy windows, or backend-owned domain transitions, prefer a server-derived view model over recomputing the rules in page code.

Examples:

- partner participation availability
- deadline-driven CTA states
- status explanations that depend on participation and confirmation policy

### Model

A model module owns meaning transformation.

Examples:

- types
- selectors
- adapters
- formatting rules
- route/path helpers when domain-owned
