# CaoCao Order Detail Diagnosis

## Objective & Hypothesis

Diagnose why staging ride-hailing order detail can show "车牌待确认" and omit driver name/phone.

Initial hypothesis: CaoCao `queryOrderDetailV2` response contains driver/vehicle fields under a shape not currently mapped by the adapter, or the provider response does not yet include driver assignment data for the observed order phase.

## Guardrails Touched

- Reality input: staging debug evidence plus official CaoCao documentation.
- Backend ride-hailing provider adapter mapping changed only for CaoCao order detail and final-settlement fee extraction.
- Fake CaoCao provider contract, response payload, and contract tests changed to model the official order-detail response shape directly.
- Official CaoCao order-detail documentation is the external contract reference.

## Verification

- Compare official `queryOrderDetailV2` driver/vehicle fields with local adapter mapping.
- Trace mapped fields through persistence and frontend order detail display.
- Request minimal staging evidence needed to distinguish provider-missing data from local mapping/persistence/display loss.
- Execute fix from fake server contract outward, then run focused fake server and adapter verification.

## Current Understanding

- Official docs expose driver fields under `data.driverInfoVo`: `card`, `name`, `phone`, and `phone_passenger`.
- Local adapter currently reads `driverInfoVo.carNo`, `driverInfoVo.driverName`, and `driverInfoVo.driverPhone` in `parseCaocaoOrderDetail`.
- Local fake CaoCao server and adapter unit tests also use those local field names, so tests can pass while staging CaoCao returns official field names.
- Order-detail projection and frontend appear to preserve mapped `driver` / `vehicle` fields; the visible "车牌待确认" fallback is used when `ride.vehicle.plate` is empty.
- CaoCao status `1` is未派单, so missing `driverInfoVo` is expected before assignment. For assigned/in-service statuses such as `2`, `9`, `12`, or `3`, missing local driver/plate with populated raw `driverInfoVo` would strongly implicate the adapter mapping.
- Staging debug log in `scratch/log-20260701.txt` shows provider phase `9`, route query success, and parsed `providerDriverName: null` / `providerVehiclePlate: ''`, which is consistent with field-name mismatch after driver assignment.
- Implemented fake-server-first correction: fake `queryOrderDetailV2` now emits official `driverInfoVo.card`, `name`, `phone`, and `phone_passenger`; backend adapter reads official fields.
- Tightened follow-up contract gaps for `queryOrderDetailV2`: fake order detail now emits fee/payment/invoice objects, driver detail location is only `lat/lng`, `driverInfoVo.serviceType` is a string, phase-dependent nullable fields are no longer response-required, and fixed-price naming follows the official example as `routeFixedPrice` / `specialFixedPrice`.
- Removed legacy query-order-detail field fallbacks in the backend adapter. Driver name, passenger-side driver phone, plate, and final-settlement fee now map only from `name`, `phone_passenger`, `card`, and `orderFeeVo.totalFee`.

## Next Step

Run focused fake server, adapter, type, formatter/linter, and system ride-hailing scenario verification.

## Verification Results

- `pnpm --filter @partner-up-dev/fake-caocao-server test` passed.
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts` passed.
- `pnpm --filter @partner-up-dev/fake-caocao-server test` passed after fee/payment/invoice and driver-location contract tightening.
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts` passed after removing legacy field fallbacks from adapter code.
- `pnpm --filter @partner-up-dev/fake-caocao-server typecheck` passed.
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm exec biome check apps/backend/src/domains/ride-hailing/services/caocao-provider.ts apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts packages/fake-caocao-server/src/routes.ts packages/fake-caocao-server/src/server.test.ts tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts` passed.
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts` passed: 1 file, 8 tests.
- `pnpm --filter @partner-up-dev/fake-caocao-server typecheck` passed after the follow-up patch.
- `pnpm --filter @partner-up-dev/backend typecheck` passed after the follow-up patch.
- `pnpm check:format` passed, but changed-file mode checked 0 files.
- `pnpm lint:biome` passed, but changed-file mode checked 0 files.
- Removed legacy-field reverse tests per review; `pnpm --filter @partner-up-dev/fake-caocao-server test`, `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts`, and focused `pnpm exec biome check apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts packages/fake-caocao-server/src/server.test.ts` passed.
