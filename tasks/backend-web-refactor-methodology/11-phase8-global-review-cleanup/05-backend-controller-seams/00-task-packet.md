# `8-4` — Backend Controller / Application Seams

## Status

**Complete on 2026-07-23.** Sir authorized continuous execution through
`8-5`; source, review and proportional proof are closed.

## Execution Checkpoint

- Admin POI now exposes stable operator snapshots and commands; its controller
  no longer reads a repository.
- Auth authenticates operator credentials through a User-owned identity query;
  token issuance remains Auth-owned.
- PR controller/shared paths now use PR/User/Trade semantic queries and
  commands. Redundant preflights are removed only where owner-boundary error
  priority is protected by focused tests.
- Notification now owns subscription projections, mutations and side-effect
  ordering. A narrow injected reconciliation Port keeps Notification free of
  static and dynamic PR imports.
- User now owns OAuth identity completion, active WeChat binding state,
  Official Account follow status and missing-profile persistence.
- WeChat controller integration and its protocol/scenario proof are complete.
  The only remaining Backend SCC is the previously inventoried Commerce SCC
  assigned to `8-5`.

## Objective

Remove the seven historical controller-to-repository edges through
behavior-specific domain commands/queries. Do not introduce a generic service
layer or turn Admin into the policy owner.

## Internal Order

1. Admin POI: one operator command/query surface.
2. Auth: public identity/session query surface.
3. PR controller/shared: PR-owned identity, read and Trade attachment
   orchestration.
4. WeChat, split by vertical behavior:
   OAuth/session, JSSDK, subscription preference/credit and Official Account
   integration.

WeChat is last because its 1,601-line protocol surface has the largest
behavioral blast radius. The slice still has one outcome and one exit gate;
each vertical is a separate edit/proof batch inside this folder.

## Resolved Change Map

### POI and Auth

- POI owns stable Admin snapshots plus list/create/update/review operations;
  the controller no longer maps or infers a Drizzle row.
- User owns operator-credential authentication and returns a stable operator
  identity. JWT issuance remains in Auth and never receives `pinHash` or a
  persistence row.

### PR and Trade

- Remove controller-only PR preflight reads where the called PR command/query
  already performs the same access/current-state check at the owner boundary.
- Preserve `GET /api/pr/:id/orders` in this behavior-preserving slice. PR owns
  the actor-checked attachment context and Trade owns the filtered order
  summary query; the controller composes the two stable projections.
- Endpoint deletion based on reference proof is an `8-6` residue decision, not
  an incidental way to satisfy the controller rule.
- PR shared helpers ask User for active WeChat identity and current public
  identity; Auth issues tokens from the stable identity.

### WeChat Notification and User Verticals

- Notification owns subscription snapshots and the three semantic mutations:
  add/clear one channel credit, exact legacy confirmation-reminder enablement,
  and PR-message subscription conversion. Side-effect cancellation/reconcile
  order moves with the command.
- User owns active binding/follow-status queries, OAuth identity completion and
  best-effort missing-profile fill. The controller continues to own provider
  protocol, signed cookies, redirects, headers and response serialization.
- No public Repository-shaped Port or generic service layer is introduced.

## Preflight Simulation

- Admin login preserves the indistinguishable 401 for absent user, wrong role
  and wrong credential and does not add a new status policy.
- Removing PR preflight may alter error priority unless each invoked owner
  already checks draft opacity/access; focused draft scenarios gate every
  affected handler before the preflight is removed.
- Notification credit transitions preserve exact `0 -> positive` rescan,
  clear cancellation and legacy `enabled=true => remaining=1` semantics.
- WeChat OAuth keeps normalized non-empty OpenID before lookup, existing
  identity precedence, candidate order, create-race readback, cookie cleanup,
  single-use handoff and direct JSON compatibility. Owner APIs return stable
  authenticated identities, never `User` rows.

## Frozen Invariants

- controllers continue to own authentication context, Zod validation, cookies,
  headers, redirects and Problem Details mapping;
- domain owners own business decisions and persistence;
- OAuth handoff/direct-callback compatibility remains intact;
- subscription preference/credit semantics stay Notification-channel-owned;
- API paths, status codes and response shapes do not change.

## Exit

- no controller imports a repository;
- no replacement facade simply mirrors repository methods;
- focused Auth/PR/POI/WeChat proof and architecture fitness pass; and
- controller LOC reduction is reported only as a consequence, never the goal.
