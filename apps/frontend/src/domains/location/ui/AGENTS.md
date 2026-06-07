# Location UI Local Rules

This folder owns generic location picking UI.

## Component Contracts

- `LocationPickerPanel.vue`: Tencent `componentPicker`-backed location picker that returns `PickedLocation`; consuming domains map the picked location into their own payload shape.

## Boundaries

- Keep provider-specific picker integration here.
- Do not add PR, Anchor Event, route-pool, or POI workflow policy to generic location picker components.
