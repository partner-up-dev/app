# Location UI Local Rules

This folder owns generic location picking UI.

## Component Contracts

- `LocationPickerBody.vue`: Tencent Map JavaScript GL SDK-backed location picker body that returns `PickedLocation`; consuming domains map the picked location into their own payload shape.
- `LocationPickerPanel.vue`: compatibility wrapper only; do not add picker business logic here.

## Boundaries

- Keep provider-specific picker integration here.
- Do not add PR, Anchor Event, route-pool, or POI workflow policy to generic location picker components.
