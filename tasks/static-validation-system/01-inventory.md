# Pre-Change Inventory

## Coverage Before This Task

| Layer | Existing coverage | Gap |
| --- | --- | --- |
| Type | Backend `tsc --noEmit`; frontend `vue-tsc`; strict tsconfigs. | No root aggregate; packages not covered by one static gate. |
| Format | None found. | No formatter/check entrypoint. |
| Policy lint | Backend Problem Details; frontend token governance; UI naming audit report. | Checks were fragmented and inconsistently enforced. |
| Dead code / deps | None found. | No Knip/depcheck-style coverage. |
| Security | Payment lockfile policy; env required checks. | No Semgrep/secret/dangerous API scanner. |
| Build reachability | Frontend build; backend build in deploy. | Backend build and migration bundle absent from PR static gate. |
| Config / DB | DB lint; Drizzle artifact drift workflow. | No unified config gate; no `drizzle-kit check` layer. |

## Fragmentation Observed

- Root `pnpm lint` covered backend Problem Details and payment supply-chain only.
- Frontend token strict was enforced, while UI naming audit was mostly report-oriented.
- Backend PR CI ran typecheck/tests/DB lint/scenarios but not backend build or Problem Details lint.
- Frontend PR CI ran token/unit/build but not UI naming audit.
- Deploy workflows carried validation logic that was not available through shared root commands.
