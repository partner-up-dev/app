# 4-5.1 Execution Plan

Expose the existing reusable decision through a router `beforeResolve` guard. Register it once in app bootstrap
immediately before `app.use(router)`, which is early enough for initial navigation and late enough for Pinia to be
installed. Add a narrow guard proof that proves this owner relationship without duplicating OAuth mechanics.
