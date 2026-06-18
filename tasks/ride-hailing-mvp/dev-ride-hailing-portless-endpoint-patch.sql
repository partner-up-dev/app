-- Temporary dev-only patch for a previously applied RideHailing ordering seed.
--
-- Use this only when dev-ride-hailing-ordering-seed.sql was already applied
-- with fixed-port provider URLs.
--
-- Effect:
-- - updates the seeded Caocao provider endpoint to the portless fake provider
-- - updates the Caocao callback base URL to the portless backend API
-- - leaves existing PR / Offer / Placement / SKU rows in place
--
-- Start fake Caocao through portless before testing quotes/create:
--   pnpm dev:portless:fake-caocao

begin;

with patched_provider as (
  update ride_hailing_provider_instances
     set status = 'ACTIVE',
         config = jsonb_set(
           jsonb_set(
             config,
             '{endpointBaseUrl}',
             to_jsonb('https://fake-caocao.localhost'::text),
             true
           ),
           '{callbackBaseUrl}',
           to_jsonb('https://api.partner-up.localhost'::text),
           true
         ),
         updated_at = now()
   where provider_type = 'CAOCAO'
     and instance_key = 'dev-ride-hailing-mvp-caocao'
   returning
     id as provider_instance_id,
     instance_key,
     status,
     config ->> 'endpointBaseUrl' as endpoint_base_url,
     config ->> 'callbackBaseUrl' as callback_base_url
)
select *
from patched_provider;

commit;
