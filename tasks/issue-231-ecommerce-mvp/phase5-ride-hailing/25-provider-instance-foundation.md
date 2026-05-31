# Provider Instance Foundation

Date: 2026-05-31

## Purpose

Record Slice 2 implementation details for durable RideHailing provider
configuration and the Caocao adapter boundary.

## Scope

Implemented in this slice:

- `ride_hailing_provider_instances` persistence;
- config-backed Caocao provider registration;
- `RideHailingProviderPort`;
- provider registry;
- `CaocaoProviderAdapter`;
- provider-instance-specific callback route skeleton.

Explicitly not implemented in this slice:

- RideHailing order creation;
- RideHailing fulfillment persistence;
- provider callback mutation of local order state;
- provider event inbox / attempt table.

## Persistence

Migration:

- `apps/backend/drizzle/0074_ride_hailing_provider_instances.sql`

Entity/repository:

- `apps/backend/src/entities/ride-hailing-provider.ts`
- `apps/backend/src/repositories/RideHailingProviderInstanceRepository.ts`

The table stores provider credentials and endpoint settings in typed JSON
`config`. Caocao credentials are not read from environment variables.

Current config shape:

- `adapterMode: "CAOCAO_OPEN_API"`;
- `caocaoClientId`;
- `signKey`;
- `endpointBaseUrl`;
- `callbackBaseUrl`;
- `requestTimeoutMs`.

## Registration

Registration is config-file driven, matching the Payment provider registration
shape:

```text
pnpm --filter @partner-up-dev/backend ride-hailing:register-provider <config.json>
```

The script parses the JSON through the RideHailing provider registration schema
and writes/upserts the provider instance by `(providerType, instanceKey)`.

## Caocao Adapter

The adapter owns provider-specific behavior:

- external order id conversion:
  - local UUID -> `rh` + base36-compressed UUID;
  - callback external id -> local UUID when it follows the adapter convention;
- signing:
  - add local-only `sign_key`;
  - sort keys ascending;
  - concatenate `key + value`;
  - SHA1 hex;
  - send `sign`, never `sign_key`;
- form serialization for Caocao POST requests;
- callback signature verification;
- basic response success/error parsing;
- endpoint path selection.

The compact external id is generated inside `CaocaoProviderAdapter`, not in the
generic RideHailing order model.

## Callback Route

Route:

```text
POST /api/ride-hailing/caocao/:providerInstanceId/callback/order-status
```

Historical alias:

```text
POST /api/v1/service_provider/caocao/callback/order
```

The alias exists for historical provider integration compatibility. It resolves
to the first active Caocao provider instance by stable ordering
`created_at asc, id asc`, then reuses the same callback use case as the formal
provider-instance route.

Current skeleton sequence:

1. Controller parses form-urlencoded string fields.
2. Use case loads the active Caocao provider instance by route parameter.
3. Registry constructs the Caocao adapter from that concrete instance.
4. Adapter verifies signature and parses the callback.
5. Use case rejects callbacks whose `ext_order_id` cannot be decoded to a local
   RideHailing order UUID.
6. Use case returns a provider-facing success response without mutating order
   state.

Local order/fulfillment mutation is intentionally deferred to later slices,
after `ride_hailing_orders` and `ride_hailing_fulfillments` exist.

## Verification

Slice 2 unit tests cover:

- provider config validation;
- Caocao signing;
- transport params not leaking `sign_key`;
- signed GET request serialization;
- callback signature verification;
- unsupported callback event rejection;
- UUID external id encoding/decoding and Caocao length bound;
- provider-instance callback URL construction.
- legacy callback alias selection of the first active Caocao provider instance.
