# Provider Edge Routing

## CaoCao Callback Edge Routing

CaoCao order-status callbacks use a fixed callback URL configured on the CaoCao
side. When that registered URL cannot be changed quickly, route staging and
production through one public callback edge instead of asking CaoCao to switch
addresses during rollout.

New CaoCao orders must include a signed pass-through `callback_info` value:

```text
pu.rhc.v1.<routing-token>.<provider-instance-id>
```

Current routing tokens:

- `stg`: staging backend
- `prod`: production backend
- `dev`: local or non-shared development callbacks

The edge must preserve the original form body. `callback_info` participates in
CaoCao's callback signature, so the edge may read it only for routing and must
not rewrite, remove, or append form fields. The target backend still verifies
the CaoCao signature, validates that `callback_info` matches its own
environment, loads the concrete provider instance, resolves `ext_order_id`, and
checks the stored provider binding before mutating any RideHailing order state.

Plain URI-only nginx routing is insufficient for this topology because the
environment discriminator is in the POST form body. On `ec1.sz.partner-up.host`,
public ride-hailing traffic enters system nginx `1.20.1`; that nginx has no
enabled Lua/njs body-inspection module. The selected deployment shape is
therefore a backend-owned callback router behind an exact nginx location:

```nginx
location = /api/v1/service_provider/caocao/callback/order {
    client_max_body_size 16k;
    proxy_pass http://127.0.0.1:6080;
    proxy_set_header Host $host;
    include nginxconfig.io/proxy.conf;
}
```

The repo-owned implementation lives under the backend package:

- router entry: `apps/backend/src/scripts/ride-hailing/caocao-callback-router.ts`
- nginx snippet: `apps/backend/deploy/nginx/caocao-callback-router.location.conf`
- systemd template:
  `apps/backend/deploy/systemd/caocao-callback-router.service.example`

The router binds only to `127.0.0.1:6080`, accepts only
`POST /api/v1/service_provider/caocao/callback/order`, reads
`callback_info`, and forwards the original body to:

- `pu.rhc.v1.stg.*`: `https://test.api-app.partner-up.cn`
- `pu.rhc.v1.prod.*`: `https://api-app.partner-up.cn`
- missing `callback_info`: `https://api-app.partner-up.cn`
- present but invalid `callback_info`: `400 Bad Request`

The router must not forward the public edge `Host`, `Forwarded`, or
`X-Forwarded-*` headers to the selected backend origin. Those headers describe
the CaoCao-facing callback edge, not the FC backend origin, and can cause the
upstream backend to resolve request metadata against the wrong environment.

During the compatibility window, callbacks with no `callback_info` may continue
to default to production if there are already CaoCao orders created before this
contract was deployed. New staging test orders must carry `stg` so the edge can
send them to staging and production data remains isolated.
