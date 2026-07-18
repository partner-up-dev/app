# 4-2.1 Rehearsal

- Same role/status as token and outside renewal window: reuse the token after current-state query.
- Same role/status inside renewal window: issue one matching public token.
- Anonymous-to-authenticated role change: issue authenticated token on the next public request.
- Disabled/deleted/operator-only row: return anonymous-without-user; do not retain the old UUID subject.
- UUID body points at active authenticated user: reject, because UUID is not strong identity.
- Admin routes keep the existing generic resolver and do not call this query.

## Observed Outcome

Active public bearer, disabled bearer, anonymous-to-authenticated upgrade and public-to-operator transition all
matched the rehearsal. Admin continues through `resolveRequestAuth`; it was not made to depend on public identity.
