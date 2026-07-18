# 4-2.3 Execution Plan

1. Start from a fresh browser context on an ordinary public route and wait for the public session storage boundary.
2. Remove only the token, reload, and assert the same UUID is restored.
3. Disable that row through the scenario's permitted backend persistence probe, remove the token, reload, and assert
   a new UUID/token pair exists.
4. Keep assertions browser-visible where possible; use the database only to establish the hidden disabled state.

## Result

All four steps completed on the ordinary `/` route. The test uses browser localStorage only for the observable
continuity assertions and one generic backend test action only to change the hidden user status.
