# 4-0A — Backend Session And Identity Map

## Status

Complete. See [`authority-map.md`](./authority-map.md) for the map, facts and open decisions.

## Owned Question

Map public-user auth/session ownership across `src/auth`, auth/WeChat controllers and `domains/user`, including
anonymous recovery, authenticated upgrade/bind, token issuance/rotation and current-user resolution.

## Non-Goals

No controller, JWT, cookie, schema, repository or user-domain mutation. Admin/service/analytics behavior is recorded
only when it affects a shared public-user seam.

## Required Evidence

- source authority map with precise paths and relevant exported/public boundaries;
- controller-to-domain and domain-to-auth dependency classification;
- test seam inventory with the smallest meaningful candidate probe;
- contradiction/open-question list for synthesis.
