# `7-4D` Rehearsal

1. Load the required design-system implementation skill before Vue edits.
2. Characterize the monolith first; avoid snapshotting all 1,206 lines.
3. Extract pure filters/presentation before moving markup.
4. Move Overview first because it uses one query and gives the smallest route
   cut-over.
5. Move PR funnels next and keep Create/Join requests co-enabled only on that
   route.
6. Move Discovery last because it has additional dimension filters.
7. At each route:
   - navigate by the existing route name;
   - assert only expected endpoints run;
   - assert loading/error/empty/data states;
   - assert stable semantic test IDs;
   - compare filter request parameters.
8. Keep the old monolith reachable until the last focused route test is green,
   but do not retain a runtime feature flag.
9. Verify `/bi` redirect/code scrubbing after router imports change.
10. Delete old page/query exports and run structural searches before broad
    tests.

If extraction creates prop drilling across more than one surface layer, move
the state machine into an Analytics use-case/composable. Do not solve it with
page-owned mutable state or a new global store.
