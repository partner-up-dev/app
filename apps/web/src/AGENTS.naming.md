# Frontend UI Naming

Use component names to expose both owner and UI role:

```text
[Domain/Feature/Entity][Purpose][UIRole]
```

Omit redundant parts, but keep the final UI role meaningful.

## Core Suffixes

Prefer this small core vocabulary:

- `Page`: route entrypoint under `src/pages`.
- `Layout`: slot or region arrangement without workflow orchestration.
- `Section`: thematic content region, usually page-local.
- `Panel`: bounded functional region with meaningful interaction or state.
- `Card`: compact self-contained object, preview, summary, or choice.
- `List`: one-dimensional repeated collection.
- `Row`: horizontal record or editor line.
- `Form`: complete submission unit.
- `Field`: one labeled input or value row.
- `Editor`: structured modification surface for an entity or value.
- `ActionBar`: grouped workflow actions.
- `Dialog`: blocking or decision overlay.
- `Drawer`: edge-entering secondary workflow or detail panel.

Use extension words only when exact: `View`, `Shell`, `Header`, `Footer`,
`Aside`, `Table`, `Grid`, `Picker`, `Selector`, `Toolbar`, `FilterBar`,
`Badge`, `Chip`, `Avatar`, and `Map`.

State-surface names such as `EmptyState`, `ErrorState`, `LoadingState`, and
`Skeleton` are exceptions. Use them only when the component exclusively renders
that result or loading state. `Notice` is a message primitive name, not a
general suffix.

## Classes

Mirror the component role with kebab-case root names and BEM-lite internal
roles:

```text
pr-preview-card
pr-preview-card__header
pr-preview-card__body
pr-preview-card__actions
pr-preview-card--compact
is-selected
has-error
```

Internal class roles should stay small and concrete: `header`, `body`,
`footer`, `title`, `description`, `summary`, `meta`, `media`, `icon`, `badge`,
`leading`, `trailing`, `actions`, `primary-action`, `secondary-action`, `list`,
`item`, `empty`, `error`, and `loading`.

Prefer `leading` / `trailing` over `left` / `right`. Prefer `body`, `summary`,
`meta`, `media`, or `actions` over generic `content` when the role is known.

Avoid `Wrapper`, `Container`, `Content`, `Info`, `Box`, `Component`, `Common`,
`Base`, `Main`, `Left`, `Right`, `Top`, `Bottom`, `Inner`, and `Outer` as
component suffixes unless there is a documented local meaning.
