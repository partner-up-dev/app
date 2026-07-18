# Focused scenario test matrix

| Surface | Actor | Expected | State proof |
| --- | --- | --- | --- |
| detail/content/publish | creatorless, other USER | opaque 404 `PR_NOT_ACCESSIBLE` | root remains DRAFT/creatorless; content and slots unchanged |
| detail/content/status/publish | owner USER | detail/edit allowed; status keeps publish-guidance 400; publish follows business rules | owner/status/content assertions |
| detail, gates GET/resolve, messages list/create/read-marker, profile, orders | creatorless/other/anonymous | opaque 404 (anonymous mutation may remain outer 401) | acceptance, messages, inbox, slots unchanged |
| admin detail/content/status/messages/delete | service/admin | dedicated admin surface remains usable | DRAFT remains available until explicit delete case |
| `/api/admin/*` | ordinary USER | existing admin auth denial | no ordinary policy bypass |
| normal create conflict | authenticated owner | existing 409 conflict code | owner-bound DRAFT residue and zero slots remain |
