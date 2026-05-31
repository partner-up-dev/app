# Discussion Log

## 2026-05-30

- Created Phase 5 packet from issue 231 task docs, official Caocao docs, and the
  validated `main\ride_hailing` reference implementation.
- No production implementation started. Awaiting confirmation of high-level cut
  before mutating `apps/`.
- User confirmed Caocao provider credentials must be config-backed, not
  environment-backed.
- Added local provider-call topology draft and RideHailingFulfillment internal
  topology draft for discussion.
- User confirmed `ride_hailing_provider_instances`, generic `INITIATING` order
  status, specialized RideHailingOrder creation ownership for initiating
  fulfillment, and questioned separate attempt/inbox tables plus duplicate data
  projections.
- Revised the packet toward provider topology.

## 2026-05-31

- User confirmed `rh` + compressed UUID external id, with conversion kept inside
  `CaocaoProviderAdapter`.
- User confirmed provider-instance-specific callback URLs similar to Payment.
- Added Web RideHailing Ordering Content IA draft from the uniapp reference page.
- User corrected RideHailing Ordering Content IA:
  - no Context Header;
  - no PR source / READY / create eligibility in content;
  - route is edited on map via reusable `RouteEditorOnMap`;
  - departure, riders, and contact share one row;
  - vehicle options are cards;
  - Price Detail and Bottom Action Bar are not Ordering Content.
- User corrected row labels:
  - Riders is `同乘人` and opens `BottomDrawer(List(UserBriefRow))`;
  - Contact is `联系方式` and opens `BottomDrawer(PhoneEditor)`.
- User instructed to stop using a monofile task packet. Split this directory into
  focused packet files and reduced `00-task-packet.md` to an index.
- Added `60-implementation-plan.md` with ordered implementation slices and exit
  criteria.
- User corrected the implementation plan: RideHailing-specific order facts must
  not be added directly to base `TradeOrder`; use base order + typed
  RideHailingOrder instead. Updated topology and implementation plan.
- User clarified that migrating Rental fields out of base `trade_orders` is a
  required RideHailing prerequisite. Added
  `15-base-typed-order-refactor.md` and made this the first implementation
  slice after final handshake.
- Implemented Slice 1:
  - added `rental_orders` typed order table/entity/repository;
  - added migration `0073_rental_typed_order.sql`;
  - removed Rental facts from base `trade_orders` entity/model;
  - changed Rental create/detail/termination/admin workspace paths to compose
    base order + typed Rental facts;
  - added focused persistence scenario for base+typed write and rollback;
  - verified targeted backend and system Rental paths.
- Implemented Slice 2:
  - added `ride_hailing_provider_instances` table/entity/repository;
  - added config-file driven RideHailing provider registration;
  - added `RideHailingProviderPort`, provider registry, and
    `CaocaoProviderAdapter`;
  - kept Caocao credentials in provider config rather than environment
    variables;
  - added provider-instance-specific Caocao order-status callback route
    skeleton;
  - added unit tests for config validation, signing, callback verification, and
    external id conversion.
- Added historical Caocao callback alias
  `/api/v1/service_provider/caocao/callback/order`; it resolves the first active
  Caocao provider instance by stable ordering and reuses the same callback
  verification path as the formal provider-instance route.
