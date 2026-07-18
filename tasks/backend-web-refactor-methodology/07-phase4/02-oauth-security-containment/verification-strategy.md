# 4-1 Verification Strategy

## Completed Read-Only Checks

1. Durable deployment/source/history inventory.
2. GitHub Environment variable inventory for staging and production (variables only; no secrets queried).
3. Public DNS, Web/API health-header and no-cookie CORS preflight probes.

## Future Mutation Gate

1. Preserve FC callback selection, cookie/handoff behavior and frontend callback compatibility as explicit non-goals.
2. Add deterministic allowed/disallowed-origin tests before changing CORS or return-target logic.
3. Run focused Backend/Web tests, then static/type/build and selected System scenarios appropriate to the changed paths.
4. After deployment, repeat only public no-cookie header/preflight checks against both environment pairs.

Provider-console and full callback/handoff proof are prerequisites for `4-3`, not this narrowed `4-1`.

## Non-Goals

- No full production OAuth exchange as a validation shortcut.
- No production authenticated browser test during security containment.
- No assumption that a passing CORS preflight proves callback or cookie correctness.
